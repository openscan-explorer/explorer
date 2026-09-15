import { expect, test } from "../../../fixtures/test";
import { mockZcashRpc, ZCASH } from "../../../fixtures/zcash";

/**
 * Hermetic Zcash network dashboard. RPC traffic to the built-in Tatum gateways is served
 * from mainnet block 3,483,400, so the page renders without a live node or rate limits.
 */
test.describe("Zcash dashboard", () => {
  test("renders chain stats, value pools, latest blocks and transactions", async ({ page }) => {
    await mockZcashRpc(page);

    await page.goto(`/#/${ZCASH.networkSlug}`);

    await expect(page.locator(".network-title-name")).toHaveText("ZCASH MAINNET");

    const stats = page.locator(".dashboard-stats-row");
    await expect(stats).toContainText("#3,483,400");
    await expect(stats).toContainText(`${ZCASH.mempoolSize} txs`);
    await expect(stats).toContainText("% shielded");

    const pools = page.getByTestId("zcash-value-pools");
    for (const name of ["Transparent", "Sprout", "Sapling", "Orchard", "Lockbox", "Ironwood"]) {
      await expect(pools).toContainText(name);
    }

    const blocks = page.getByTestId("zcash-blocks-table");
    await expect(blocks).toContainText("#3,483,400");
    await expect(blocks).toContainText("#3,483,396");

    const transactions = page.getByTestId("zcash-transactions-table");
    await expect(transactions).toContainText("Coinbase");
    await expect(transactions).toContainText("Fully shielded");
    await expect(transactions).toContainText("Shielding");

    await expect(page.locator(".network-block-number")).toHaveText("#3,483,400");
  });

  test("requests blocks by height string and never calls getblockhash", async ({ page }) => {
    const calls = await mockZcashRpc(page);

    await page.goto(`/#/${ZCASH.networkSlug}`);
    await expect(page.getByTestId("zcash-blocks-table")).toContainText("#3,483,396");

    const getblockCalls = calls.filter((call) => call.method === "getblock");
    expect(getblockCalls.length).toBeGreaterThanOrEqual(5);
    for (const call of getblockCalls) {
      expect(typeof call.params[0]).toBe("string");
    }
    expect(calls.map((call) => call.method)).not.toContain("getblockhash");
  });
});
