import type { Page } from "@playwright/test";
import {
  COINBASE_TX,
  IRONWOOD_ONLY_TX,
  SAPLING_IRONWOOD_TX,
  SHIELDING_TX,
} from "../../../../src/services/adapters/ZcashAdapter/fixtures";
import { expect, test } from "../../../fixtures/test";
import {
  type RecordedRpcCall,
  mockZcashRpc,
  ZCASH,
  ZCASH_RPC_PATTERN,
} from "../../../fixtures/zcash";

/**
 * Hermetic Zcash transactions list and detail pages, served from mainnet block 3,483,400.
 */
const txUrl = (txid: string | undefined) => `/#/${ZCASH.networkSlug}/tx/${txid}`;

const inputLookups = (calls: RecordedRpcCall[], txid: string | undefined) =>
  calls.filter((call) => call.method === "getrawtransaction" && call.params[0] !== txid);

// Spent by the mocked transparent transaction, so the mock serves it for input lookups
const PREVIOUS_TXID = "a1".repeat(32);
const SPROUT_TXID = "5".repeat(64);
const DESHIELDING_TXID = "d".repeat(64);
const MISSING_TXID = "e".repeat(64);

// Sprout-era shielding: one transparent input moves into the Sprout pool through a JoinSplit
const SPROUT_TX = {
  txid: SPROUT_TXID,
  version: 2,
  size: 1_802,
  locktime: 0,
  height: 300_000,
  confirmations: 3_183_401,
  blockhash: "1".repeat(64),
  vin: [{ txid: PREVIOUS_TXID, vout: 0, sequence: 4294967295 }],
  vout: [],
  vjoinsplit: [{ vpub_old: 0.0002, vpub_new: 0, vpub_oldZat: 20_000, vpub_newZat: 0 }],
};

// Orchard to transparent: no transparent inputs, value leaves the pool
const DESHIELDING_TX = {
  txid: DESHIELDING_TXID,
  version: 5,
  size: 9_165,
  locktime: 0,
  height: ZCASH.tipHeight,
  confirmations: 1,
  blockhash: "2".repeat(64),
  vin: [],
  vout: [
    {
      value: 0.25,
      valueZat: 25_000_000,
      n: 0,
      scriptPubKey: { type: "pubkeyhash", addresses: ["t1KAuVfS2r2hc7RwSh6GTuyfqCGMFEpwkZ2"] },
    },
  ],
  orchard: { actions: [{}, {}], valueBalance: 0.2501, valueBalanceZat: 25_010_000 },
};

/**
 * Answer getrawtransaction for one txid from the test, per endpoint URL
 */
async function serveTransaction(
  page: Page,
  txid: string,
  respond: (url: string) => { result: unknown } | { error: string } | { status: number },
  options: { delayMs?: number } = {},
) {
  await page.route(ZCASH_RPC_PATTERN, async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    if (body.method !== "getrawtransaction" || body.params?.[0] !== txid) {
      await route.fallback();
      return;
    }
    if (options.delayMs) await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    const response = respond(route.request().url());
    if ("status" in response) {
      await route.fulfill({ status: response.status, body: "" });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        "error" in response
          ? { jsonrpc: "2.0", id: body.id, error: { code: -5, message: response.error } }
          : { jsonrpc: "2.0", id: body.id, result: response.result },
      ),
    });
  });
}

test.describe("Zcash transactions", () => {
  test("renders a fully shielded transaction without empty transparent columns", async ({
    page,
  }) => {
    await mockZcashRpc(page);

    await page.goto(txUrl(IRONWOOD_ONLY_TX.txid));

    const shielded = page.getByTestId("zcash-shielded-bundles");
    await expect(shielded).toContainText("Fully shielded transaction");
    await expect(shielded).toContainText("2 actions");
    await expect(shielded).toContainText("0.00010000 ZEC left the pool");
    await expect(page.locator(".tx-row").filter({ hasText: "Fee:" })).toContainText(
      "0.00010000 ZEC",
    );
    await expect(page.locator(".btc-io-columns")).toHaveCount(0);
  });

  test("derives the fee from Sapling and Ironwood value balances", async ({ page }) => {
    await mockZcashRpc(page);

    await page.goto(txUrl(SAPLING_IRONWOOD_TX.txid));

    await expect(page.locator(".tx-row").filter({ hasText: "Fee:" })).toContainText(
      "0.00020000 ZEC",
    );
    const shielded = page.getByTestId("zcash-shielded-bundles");
    await expect(shielded).toContainText("0 spends · 2 outputs");
    await expect(shielded).toContainText("0.03000000 ZEC entered the pool");
    await expect(shielded).toContainText("0.03020000 ZEC left the pool");
  });

  test("looks up transparent input values only when asked", async ({ page }) => {
    const calls = await mockZcashRpc(page);

    await page.goto(txUrl(ZCASH.transparentTxid));

    const feeRow = page.locator(".tx-row").filter({ hasText: "Fee:" });
    const lookUp = feeRow.getByRole("button", { name: "Look up input values" });
    await expect(lookUp).toBeVisible();
    // A transparent transaction's type badge isn't repeated as a pool chip
    await expect(page.locator(".zec-kind-row .zec-pool-chip")).toHaveCount(0);
    expect(inputLookups(calls, ZCASH.transparentTxid)).toHaveLength(0);

    await lookUp.click();

    await expect(feeRow).toContainText("0.00010000 ZEC");
    expect(inputLookups(calls, ZCASH.transparentTxid)).toHaveLength(2);
    await expect(page.locator(".btc-io-columns")).toContainText("0.00030000 ZEC");
  });

  test("doesn't offer an input lookup the cap can't complete", async ({ page }) => {
    const calls = await mockZcashRpc(page);

    await page.goto(txUrl(SHIELDING_TX.txid));

    const feeRow = page.locator(".tx-row").filter({ hasText: "Fee:" });
    await expect(feeRow).toContainText(
      "Unavailable: the inputs spend 15 previous transactions, more than the 10",
    );
    await expect(feeRow.getByRole("button", { name: "Look up input values" })).toHaveCount(0);
    await expect(page.getByTestId("zcash-shielded-bundles")).toContainText(
      "18.77663138 ZEC entered the pool",
    );
    expect(inputLookups(calls, SHIELDING_TX.txid)).toHaveLength(0);
  });

  test("shows a coinbase transaction without a fee", async ({ page }) => {
    await mockZcashRpc(page);

    await page.goto(txUrl(COINBASE_TX.txid));

    await expect(page.locator(".zec-kind-row")).toContainText("Coinbase");
    await expect(page.locator(".tx-row").filter({ hasText: "Fee:" })).toHaveCount(0);
    await expect(page.locator(".btc-io-columns")).toContainText(
      "t1SqwRAAdSig6dE4EBPLonAait219VmkUjP",
    );
  });

  test("renders a Sprout JoinSplit and resolves its fee from the spent output", async ({
    page,
  }) => {
    await mockZcashRpc(page);
    await serveTransaction(page, SPROUT_TXID, () => ({ result: SPROUT_TX }));

    await page.goto(txUrl(SPROUT_TXID));

    await expect(page.locator(".zec-kind-row")).toContainText("Shielding");
    await expect(page.locator(".zec-kind-row")).toContainText("Sprout");
    await expect(page.getByTestId("zcash-shielded-bundles")).toContainText("1 JoinSplit");
    const feeRow = page.locator(".tx-row").filter({ hasText: "Fee:" });
    await expect(feeRow).toContainText("Needs input values from 1 previous transaction");

    await feeRow.getByRole("button", { name: "Look up input values" }).click();

    // The previous transaction's output 0 holds 0.0003 ZEC; 0.0002 ZEC entered Sprout
    await expect(feeRow).toContainText("0.00010000 ZEC");
  });

  test("renders an Orchard deshielding transaction with no transparent inputs", async ({
    page,
  }) => {
    await mockZcashRpc(page);
    await serveTransaction(page, DESHIELDING_TXID, () => ({ result: DESHIELDING_TX }));

    await page.goto(txUrl(DESHIELDING_TXID));

    await expect(page.locator(".zec-kind-row")).toContainText("Deshielding");
    await expect(page.locator(".btc-io-columns")).toContainText("None: funded from shielded pools");
    await expect(page.locator(".tx-row").filter({ hasText: "Fee:" })).toContainText(
      "0.00010000 ZEC",
    );
  });

  test("reports a definitive answer without waiting on a rate-limited endpoint", async ({
    page,
  }) => {
    await mockZcashRpc(page);
    await serveTransaction(page, MISSING_TXID, (url) =>
      url.includes("-zebrad")
        ? { error: "No such mempool or main chain transaction" }
        : { status: 429 },
    );

    await page.goto(txUrl(MISSING_TXID));

    // Well within the first 15s rate-limit backoff
    await expect(page.locator(".text-error")).toContainText(
      "No such mempool or main chain transaction",
      { timeout: 10_000 },
    );
  });

  test("keeps the page on the new transaction when a lookup finishes late", async ({ page }) => {
    await mockZcashRpc(page);
    const firstInput = "a1".repeat(32);
    const secondInput = "b2".repeat(32);
    // Input lookups answer slowly, so the lookup is still running when the user moves on
    await page.route(ZCASH_RPC_PATTERN, async (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}");
      if (body.method === "getrawtransaction" && body.params?.[0] === firstInput) {
        await new Promise((resolve) => setTimeout(resolve, 1_500));
      }
      await route.fallback();
    });
    const isLookupOf = (txid: string) => (response: { request(): { postData(): string | null } }) =>
      (response.request().postData() ?? "").includes(txid);

    await page.goto(txUrl(ZCASH.transparentTxid));
    const feeRow = page.locator(".tx-row").filter({ hasText: "Fee:" });
    const lookupAnswered = page.waitForResponse(isLookupOf(firstInput));
    await feeRow.getByRole("button", { name: "Look up input values" }).click();
    await expect(feeRow).toContainText("Looking up");

    // Follow the second input to the transaction it spends while the lookup runs
    await page.locator(`.btc-io-txref a[href$="${secondInput}"]`).click();
    await expect(page.locator(".tx-mono").first()).toContainText(secondInput);

    // Once the abandoned lookup answers and React has rendered, the page must not revert
    await lookupAnswered;
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    await expect(page.locator(".tx-mono").first()).toContainText(secondInput);
    await expect(page.locator(".tx-row").filter({ hasText: "Fee:" })).not.toContainText(
      "Looking up",
    );
  });

  test("lists the transactions of the latest block", async ({ page }) => {
    await mockZcashRpc(page);

    await page.goto(`/#/${ZCASH.networkSlug}/txs`);

    const rows = page.locator("table.dash-table tbody");
    await expect(rows.locator("tr")).toHaveCount(5);
    await expect(rows).toContainText("Coinbase");
    await expect(rows).toContainText("Fully shielded");
    await expect(rows).toContainText("Transparent");
    await expect(page.locator(".blocks-header-info")).toContainText(
      "of 5 in the latest block #3,483,400",
    );
    await expect(page.getByRole("button", { name: "↑ Newer Block" }).first()).toBeDisabled();
  });
});
