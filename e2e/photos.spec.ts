/**
 * Profile photo management: reorder / set primary, and admin media review surface.
 */
import { test, expect, type Page } from "@playwright/test"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import { randomUUID } from "node:crypto"
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  MEMBER_NAME,
  MEMBER_PHONE,
  cleanupAuthFixtures,
  closeAuthFixtures,
  ensureAdminUser,
  mintAccessToken,
  seedLoginMember,
} from "./helpers/auth-fixtures"

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000"

const dbRequire = createRequire(resolve(__dirname, "../packages/database/package.json"))
const postgres = dbRequire("postgres") as typeof import("postgres").default
const dotenv = dbRequire("dotenv") as typeof import("dotenv")
dotenv.config({ path: resolve(__dirname, "../.env") })

const DATABASE_URL = process.env.DATABASE_URL!
let sql: ReturnType<typeof postgres> | null = null
function db() {
  if (!sql) sql = postgres(DATABASE_URL, { max: 1, ssl: "require" as any })
  return sql!
}

test.describe.configure({ mode: "serial" })

let member: Awaited<ReturnType<typeof seedLoginMember>>
let secondPhotoId: string
let secondS3Key: string

test.beforeAll(async () => {
  await ensureAdminUser()
  member = await seedLoginMember()

  // Add a second approved photo so reorder/set-primary is exercisable.
  secondPhotoId = randomUUID()
  secondS3Key = `profiles/${member.user.id}/photos/${secondPhotoId}.jpeg`
  await db()`
    INSERT INTO profile_photos (id, profile_id, s3_key, is_primary, display_order, status)
    VALUES (${secondPhotoId}, ${member.profileId}, ${secondS3Key}, false, 1, 'approved')
  `
})

test.afterAll(async () => {
  await cleanupAuthFixtures()
  await closeAuthFixtures()
  if (sql) {
    await sql.end()
    sql = null
  }
})

async function authed(page: Page) {
  const token = mintAccessToken(member.user)
  await page.context().addCookies([
    { name: "astalakshimi.auth_token", value: token, url: BASE_URL, httpOnly: true, sameSite: "Lax" },
    { name: "astalakshimi.refresh_token", value: token, url: BASE_URL, httpOnly: true, sameSite: "Lax" },
    { name: "astalakshimi.has_profile", value: "1", url: BASE_URL, httpOnly: true, sameSite: "Lax" },
  ])
  await page.addInitScript(() => {
    localStorage.setItem("is_authenticated", "true")
  })
}

async function photoOrder(): Promise<Array<{ id: string; is_primary: boolean; display_order: number }>> {
  return db()`
    SELECT id, is_primary, display_order
    FROM profile_photos
    WHERE profile_id = ${member.profileId}
    ORDER BY display_order
  ` as Promise<Array<{ id: string; is_primary: boolean; display_order: number }>>
}

test.describe("edit profile photos", () => {
  test("set primary via visible control and reflect order in DB + /home", async ({ page }) => {
    test.setTimeout(90_000)
    await authed(page)

    await page.goto("/profile/edit#photos", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("tab", { name: /^Photos/i })).toBeVisible({ timeout: 30_000 })
    // Hash should select the Photos tab; click as a fallback if controlled state lags.
    const photosTab = page.getByRole("tab", { name: /^Photos/i })
    if ((await photosTab.getAttribute("data-state")) !== "active") {
      await photosTab.click()
    }
    await expect(page.getByRole("heading", { name: /^Photos/i })).toBeVisible({ timeout: 15_000 })

    // Second tile should expose Set primary (always visible, not hover-only).
    const setPrimary = page.getByRole("button", { name: /set primary/i }).first()
    await expect(setPrimary).toBeVisible({ timeout: 15_000 })
    // Prefer waiting on the API ack so a 500 surfaces clearly.
    const reorderWait = page.waitForResponse(
      (r) => r.url().includes("/profiles/me/photos/order") && r.request().method() === "PUT",
      { timeout: 20_000 },
    )
    await setPrimary.click()
    const reorderRes = await reorderWait
    expect(reorderRes.ok(), `reorder failed: ${reorderRes.status()} ${await reorderRes.text()}`).toBeTruthy()

    await expect
      .poll(async () => {
        const rows = await photoOrder()
        return rows[0]?.id
      }, { timeout: 20_000 })
      .toBe(secondPhotoId)

    const after = await photoOrder()
    expect(after[0].is_primary).toBe(true)
    expect(after[0].id).toBe(secondPhotoId)
    expect(after[1].id).toBe(member.photoId)

    // Nav / home should prefer the new primary S3 key once profile cache updates.
    await page.goto("/home", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { name: /how .* appear/i })).toBeVisible({
      timeout: 30_000,
    })
    const homeImg = page.locator('main img[src*="photos"]').first()
    if (await homeImg.count()) {
      await expect(homeImg).toHaveAttribute("src", new RegExp(secondPhotoId))
    }
  })

  test("reorder API moves display_order and is_primary together", async ({ page }) => {
    test.setTimeout(60_000)
    await authed(page)

    // Ensure known order: original photo first again.
    const res = await page.request.put(`${BASE_URL}/api/proxy/profiles/me/photos/order`, {
      headers: { "Content-Type": "application/json" },
      data: { photoIds: [member.photoId, secondPhotoId] },
    })
    expect(res.ok(), await res.text()).toBeTruthy()
    const body = await res.json()
    expect(body.photos?.[0]?.id).toBe(member.photoId)
    expect(body.photos?.[0]?.isPrimary).toBe(true)

    const rows = await photoOrder()
    expect(rows.map((r) => r.id)).toEqual([member.photoId, secondPhotoId])
    expect(rows[0].is_primary).toBe(true)
  })
})

test.describe("admin photo review", () => {
  test("admin can open profile media lightbox tiles", async ({ page }) => {
    test.setTimeout(90_000)
    await page.context().clearCookies()
    await page.goto("/admin/login", { waitUntil: "networkidle" })
    await page.evaluate(() => {
      try {
        localStorage.removeItem("astalakshimi.admin.session")
        sessionStorage.removeItem("astalakshimi.admin.session")
      } catch {
        /* ignore */
      }
    })
    await page.reload({ waitUntil: "networkidle" })
    await expect(page.getByRole("heading", { name: /staff sign in/i })).toBeVisible({
      timeout: 15_000,
    })

    const email = page.getByLabel(/work email|email/i)
    const password = page.getByLabel(/^password$/i)
    await email.fill(ADMIN_EMAIL)
    await password.fill(ADMIN_PASSWORD)

    const loginResponse = page.waitForResponse(
      (res) => res.url().includes("/api/auth/admin-login") && res.request().method() === "POST",
      { timeout: 30_000 },
    )
    await page.getByRole("button", { name: /^sign in$/i }).click()
    const loginRes = await loginResponse
    expect(loginRes.ok(), `admin-login HTTP ${loginRes.status()}`).toBeTruthy()
    await expect(page).toHaveURL(/\/admin(?!\/login)/, { timeout: 30_000 })

    await page.goto(`/admin/profiles/${member.profileId}`, { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { name: MEMBER_NAME })).toBeVisible({ timeout: 30_000 })

    // Profile photos section should render enlargeable tiles.
    const enlarge = page.getByRole("button", { name: /enlarge/i }).first()
    await expect(enlarge).toBeVisible({ timeout: 20_000 })
    await enlarge.click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 })
  })
})
