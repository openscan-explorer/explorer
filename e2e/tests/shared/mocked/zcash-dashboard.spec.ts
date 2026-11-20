import { expect, test } from "../../../fixtures/test";
import { mockZcashRpc, ZCASH, ZCASH_RPC_PATTERN } from "../../../fixtures/zcash";

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

  test("shares one getblockchaininfo call between the navbar height and the stats", async ({
    page,
  }) => {
    const calls = await mockZcashRpc(page);

    await page.goto(`/#/${ZCASH.networkSlug}`);
    await expect(page.getByTestId("zcash-blocks-table")).toContainText("#3,483,396");
    await expect(page.locator(".network-block-number")).toHaveText("#3,483,400");

    const count = (method: string) => calls.filter((call) => call.method === method).length;
    expect(count("getblockchaininfo")).toBe(1);
    expect(count("getblockcount")).toBe(0);
    // The tip with its transactions, then one summary per earlier block
    expect(count("getblock")).toBe(5);
  });

  test("shows a block that couldn't be loaded instead of leaving a gap", async ({ page }) => {
    await mockZcashRpc(page);
    const failingHeight = String(ZCASH.tipHeight - 2);
    await page.route(ZCASH_RPC_PATTERN, async (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}");
      if (body.method === "getblock" && body.params?.[0] === failingHeight) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            error: { code: -8, message: "Block not found" },
          }),
        });
        return;
      }
      await route.fallback();
    });

    await page.goto(`/#/${ZCASH.networkSlug}`);

    const blocks = page.getByTestId("zcash-blocks-table");
    await expect(blocks).toContainText("#3,483,396");
    const unavailable = blocks.getByTestId("zcash-block-unavailable");
    await expect(unavailable).toHaveCount(1);
    await expect(unavailable).toContainText("#3,483,398");
  });
});
