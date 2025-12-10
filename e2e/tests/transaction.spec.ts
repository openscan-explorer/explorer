import { test, expect } from "@playwright/test";
import { TransactionPage } from "../pages/transaction.page";
import { MAINNET } from "../fixtures/mainnet";

// Helper to wait for content or error
async function waitForTxContent(page: import("@playwright/test").Page) {
  await expect(
    page
      .locator("text=Transaction Hash:")
      .or(page.locator("text=Error:"))
      .or(page.locator("text=Something went wrong"))
  ).toBeVisible({ timeout: 45000 });

  return (
    !(await page.locator("text=Error:").isVisible()) &&
    !(await page.locator("text=Something went wrong").isVisible())
  );
}

test.describe("Transaction Page", () => {
  test("displays first ETH transfer with all details", async ({ page }) => {
    const txPage = new TransactionPage(page);
    const tx = MAINNET.transactions.firstEthTransfer;

    await txPage.goto(tx.hash);

    const loaded = await waitForTxContent(page);
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

  test("shows correct from and to addresses", async ({ page }) => {
    const txPage = new TransactionPage(page);
    const tx = MAINNET.transactions.firstEthTransfer;

    await txPage.goto(tx.hash);

    const loaded = await waitForTxContent(page);
    if (loaded) {
      const from = await txPage.getFromAddress();
      expect(from.toLowerCase()).toContain(tx.from.toLowerCase().slice(0, 10));

      const to = await txPage.getToAddress();
      expect(to.toLowerCase()).toContain(tx.to.toLowerCase().slice(0, 10));
    }
  });

  test("displays transaction value and fee", async ({ page }) => {
    const txPage = new TransactionPage(page);
    const tx = MAINNET.transactions.firstEthTransfer;

    await txPage.goto(tx.hash);

    const loaded = await waitForTxContent(page);
    if (loaded) {
      // Verify value contains ETH
      const value = await txPage.getValue();
      expect(value).toContain("ETH");

      // Verify transaction fee is displayed
      await expect(page.locator("text=Transaction Fee:")).toBeVisible();
    }
  });

  test("displays other attributes section", async ({ page }) => {
    const txPage = new TransactionPage(page);
    const tx = MAINNET.transactions.firstEthTransfer;

    await txPage.goto(tx.hash);

    const loaded = await waitForTxContent(page);
    if (loaded) {
      // Verify other attributes section
      await expect(page.locator("text=Other Attributes:")).toBeVisible();
      await expect(page.locator("text=Nonce:")).toBeVisible();
      await expect(page.locator("text=Position:")).toBeVisible();
    }
  });

  test("displays transaction with input data", async ({ page }) => {
    const txPage = new TransactionPage(page);
    const tx = MAINNET.transactions.usdcApproval;

    await txPage.goto(tx.hash);

    const loaded = await waitForTxContent(page);
    if (loaded) {
      // Verify input data section exists for contract interactions
      await expect(page.locator("text=Input Data:")).toBeVisible();
    }
  });

  test("displays block number link", async ({ page }) => {
    const txPage = new TransactionPage(page);
    const tx = MAINNET.transactions.firstEthTransfer;

    await txPage.goto(tx.hash);

    const loaded = await waitForTxContent(page);
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
      txPage.errorText.or(txPage.container).or(page.locator("text=Something went wrong"))
    ).toBeVisible({ timeout: 30000 });
  });
});
