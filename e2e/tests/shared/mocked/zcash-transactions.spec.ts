import {
  IRONWOOD_ONLY_TX,
  SAPLING_IRONWOOD_TX,
  SHIELDING_TX,
} from "../../../../src/services/adapters/ZcashAdapter/fixtures";
import { expect, test } from "../../../fixtures/test";
import { type RecordedRpcCall, mockZcashRpc, ZCASH } from "../../../fixtures/zcash";

/**
 * Hermetic Zcash transactions list and detail pages, served from mainnet block 3,483,400.
 */
const txUrl = (txid: string | undefined) => `/#/${ZCASH.networkSlug}/tx/${txid}`;

const inputLookups = (calls: RecordedRpcCall[], txid: string | undefined) =>
  calls.filter((call) => call.method === "getrawtransaction" && call.params[0] !== txid);

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

  test("caps input lookups at ten previous transactions", async ({ page }) => {
    const calls = await mockZcashRpc(page);

    await page.goto(txUrl(SHIELDING_TX.txid));

    const feeRow = page.locator(".tx-row").filter({ hasText: "Fee:" });
    await expect(feeRow).toContainText("Looks up the first 10 of 15 previous transactions");
    await expect(page.getByTestId("zcash-shielded-bundles")).toContainText(
      "18.77663138 ZEC entered the pool",
    );

    await feeRow.getByRole("button", { name: "Look up input values" }).click();

    await expect(feeRow).toContainText("Unavailable: found 10 of 15 previous transactions");
    expect(inputLookups(calls, SHIELDING_TX.txid)).toHaveLength(10);
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
