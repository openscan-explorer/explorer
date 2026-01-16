import { config } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

// Load environment variables from .env file for e2e tests
config();

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 6 : 3,
  workers: process.env.CI ? 2 : undefined,
  reporter: "html",
  timeout: 60000,
  expect: {
    timeout: process.env.CI ? 20000 : 10000,
  },
  use: {
    baseURL: "http://localhost:3030",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    headless: true,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // For more reliable mainnet tests, set these env vars:
  // - INFURA_E2E_API_KEY: Your Infura API key
  // - ALCHEMY_E2E_API_KEY: Your Alchemy API key
  // These are injected into localStorage by the test fixture (e2e/fixtures/test.ts)
  webServer: {
    command: "npm start",
    url: "http://localhost:3030",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
