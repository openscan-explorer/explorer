import { test as base } from "@playwright/test";
import { buildRpcUrls } from "../helpers/rpc";

// Build RPC URLs once at import time (from env vars)
const customRpcUrls = buildRpcUrls();

/**
 * Custom test fixture that injects Infura/Alchemy RPC URLs via localStorage
 * when e2e secrets are present, so tests run against private endpoints
 * instead of public rate-limited ones.
 *
 * RPC keys can be set via environment variables:
 *   INFURA_API_KEY=your_key
 *   ALCHEMY_API_KEY=your_key
 *
 * If no keys are set, the app falls back to default public RPCs.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    if (customRpcUrls) {
      const rpcJson = JSON.stringify(customRpcUrls);
      await page.addInitScript((json) => {
        localStorage.setItem("OPENSCAN_RPC_URLS_V3", json);
      }, rpcJson);
    }
    await use(page);
  },
});

// Fixed 60s timeout. A retry gets an extra 30s — enough slack for a cold
// provider round-trip without masking genuine flakiness behind an unbounded
// growth schedule.
const BASE_TIMEOUT = 60_000;
const RETRY_BONUS = 30_000;

test.beforeEach(async ({}, testInfo) => {
  const budget = BASE_TIMEOUT + (testInfo.retry > 0 ? RETRY_BONUS : 0);
  testInfo.setTimeout(budget);
  if (testInfo.retry > 0) {
    // Surface retries so flakiness is visible in the CI log.
    console.warn(
      `[e2e] retry ${testInfo.retry} for "${testInfo.title}" (timeout=${budget}ms)`,
    );
  }
});

export { expect } from "@playwright/test";
