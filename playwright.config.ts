import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright runs against a running dev stack.
 * Start API + web first: `pnpm dev:all`, then `pnpm test:e2e`.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidTimeouts: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 14"] } },
  { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: process.env.E2E_NO_WEBSERVER
    ? undefined
    : {
        command: "pnpm dev:all",
        url: "http://localhost:3000",
        timeout: 120_000,
        reuseExistingServer: true,
      },
})
