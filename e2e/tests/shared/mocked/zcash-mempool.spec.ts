import { expect, test } from "../../../fixtures/test";
import { mockZcashRpc, ZCASH } from "../../../fixtures/zcash";

/**
 * Hermetic Zcash mempool page. The mocked mempool holds three pending transactions listed out
 * of fee-rate order.
 */
test.describe("Zcash mempool", () => {
  test("lists pending transactions from one verbose call, highest fee rate first", async ({
    page,
  }) => {
    const calls = await mockZcashRpc(page);

    await page.goto(`/#/${ZCASH.networkSlug}/mempool`);

    const rows = page.locator("table.dash-table tbody tr");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText("e3e3e3e3e3e3");
    await expect(rows.nth(0)).toContainText("0.00025000 ZEC");
    await expect(rows.nth(2)).toContainText("d2d2d2d2d2d2");
    await expect(page.locator(".blocks-header-info").first()).toContainText(
      "3 pending transactions",
    );

    const mempoolCalls = calls.filter((call) => call.method === "getrawmempool");
    expect(mempoolCalls.length).toBeGreaterThan(0);
    for (const call of mempoolCalls) {
      expect(call.params[0]).toBe(true);
    }
    expect(calls.map((call) => call.method)).not.toContain("getrawtransaction");
  });

  test("links a pending transaction to its detail page", async ({ page }) => {
    await mockZcashRpc(page);

    await page.goto(`/#/${ZCASH.networkSlug}/mempool`);
    await page.locator("table.dash-table tbody tr").first().getByRole("link").click();

    await expect(page).toHaveURL(new RegExp(`/${ZCASH.networkSlug}/mempool/${"e3".repeat(32)}`));
    await expect(page.getByText("Transaction ID:")).toBeVisible();
  });
});
