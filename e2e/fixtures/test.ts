import { test as base } from "@playwright/test";
import { buildRpcUrls } from "../helpers/rpc";

// Build RPC URLs once at import time (from env vars)
const customRpcUrls = buildRpcUrls();

/**
 * Custom test fixture that:
 * 1. Injects Infura/Alchemy RPC URLs via localStorage (if API keys are set)
 * 2. Increases timeout on retries
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
      // Inject RPC URLs into localStorage before the app initializes
      const rpcJson = JSON.stringify(customRpcUrls);
      await page.addInitScript((json) => {
        localStorage.setItem("OPENSCAN_RPC_URLS_V1", json);
      }, rpcJson);
    }
    await use(page);
  },
});

const BASE_TIMEOUT = 60000;
const TIMEOUT_INCREMENT = 20000; // 20 seconds per retry

test.beforeEach(async ({}, testInfo) => {
  const newTimeout = BASE_TIMEOUT + TIMEOUT_INCREMENT * testInfo.retry;
  testInfo.setTimeout(newTimeout);
});

export { expect } from "@playwright/test";
