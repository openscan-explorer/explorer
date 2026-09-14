import { expect, test } from "../../../fixtures/test";
import { mockZcashRpc, T_ADDRESS, ZCASH } from "../../../fixtures/zcash";

/**
 * Hermetic Zcash address page. By default the mocked gateway blocks Zebra's address index, as
 * Tatum does; `addressIndex: true` serves it like a self-hosted node.
 */
const SAPLING_ADDRESS = `zs1${"q".repeat(75)}`;
const UNIFIED_ADDRESS = `u1${"q".repeat(100)}`;

const addressUrl = (address: string) => `/#/${ZCASH.networkSlug}/address/${address}`;

test.describe("Zcash address", () => {
  test("search opens a transparent address and explains that the gateway blocks the index", async ({
    page,
  }) => {
    const calls = await mockZcashRpc(page);
    await page.goto(`/#/${ZCASH.networkSlug}`);
    await expect(page.locator(".network-title-name")).toHaveText("ZCASH MAINNET");

    const input = page.locator("input.home-search-input").first();
    await input.fill(T_ADDRESS);
    await input.press("Enter");

    await expect(page).toHaveURL(new RegExp(`/${ZCASH.networkSlug}/address/${T_ADDRESS}$`));
    await expect(page.getByText("doesn't provide Zebra's address index")).toBeVisible();
    await expect(page.getByRole("link", { name: "Configure RPC endpoints" })).toHaveAttribute(
      "href",
      /settings/,
    );
    expect(calls.map((call) => call.method)).toEqual(
      expect.arrayContaining(["getaddressbalance", "getaddressutxos", "getaddresstxids"]),
    );
  });

  test("shows balance, unspent outputs and history when the node serves the address index", async ({
    page,
  }) => {
    await mockZcashRpc(page, { addressIndex: true });

    await page.goto(addressUrl(T_ADDRESS));

    await expect(page.locator(".tx-row").filter({ hasText: "Balance:" })).toContainText(
      "0.09514810 ZEC",
    );
    await expect(page.locator(".tx-row").filter({ hasText: "Total Received:" })).toContainText(
      "0.19029620 ZEC",
    );

    await page.getByRole("button", { name: /Unspent Outputs \(1\)/ }).click();
    await expect(page.locator(".btc-utxo-list")).toContainText("0.00050000 ZEC");

    await page.getByRole("button", { name: /Transactions \(2\)/ }).click();
    await expect(page.locator(".btc-tx-list .btc-tx-list-item").first()).toContainText(
      ZCASH.transparentTxid,
    );
  });

  test("lists a unified address's receivers and looks up its transparent receiver", async ({
    page,
  }) => {
    const calls = await mockZcashRpc(page, { addressIndex: true });

    await page.goto(addressUrl(UNIFIED_ADDRESS));

    const receivers = page.locator(".tx-row").filter({ hasText: "Receivers:" });
    await expect(receivers).toContainText("Orchard");
    await expect(receivers).toContainText(T_ADDRESS);
    await expect(page.locator(".tx-row").filter({ hasText: "Balance:" })).toContainText(
      "0.09514810 ZEC",
    );

    const balanceCall = calls.find((call) => call.method === "getaddressbalance");
    expect(balanceCall?.params[0]).toEqual({ addresses: [T_ADDRESS] });
  });

  test("explains that a Sapling address stays private without querying the index", async ({
    page,
  }) => {
    const calls = await mockZcashRpc(page);

    await page.goto(addressUrl(SAPLING_ADDRESS));

    await expect(page.getByText("Shielded addresses don't reveal balances")).toBeVisible();
    expect(
      calls.some(
        (call) => call.method.startsWith("getaddress") || call.method === "z_listunifiedreceivers",
      ),
    ).toBe(false);
  });
});
