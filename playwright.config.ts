import dotenv from "dotenv";
import { defineConfig, devices } from "@playwright/test";

dotenv.config();

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  timeout: 60000,
  use: {
    baseURL: "http://localhost:3030",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      // Default project — live RPC. Does not run the mocked suite.
      testIgnore: ["**/shared/mocked/**"],
    },
    {
      // Hermetic suite: mocks RPC + worker traffic via `page.route`. Used for
      // strategy / fallover / error-path / large-tx tests that must be
      // deterministic.
      name: "mocked",
      use: { ...devices["Desktop Chrome"] },
      testMatch: ["**/shared/mocked/**/*.spec.ts"],
    },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3030",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
