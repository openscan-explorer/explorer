import { test } from "../../fixtures/test";
import { AVALANCHE } from "../../fixtures/networks";
import { expectStillMounted } from "../../fixtures/assertions";

/**
 * Avalanche C-Chain (43114) smoke. Avalanche is registered as a production
 * network in `src/config/networks.json` and routed to the vanilla
 * `EVMAdapter` in `adaptersFactory.ts`, but had zero e2e coverage — a silent
 * regression here would only surface in bug reports.
 *
 * This smoke only asserts the page mounts. Network-specific field
 * assertions (if any L2-like specialization is added later) belong in their
 * own spec.
 */

test.describe("Avalanche C-Chain smoke", () => {
  test("block page renders", async ({ page }) => {
    await page.goto(`/#/${AVALANCHE.urlPath}/block/${AVALANCHE.canonicalBlock}`);
    await expectStillMounted(page);
  });

  test("address page renders for canonical WAVAX contract", async ({ page }) => {
    await page.goto(`/#/${AVALANCHE.urlPath}/address/${AVALANCHE.canonicalAddress}`);
    await expectStillMounted(page);
  });

  test("zero address page renders", async ({ page }) => {
    await page.goto(
      `/#/${AVALANCHE.urlPath}/address/0x0000000000000000000000000000000000000000`,
    );
    await expectStillMounted(page);
  });

  test("placeholder tx hash renders without crashing", async ({ page }) => {
    // Until a canonical Avalanche tx is pinned in a fixture, assert only
    // the not-found path handles cleanly.
    await page.goto(`/#/${AVALANCHE.urlPath}/tx/${AVALANCHE.canonicalTxHash}`);
    await expectStillMounted(page);
  });
});
