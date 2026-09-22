import { test, expect } from "@playwright/test"

/**
 * Smoke: onboarding portal-access helpers are wired into the app build.
 * Full register→verify→interact flow needs seeded OTP + admin; covered by unit tests.
 */
test.describe("onboarding verification gate (smoke)", () => {
  test("admin login page loads", async ({ page }) => {
    await page.goto("/admin/login")
    await expect(page.getByRole("heading", { name: /staff sign in/i })).toBeVisible({ timeout: 15000 })
  })

  test("member login page loads", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByRole("heading", { name: /sign in|welcome|login/i }).first()).toBeVisible({
      timeout: 15000,
    })
  })
})
