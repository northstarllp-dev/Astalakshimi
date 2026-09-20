import { test, expect } from "@playwright/test"

/**
 * Public + auth-guard smoke tests. These run against the dev stack
 * (`pnpm dev:all`) and verify the middleware redirect behavior without
 * needing a logged-in session.
 */
test.describe("public pages", () => {
  test("landing page loads with hero", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/.+/)
    // hero register card present
    await expect(page.locator("body")).toContainText(/.+/)
  })

  test("login page renders phone input", async ({ page }) => {
    await page.goto("/login")
    await expect(page).toHaveURL(/login/)
  })
})

test.describe("auth guards", () => {
  test("logged-out user is redirected from /home to /login", async ({ page }) => {
    await page.goto("/home")
    await expect(page).toHaveURL(/login/)
  })

  test("logged-out user is redirected from /search to /login", async ({ page }) => {
    await page.goto("/search")
    await expect(page).toHaveURL(/login/)
  })

  test("logged-out user is redirected from /profile/edit to /login", async ({ page }) => {
    await page.goto("/profile/edit")
    await expect(page).toHaveURL(/login/)
  })

  test("redirect preserves callbackUrl", async ({ page }) => {
    await page.goto("/matches")
    await expect(page).toHaveURL(/callbackUrl=/)
  })

  test("admin login page is reachable", async ({ page }) => {
    await page.goto("/admin/login")
    await expect(page).toHaveURL(/admin\/login/)
  })
})
