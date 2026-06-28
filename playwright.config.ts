import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for I016 accessibility tests.
 *
 * Chromium is pre-installed at /opt/pw-browsers/chromium in the CI/remote
 * environment. Set PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers when running
 * locally if you do not have a Playwright-managed browser installation.
 */
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.a11y.test.ts",

  /** Allow tests to run in parallel; each test seeds its own sessionStorage. */
  fullyParallel: true,

  /** Fail the build on CI if tests are accidentally left in `.only`. */
  forbidOnly: !!process.env.CI,

  /** Retry once on CI to reduce flakiness from dev-server cold-start. */
  retries: process.env.CI ? 1 : 0,

  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: process.env.APP_BASE_URL ?? "http://localhost:3000",

    /** Capture trace on first retry to help diagnose failures. */
    trace: "on-first-retry",

    /** Use the pre-installed Chromium binary. */
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],

  /**
   * Start the Next.js dev server before running tests.
   * On CI the server is expected to already be running (reuseExistingServer: true).
   */
  webServer: {
    command: "pnpm dev",
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
