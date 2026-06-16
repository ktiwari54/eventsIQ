import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "line" : "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Boot the built app for the test run. Locally an already-running dev server
  // is reused; in CI a fresh `next start` is launched (build runs beforehand).
  // Skipped entirely when E2E_BASE_URL points at an external deployment.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start",
        cwd: __dirname,
        url: `${BASE_URL}/login`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
