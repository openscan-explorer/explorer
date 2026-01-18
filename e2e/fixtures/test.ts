import { test as base } from "@playwright/test";

const BASE_TIMEOUT = 60000;
const TIMEOUT_INCREMENT = 20000; // 20 seconds per retry
const RPC_STORAGE_KEY = "OPENSCAN_RPC_URLS_V1";

/**
 * Build e2e RPC endpoints for mainnet from environment variables.
 * Returns array of RPC URLs to prepend to default endpoints.
 */
function getE2eRpcEndpoints(): string[] {
  const endpoints: string[] = [];

  const infuraKey = process.env.INFURA_E2E_API_KEY;
  const alchemyKey = process.env.ALCHEMY_E2E_API_KEY;

  if (alchemyKey && alchemyKey.trim() !== "") {
    endpoints.push(`https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`);
  }

  if (infuraKey && infuraKey.trim() !== "") {
    endpoints.push(`https://mainnet.infura.io/v3/${infuraKey}`);
  }

  return endpoints;
}

/**
 * Custom test fixture that:
 * 1. Increases timeout on retries
 * 2. Injects e2e RPC endpoints via localStorage if API keys are configured
 */
export const test = base.extend({});

test.beforeEach(async ({ page }, testInfo) => {
  // Increase timeout on retries
  const newTimeout = BASE_TIMEOUT + TIMEOUT_INCREMENT * testInfo.retry;
  testInfo.setTimeout(newTimeout);

  // Inject e2e RPC endpoints if API keys are configured
  const e2eEndpoints = getE2eRpcEndpoints();
  if (e2eEndpoints.length > 0) {
    // Add init script to set localStorage before the page loads
    await page.addInitScript(
      ({ storageKey, endpoints }) => {
        // Get existing RPC config or create new one
        const existing = localStorage.getItem(storageKey);
        let rpcConfig: Record<string, string[]> = {};

        if (existing) {
          try {
            rpcConfig = JSON.parse(existing);
          } catch {
            rpcConfig = {};
          }
        }

        // Prepend e2e endpoints to mainnet (chainId 1)
        const existingMainnet = rpcConfig["1"] || [];
        rpcConfig["1"] = [...endpoints, ...existingMainnet];

        localStorage.setItem(storageKey, JSON.stringify(rpcConfig));
      },
      { storageKey: RPC_STORAGE_KEY, endpoints: e2eEndpoints },
    );
  }
});

export { expect } from "@playwright/test";
