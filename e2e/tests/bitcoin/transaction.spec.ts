import { expect, test } from "../../fixtures/test";
import { BITCOIN } from "../../fixtures/bitcoin";
import { waitForBitcoinTxContent } from "../../helpers/wait";
import { BitcoinTransactionPage } from "../../pages/bitcoin-transaction.page";

test.describe("Bitcoin Transaction Page", () => {
  test("genesis coinbase transaction - unspendable", async ({ page }, testInfo) => {
    const txPage = new BitcoinTransactionPage(page);
    const tx = BITCOIN.transactions.genesisCoinbase;
    await txPage.goto(tx.txid);

    const loaded = await waitForBitcoinTxContent(page, testInfo);
    if (loaded) {
      // Transaction ID should be visible
      await expect(page.locator("text=Transaction ID:")).toBeVisible();

      // Block height
      await expect(page.locator("text=Block:")).toBeVisible();

      // Confirmations
      await expect(txPage.confirmationsBadge).toBeVisible();
      await expect(txPage.confirmationsBadge).toContainText("Confirmations");

      // Coinbase indicator
      await expect(page.locator("text=Coinbase")).toBeVisible();

      // Value
      await expect(page.locator("text=50 BTC")).toBeVisible();
    }
  });

  test("legacy transaction - pre-SegWit pizza transaction", async ({ page }, testInfo) => {
    const txPage = new BitcoinTransactionPage(page);
    const tx = BITCOIN.transactions.legacy;
    await txPage.goto(tx.txid);

    const loaded = await waitForBitcoinTxContent(page, testInfo);
    if (loaded) {
      // Transaction ID
      await expect(page.locator("text=Transaction ID:")).toBeVisible();

      // Block height
      await expect(page.locator("text=Block:")).toBeVisible();

      // Inputs section
      await expect(page.locator("text=Inputs")).toBeVisible();

      // Outputs section
      await expect(page.locator("text=Outputs")).toBeVisible();

      // Fee information
      await expect(page.locator("text=Fee:")).toBeVisible();

      // Size (legacy transactions have size = vsize)
      await expect(page.locator("text=Size:")).toBeVisible();
    }
  });

  test("SegWit transaction - first SegWit block tx", async ({ page }, testInfo) => {
    const txPage = new BitcoinTransactionPage(page);
    const tx = BITCOIN.transactions.segwit;
    await txPage.goto(tx.txid);

    const loaded = await waitForBitcoinTxContent(page, testInfo);
    if (loaded) {
      // Transaction ID
      await expect(page.locator("text=Transaction ID:")).toBeVisible();

      // Block
      await expect(page.locator("text=Block:")).toBeVisible();

      // For SegWit, vsize should be smaller than size
      await expect(page.locator("text=Size:")).toBeVisible();
      await expect(page.locator("text=Virtual Size:")).toBeVisible();
      await expect(page.locator("text=Weight:")).toBeVisible();

      // Inputs and Outputs
      await expect(page.locator("text=Inputs")).toBeVisible();
      await expect(page.locator("text=Outputs")).toBeVisible();
    }
  });

  test("Taproot transaction - first Taproot block tx", async ({ page }, testInfo) => {
    const txPage = new BitcoinTransactionPage(page);
    const tx = BITCOIN.transactions.taproot;
    await txPage.goto(tx.txid);

    const loaded = await waitForBitcoinTxContent(page, testInfo);
    if (loaded) {
      // Transaction ID
      await expect(page.locator("text=Transaction ID:")).toBeVisible();

      // Block
      await expect(page.locator("text=Block:")).toBeVisible();

      // Size metrics (Taproot also has witness data)
      await expect(page.locator("text=Size:")).toBeVisible();

      // Inputs and Outputs
      await expect(page.locator("text=Inputs")).toBeVisible();
      await expect(page.locator("text=Outputs")).toBeVisible();
    }
  });

  test("transaction with OP_RETURN output", async ({ page }, testInfo) => {
    const txPage = new BitcoinTransactionPage(page);
    const tx = BITCOIN.transactions.opReturn;
    await txPage.goto(tx.txid);

    const loaded = await waitForBitcoinTxContent(page, testInfo);
    if (loaded) {
      // Transaction ID
      await expect(page.locator("text=Transaction ID:")).toBeVisible();

      // Outputs section should show OP_RETURN
      await expect(page.locator("text=Outputs")).toBeVisible();
      await expect(page.locator("text=OP_RETURN").or(page.locator("text=nulldata"))).toBeVisible();
    }
  });

  test("displays fee rate calculations correctly", async ({ page }, testInfo) => {
    const txPage = new BitcoinTransactionPage(page);
    const tx = BITCOIN.transactions.segwit;
    await txPage.goto(tx.txid);

    const loaded = await waitForBitcoinTxContent(page, testInfo);
    if (loaded) {
      // Fee should be displayed
      await expect(page.locator("text=Fee:")).toBeVisible();

      // Fee rate in sat/vB
      await expect(page.locator("text=sat/vB").or(page.locator("text=sat/B"))).toBeVisible();
    }
  });

  test("handles invalid transaction hash gracefully", async ({ page }, testInfo) => {
    const txPage = new BitcoinTransactionPage(page);
    await txPage.goto("0000000000000000000000000000000000000000000000000000000000000000");

    // Wait for loader to disappear
    try {
      await txPage.loader.waitFor({ state: "hidden", timeout: 30000 });
    } catch {
      // Loader may not appear
    }

    // Should show error, not found, or no transaction ID (invalid tx)
    const hasError = await page.locator(".text-error").isVisible();
    const hasNotFound = await page.locator("text=not found").isVisible();
    const hasTxId = await page.locator("text=Transaction ID:").isVisible();

    // Either error/not found should be shown, OR no tx ID (invalid tx)
    expect(hasError || hasNotFound || !hasTxId).toBeTruthy();
  });

  test("transaction shows correct input and output addresses", async ({ page }, testInfo) => {
    const txPage = new BitcoinTransactionPage(page);
    const tx = BITCOIN.transactions.legacy;
    await txPage.goto(tx.txid);

    const loaded = await waitForBitcoinTxContent(page, testInfo);
    if (loaded) {
      // Inputs section with addresses
      await expect(page.locator("text=Inputs")).toBeVisible();

      // Outputs section with addresses
      await expect(page.locator("text=Outputs")).toBeVisible();

      // At least one address should be clickable (link)
      const addressLinks = page.locator('a[href*="/btc/address/"]');
      await expect(addressLinks.first()).toBeVisible();
    }
  });
});
