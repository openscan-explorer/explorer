import type { Page } from "@playwright/test";
import { expect, test } from "../../../fixtures/test";
import { mockZcashRpc, ZCASH, ZCASH_RPC_PATTERN } from "../../../fixtures/zcash";

const ENTRY = {
  size: 245,
  fee: 0.0001,
  modifiedfee: 0.0001,
  time: 1789416139,
  height: ZCASH.tipHeight,
  descendantcount: 1,
  descendantsize: 245,
  descendantfees: 10_000,
  depends: [],
};

/**
 * Serve getrawmempool from the test, optionally per endpoint URL and with a delay
 */
async function serveMempool(
  page: Page,
  respond: (url: string) => { entries: Record<string, typeof ENTRY>; delayMs?: number } | null,
) {
  await page.route(ZCASH_RPC_PATTERN, async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    const response = body.method === "getrawmempool" ? respond(route.request().url()) : null;
    if (!response) {
      await route.fallback();
      return;
    }
    if (response.delayMs) await new Promise((resolve) => setTimeout(resolve, response.delayMs));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ jsonrpc: "2.0", id: body.id, result: response.entries }),
    });
  });
}

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

  test("uses the singular for a single pending transaction", async ({ page }) => {
    await mockZcashRpc(page);
    await serveMempool(page, () => ({ entries: { ["f1".repeat(32)]: ENTRY } }));

    await page.goto(`/#/${ZCASH.networkSlug}/mempool`);

    await expect(page.locator(".blocks-header-info").first()).toContainText(
      "1 pending transaction (",
    );
  });

  test("doesn't let a slow mainnet response fill the testnet mempool", async ({ page }) => {
    await mockZcashRpc(page);
    const mainnetEntries = Object.fromEntries(
      ["a", "b", "c"].map((c) => [c.repeat(64), ENTRY] as const),
    );
    await serveMempool(page, (url) =>
      url.includes("mainnet")
        ? { entries: mainnetEntries, delayMs: 2_000 }
        : { entries: { ["f1".repeat(32)]: ENTRY } },
    );
    const isMainnetMempool = (request: { url(): string; postData(): string | null }) =>
      request.url().includes("mainnet") && (request.postData() ?? "").includes("getrawmempool");
    const mainnetRequested = page.waitForRequest(isMainnetMempool);
    const mainnetAnswered = page.waitForResponse((response) =>
      isMainnetMempool(response.request()),
    );

    await page.goto(`/#/${ZCASH.networkSlug}/mempool`);
    // Switch while the mainnet request is still in flight
    await mainnetRequested;
    await page.goto("/#/tzec/mempool");
    const summary = page.locator(".blocks-header-info").first();
    await expect(summary).toContainText("1 pending transaction");

    await mainnetAnswered;
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    await expect(summary).toContainText("1 pending transaction");
    await expect(page.locator("table.dash-table tbody tr")).toHaveCount(1);
  });
});
