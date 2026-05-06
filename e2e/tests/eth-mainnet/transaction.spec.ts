import { test, expect } from "../../fixtures/test";
import { TransactionPage } from "../../pages/transaction.page";
import { MAINNET } from "../../fixtures/mainnet";
import { waitForTxContent, DEFAULT_TIMEOUT } from "../../helpers/wait";

// Transaction hash constants for readability
const FIRST_ETH_TRANSFER = "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060";
// EIP-1559 (Type 2) tx at block 20,000,000 with real calldata — this hash is
// verified on-chain via `eth_getTransactionByHash` (input 242 chars, starts
// with 0x091a4fc4). Previously `USDC_APPROVAL` pointed to
// `0xc55e2b90168af69721…` which the fixture *claimed* was a Type 2 USDC
// approval, but on-chain that hash resolves to a 2016 Binance transfer with
// empty `input: "0x"` — USDC didn't deploy until 2018. Tests that expected
// input-data on that hash would fail against real RPCs.
const TX_WITH_INPUT_DATA = "0xbb4b3fc2b746877dce70862850602f1d19bd890ab4db47e6b7ee1da1fe578a0d";

test.describe("Transaction Page", () => {
  test("displays first ETH transfer with all details", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = MAINNET.transactions[FIRST_ETH_TRANSFER];

    await txPage.goto(tx.hash);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      // Verify core transaction details
      await expect(page.locator("text=Transaction Hash:")).toBeVisible();
      await expect(page.locator("text=Status:")).toBeVisible();
      await expect(page.locator("text=Block:")).toBeVisible();
      await expect(page.locator("text=From:")).toBeVisible();
      await expect(page.locator("text=To:")).toBeVisible();
      await expect(page.locator("text=Value:")).toBeVisible();

      // Verify gas information
      await expect(page.locator("text=Gas Price:")).toBeVisible();
      await expect(page.locator("text=Gas Limit")).toBeVisible();
    }
  });

  test("shows correct from and to addresses", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = MAINNET.transactions[FIRST_ETH_TRANSFER];

    await txPage.goto(tx.hash);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      const from = await txPage.getFromAddress();
      expect(from.toLowerCase()).toContain(tx.from.toLowerCase().slice(0, 10));

      const to = await txPage.getToAddress();
      expect(to?.toLowerCase()).toContain(tx.to?.toLowerCase().slice(0, 10));
    }
  });

  test("displays transaction value and fee", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = MAINNET.transactions[FIRST_ETH_TRANSFER];

    await txPage.goto(tx.hash);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      // Verify value contains ETH
      const value = await txPage.getValue();
      expect(value).toContain("ETH");

      // Verify transaction fee is displayed
      await expect(page.locator("text=Transaction Fee:")).toBeVisible();
    }
  });

  test("displays other attributes section", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = MAINNET.transactions[FIRST_ETH_TRANSFER];

    await txPage.goto(tx.hash);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      // Verify transaction detail fields
      await expect(page.locator("text=Nonce:")).toBeVisible();
      await expect(page.locator("text=Position:")).toBeVisible();
    }
  });

  test("displays transaction with input data", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = MAINNET.transactions[TX_WITH_INPUT_DATA];

    await txPage.goto(tx.hash);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      // The "Input Data" tab lives inside `TxAnalyser`, which only mounts
      // once `hasEvents || hasInputData || isSuperUser`. `hasInputData` is
      // derived from the receipt, which arrives after `waitForTxContent`
      // returns (that helper only waits for the basic tx-by-hash render).
      // Give the receipt fetch a full RPC budget.
      await expect(page.locator("text=Input Data").first()).toBeVisible({
        timeout: DEFAULT_TIMEOUT * 3,
      });
    }
  });

  test("displays block number link", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = MAINNET.transactions[FIRST_ETH_TRANSFER];

    await txPage.goto(tx.hash);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      // Verify block section is displayed (block number may be formatted with commas)
      await expect(page.locator("text=Block:")).toBeVisible();
      const blockValue = await txPage.getBlockNumber();
      expect(blockValue).toBeTruthy();
    }
  });

  test("handles invalid tx hash gracefully", async ({ page }) => {
    const txPage = new TransactionPage(page);
    await txPage.goto("0xinvalid");

    await expect(
      txPage.errorText
        .or(txPage.container)
        .or(page.locator("text=Something went wrong"))
        .first()
    ).toBeVisible({ timeout: DEFAULT_TIMEOUT * 3 });
  });
});
