import { test } from "../../fixtures/test";
import { ARBITRUM } from "../../fixtures/arbitrum";
import { OPTIMISM } from "../../fixtures/optimism";
import { BASE } from "../../fixtures/base";
import {
  expectArbitrumBlockFields,
  expectArbitrumTxL1Fields,
  expectOpStackTxL1Fee,
} from "../../fixtures/assertionsL2";
/**
 * L2-specific field assertions.
 *
 * The whole point of having `ArbitrumAdapter`, `OptimismAdapter`, and
 * `BaseAdapter` is to surface fields the vanilla `EVMAdapter` does not:
 *
 *   - Arbitrum tx receipt → `l1BlockNumber` (+ `gasUsedForL1`)
 *   - Arbitrum block      → `sendCount`, `sendRoot` (L2→L1 messages)
 *   - OP Stack tx         → `l1Fee`, `l1GasPrice`, `l1GasUsed`
 *                           (the fee users pay for L1 data posting)
 *
 * The research review flagged these as completely unasserted in the existing
 * per-network specs — an adapter regression that silently dropped any of
 * them would have been invisible. Each test below navigates to a pinned,
 * post-upgrade transaction or block drawn from the per-network fixture
 * tables and asserts the label renders.
 *
 * Tx hashes / block numbers re-use what's already curated in
 * `e2e/fixtures/{arbitrum,optimism,base}.ts` (stable, post-upgrade data
 * pre-committed to the repo).
 */

// First fixture tx for each chain; both Arbitrum tx fixtures are post-Nitro
// so either exposes `l1BlockNumber` in the receipt. The first Optimism/Base
// tx already carries `l1Fee` in the fixture payload (see the `l1Fee` key in
// `e2e/fixtures/optimism.ts`), so we know the receipt has the OP-stack fee
// breakdown populated upstream.
const ARB_TX_HASH = Object.keys(ARBITRUM.transactions)[0];
const OP_TX_HASH = Object.keys(OPTIMISM.transactions)[0];
const BASE_TX_HASH = Object.keys(BASE.transactions)[0];

// Recent, high-activity Arbitrum block likely to contain L2→L1 messages.
// Drawn from existing Arbitrum block fixture keys.
const ARB_BLOCK = Object.keys(ARBITRUM.blocks)[0];

// The Arbitrum L1-field tests require an RPC that returns Arbitrum's
// extended tx receipt / block shape (`l1BlockNumber`, `sendCount`,
// `sendRoot`). Public RPCs and some provider variants strip these
// fields; local runs against `buildRpcUrls`-seeded Alchemy/Infura may
// or may not expose them depending on the endpoint. Mark as `fixme`
// until the dedicated Arbitrum RPC is confirmed in CI secrets and a
// conditional skip tied to that env var is wired up.
test.describe("Arbitrum L2 fields — transaction", () => {
  test.fixme("post-Nitro tx exposes L1 Block Number", async ({ page }) => {
    test.skip(!ARB_TX_HASH, "no Arbitrum tx fixture available");
    await page.goto(`/#/42161/tx/${ARB_TX_HASH}`);
    await expectArbitrumTxL1Fields(page);
  });
});

test.describe("Arbitrum L2 fields — block", () => {
  test.fixme("block exposes Send Count and Send Root", async ({ page }) => {
    test.skip(!ARB_BLOCK, "no Arbitrum block fixture available");
    await page.goto(`/#/42161/block/${ARB_BLOCK}`);
    await expectArbitrumBlockFields(page);
  });
});

test.describe("Optimism L2 fields — transaction", () => {
  test("post-Bedrock tx exposes L1 Fee breakdown", async ({ page }) => {
    test.skip(!OP_TX_HASH, "no Optimism tx fixture available");
    await page.goto(`/#/10/tx/${OP_TX_HASH}`);
await expectOpStackTxL1Fee(page);
  });
});

test.describe("Base L2 fields — transaction", () => {
  test("post-Bedrock tx exposes L1 Fee breakdown", async ({ page }) => {
    test.skip(!BASE_TX_HASH, "no Base tx fixture available");
    await page.goto(`/#/8453/tx/${BASE_TX_HASH}`);
await expectOpStackTxL1Fee(page);
  });
});

/**
 * Post-Dencun blob field assertions (`blobGasUsed`, `excessBlobGas`) require
 * pinning a block that actually contains a blob-carrying tx — the BlockDisplay
 * component gates rendering on `blobGasUsed > 0`. Finding a stable, pinned
 * blob-bearing block per chain is a research task; deferring to phase 4.
 */
test.describe("Blob fields (EIP-4844) — TODO phase 4", () => {
  test.skip("Ethereum post-Dencun block with blobs exposes Blob Gas Used / Excess Blob Gas", async () => {});
  test.skip("Optimism post-Ecotone block with blobs exposes blob fields", async () => {});
  test.skip("Base post-Ecotone block with blobs exposes blob fields", async () => {});
});
