import { test } from "../../../fixtures/test";

/**
 * Placeholder for the RPC strategy matrix (fallback / parallel / race) and
 * the worker multi-platform failover path (Cloudflare → Vercel on 5xx / 429).
 *
 * Full implementation in phase 4 — requires:
 *   - seeding a custom RPC URL list via `OPENSCAN_RPC_URLS_V3` (two fake
 *     hostnames pointed at `page.route` handlers),
 *   - `setUserSetting(page, { rpcStrategy: … })` per test,
 *   - mock handlers for each JSON-RPC method the block/tx pages call
 *     (`eth_blockNumber`, `eth_getBlockByNumber`, `eth_gasPrice`, …),
 *   - an assertion that counts RPC calls per upstream to verify which
 *     handler won under each strategy.
 */

test.describe("RPC strategy (fallback) — TODO phase 4", () => {
  test.skip("secondary URL is used when primary returns 503", async () => {});
});

test.describe("RPC strategy (parallel) — TODO phase 4", () => {
  test.skip("both URLs are called and inconsistency UI surfaces when they disagree", async () => {});
});

test.describe("Worker failover — TODO phase 4", () => {
  test.skip("Cloudflare 503 falls over to Vercel", async () => {});
  test.skip("Cloudflare 429 with retry-after falls over to Vercel", async () => {});
});
