/**
 * Onboarding gate + submit-for-verification.
 *
 * Full camera/S3 signup is impractical in CI, so we seed a member who already
 * finished required fields (idle verification + selfie) and drive Home submit.
 * Also covers check-phone routing: brand-new numbers never burn a login OTP.
 */
import { test, expect, type Page } from "@playwright/test"
import {
  cleanupAuthFixtures,
  closeAuthFixtures,
  getVerificationStatus,
  seedReadyToSubmitMember,
} from "./helpers/auth-fixtures"

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000"

test.describe.configure({ mode: "serial" })

let ready: Awaited<ReturnType<typeof seedReadyToSubmitMember>>

test.beforeAll(async () => {
  ready = await seedReadyToSubmitMember()
})

test.afterAll(async () => {
  await cleanupAuthFixtures()
  await closeAuthFixtures()
})

async function authed(page: Page) {
  await page.context().addCookies([
    { name: "astalakshimi.auth_token", value: ready.token, url: BASE_URL, httpOnly: true, sameSite: "Lax" },
    { name: "astalakshimi.refresh_token", value: ready.token, url: BASE_URL, httpOnly: true, sameSite: "Lax" },
    { name: "astalakshimi.has_profile", value: "1", url: BASE_URL, httpOnly: true, sameSite: "Lax" },
  ])
  await page.addInitScript(() => {
    localStorage.setItem("is_authenticated", "true")
  })
}

test.describe("check-phone login routing", () => {
  test("brand-new phone goes to register without sending OTP", async ({ page }) => {
    let sendOtpHit = false
    await page.route("**/api/proxy/auth/send-otp", async (route) => {
      sendOtpHit = true
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "should not be called" }),
      })
    })

    await page.goto("/login")
    const phone = page.getByLabel(/mobile number/i)
    await expect(phone).toBeVisible({ timeout: 15_000 })
    await phone.click()
    await phone.pressSequentially("9100000098")
    await expect(phone).toHaveValue("9100000098")
    await page.getByRole("button", { name: /send otp/i }).click()
    await expect(page).toHaveURL(/register/, { timeout: 20_000 })
    expect(sendOtpHit).toBe(false)
  })
})

test.describe("submit for verification", () => {
  test("API promotes idle → pending for a complete seeded member", async ({ page }) => {
    test.setTimeout(60_000)
    await authed(page)

    const before = await getVerificationStatus(ready.profileId)
    expect(before?.status).toBe("idle")

    const res = await page.request.post(`${BASE_URL}/api/proxy/profiles/me/submit-verification`, {
      headers: { "Content-Type": "application/json" },
    })
    const body = await res.json().catch(() => ({}))
    expect(res.ok(), `submit-verification failed: ${res.status()} ${JSON.stringify(body)}`).toBeTruthy()
    expect(body.status).toBe("pending")

    const after = await getVerificationStatus(ready.profileId)
    expect(after?.status).toBe("pending")
  })

  test("Home CTA click promotes idle → pending and shows under-review banner", async ({ page }) => {
    test.setTimeout(90_000)
    // Fresh idle member so the CTA is visible.
    ready = await seedReadyToSubmitMember()
    await authed(page)

    expect((await getVerificationStatus(ready.profileId))?.status).toBe("idle")

    await page.goto("/home")
    const submitBtn = page.getByRole("button", { name: /^submit for verification$/i })
    await expect(submitBtn).toBeVisible({ timeout: 45_000 })

    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/profiles/me/submit-verification") && res.request().method() === "POST",
      { timeout: 30_000 },
    )
    await submitBtn.click()
    const res = await responsePromise
    const bodyText = await res.text()
    expect(res.ok(), `UI submit failed: ${res.status()} ${bodyText}`).toBeTruthy()

    await expect(page.getByText("Verification under review", { exact: true })).toBeVisible({
      timeout: 30_000,
    })
    expect((await getVerificationStatus(ready.profileId))?.status).toBe("pending")
  })
})
