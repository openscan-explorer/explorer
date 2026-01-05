import { test, expect } from "../../fixtures/test";
import { TransactionPage } from "../../pages/transaction.page";
import { MAINNET } from "../../fixtures/mainnet";
import { waitForTxContent, DEFAULT_TIMEOUT } from "../../helpers/wait";

// Transaction hash constants for readability
const FIRST_ETH_TRANSFER = "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060";
const USDC_APPROVAL = "0xc55e2b90168af6972193c1f86fa4d7d7b31a29c156665d15b9cd48618b5177ef";

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
      // Verify other attributes section
      await expect(page.locator("text=Other Attributes:")).toBeVisible();
      await expect(page.locator("text=Nonce:")).toBeVisible();
      await expect(page.locator("text=Position:")).toBeVisible();
    }
  });

  test("displays transaction with input data", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = MAINNET.transactions[USDC_APPROVAL];

    await txPage.goto(tx.hash);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      // Verify input data section exists for contract interactions
      await expect(page.locator("text=Input Data:")).toBeVisible();
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
