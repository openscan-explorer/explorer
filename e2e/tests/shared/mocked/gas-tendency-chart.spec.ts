import { test } from "../../../fixtures/test";

/**
 * Hermetic regression test for the Gas Tendency chart on the Network and
 * Blocks pages. The chart fetches `eth_feeHistory(0x32, "latest")` via
 * `useFeeHistory` and renders an SVG sparkline gated on
 * `dataService.isEVM()`.
 *
 * Placeholder in phase 1 — the hermetic version requires:
 *   1. Mocking `eth_blockNumber`, `eth_getBlockByNumber`, `eth_gasPrice`,
 *      `eth_feeHistory`, and `eth_getTransactionByHash` for the full page
 *      load, and asserting `eth_feeHistory` is called with `0x32` (50).
 *   2. Asserting `[data-testid="gas-tendency-chart"]` is visible after the
 *      mocked response resolves, on both `/<chainId>` and `/<chainId>/blocks`.
 *   3. Asserting the chart is NOT rendered on Bitcoin / Solana routes.
 *   4. Hovering an SVG point and asserting the tooltip surfaces the
 *      expected block number, base fee (gwei), and gas-used %.
 *
 * Phase 4 wires these together using the `rpcMock` helpers shared with
 * the other hermetic specs in this folder.
 */

test.describe("Gas Tendency chart — TODO phase 4", () => {
  test.skip("renders on the Network page with mocked eth_feeHistory", async () => {});
  test.skip("renders on the Blocks page with mocked eth_feeHistory", async () => {});
  test.skip("is absent on Bitcoin and Solana routes", async () => {});
  test.skip("hover tooltip shows block number, base fee, and gas used", async () => {});
});
