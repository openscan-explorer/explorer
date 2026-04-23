import { test, expect } from "../../../fixtures/test";

/**
 * Placeholder for the RPC strategy matrix (fallback / parallel / race) and
 * the worker multi-platform failover path (Cloudflare → Vercel on 5xx/429).
 *
 * Full implementation in Phase 4 — requires:
 *   - seeding a custom RPC URL list via `OPENSCAN_RPC_URLS_V3` (two fake
 *     hostnames pointed at `page.route` handlers)
 *   - `setUserSetting(page, { rpcStrategy: … })` per test
 *   - mock handlers for each JSON-RPC method the block/tx pages call
 *     (`eth_blockNumber`, `eth_getBlockByNumber`, `eth_gasPrice`, …)
 *   - an assertion that counts RPC calls per upstream to verify which
 *     handler won under each strategy
 */

test.describe("RPC strategy (fallback)", () => {
  test.skip("secondary URL is used when primary returns 503", async ({ page }) => {
    await page.goto("/#/1");
    expect(true).toBe(true);
  });
});

test.describe("RPC strategy (parallel)", () => {
  test.skip("both URLs are called and inconsistency UI surfaces when they disagree", async ({
    page,
  }) => {
    await page.goto("/#/1");
    expect(true).toBe(true);
  });
});

test.describe("Worker failover", () => {
  test.skip("Cloudflare 503 falls over to Vercel", async ({ page }) => {
    await page.goto("/#/1");
    expect(true).toBe(true);
  });

  test.skip("Cloudflare 429 with retry-after falls over to Vercel", async ({ page }) => {
    await page.goto("/#/1");
    expect(true).toBe(true);
  });
});
