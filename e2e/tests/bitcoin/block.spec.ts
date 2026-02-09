import { expect, test } from "../../fixtures/test";
import { BITCOIN } from "../../fixtures/bitcoin";
import { waitForBitcoinBlockContent } from "../../helpers/wait";
import { BitcoinBlockPage } from "../../pages/bitcoin-block.page";

test.describe("Bitcoin Block Page", () => {
  test("genesis block #0 - special case with coinbase", async ({ page }, testInfo) => {
    const blockPage = new BitcoinBlockPage(page);
    const block = BITCOIN.blocks["0"];
    await blockPage.goto(block.number);

    const loaded = await waitForBitcoinBlockContent(page, testInfo);
    if (loaded) {
      // Header section
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.blockNumber).toContainText("#0");

      // Block Hash
      await expect(page.locator("text=Block Hash:")).toBeVisible();
      const hash = await blockPage.getBlockHash();
      expect(hash.toLowerCase()).toContain(block.hash.slice(0, 16).toLowerCase());

      // Transactions - genesis has 1 coinbase tx
      await expect(page.locator("text=Transactions:")).toBeVisible();

      // Difficulty
      await expect(page.locator("text=Difficulty:")).toBeVisible();

      // No previous block navigation for genesis
      await expect(blockPage.navPrevBtn).not.toBeVisible();
    }
  });

  test("block #481,824 - first SegWit block", async ({ page }, testInfo) => {
    const blockPage = new BitcoinBlockPage(page);
    const block = BITCOIN.blocks["481824"];
    await blockPage.goto(block.number);

    const loaded = await waitForBitcoinBlockContent(page, testInfo);
    if (loaded) {
      // Header section
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.blockNumber).toContainText("#481,824");

      // Block Hash
      await expect(page.locator("text=Block Hash:")).toBeVisible();

      // Transaction count
      await expect(page.locator("text=Transactions:")).toBeVisible();

      // Miner detection
      await expect(page.locator("text=Mined by:")).toBeVisible();

      // Difficulty
      await expect(page.locator("text=Difficulty:")).toBeVisible();

      // Confirmations badge
      await expect(blockPage.statusBadge).toBeVisible();
      await expect(blockPage.statusBadge).toContainText("Confirmations");
    }
  });

  test("block #709,632 - first Taproot block", async ({ page }, testInfo) => {
    const blockPage = new BitcoinBlockPage(page);
    const block = BITCOIN.blocks["709632"];
    await blockPage.goto(block.number);

    const loaded = await waitForBitcoinBlockContent(page, testInfo);
    if (loaded) {
      // Header section
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.blockNumber).toContainText("#709,632");

      // Block Hash
      await expect(page.locator("text=Block Hash:")).toBeVisible();

      // Transaction count
      await expect(page.locator("text=Transactions:")).toBeVisible();

      // Difficulty should be higher than SegWit era
      await expect(page.locator("text=Difficulty:")).toBeVisible();
    }
  });

  test("block #800,000 - recent block with miner and fees", async ({ page }, testInfo) => {
    const blockPage = new BitcoinBlockPage(page);
    const block = BITCOIN.blocks["800000"];
    await blockPage.goto(block.number);

    const loaded = await waitForBitcoinBlockContent(page, testInfo);
    if (loaded) {
      // Header section
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.blockNumber).toContainText("#800,000");

      // Miner
      await expect(page.locator("text=Mined by:")).toBeVisible();

      // Block Reward
      await expect(page.locator("text=Block Reward:")).toBeVisible();

      // Total Fees
      await expect(page.locator("text=Total Fees:")).toBeVisible();

      // Fee Rate stats
      await expect(page.locator("text=Fee Rate:")).toBeVisible();

      // Size
      await expect(page.locator("text=Size:")).toBeVisible();

      // Weight
      await expect(page.locator("text=Weight:")).toBeVisible();

      // Navigation buttons
      await expect(blockPage.navPrevBtn).toBeVisible();
      await expect(blockPage.navNextBtn).toBeVisible();
    }
  });

  test("block navigation works correctly", async ({ page }, testInfo) => {
    const blockPage = new BitcoinBlockPage(page);
    await blockPage.goto(800000);

    const loaded = await waitForBitcoinBlockContent(page, testInfo);
    if (loaded) {
      // Click previous block
      await blockPage.navPrevBtn.click();

      // Should navigate to block 799,999
      await waitForBitcoinBlockContent(page, testInfo);
      await expect(blockPage.blockNumber).toContainText("#799,999");

      // Click next block to go back
      await blockPage.navNextBtn.click();

      // Should navigate back to block 800,000
      await waitForBitcoinBlockContent(page, testInfo);
      await expect(blockPage.blockNumber).toContainText("#800,000");
    }
  });

  test("handles invalid block number gracefully", async ({ page }, testInfo) => {
    const blockPage = new BitcoinBlockPage(page);
    await blockPage.goto(999999999);

    // Wait for loader to disappear
    try {
      await blockPage.loader.waitFor({ state: "hidden", timeout: 30000 });
    } catch {
      // Loader may not appear
    }

    // Should show error, not found, or no block hash (invalid block)
    const hasError = await page.locator(".text-error").isVisible();
    const hasNotFound = await page.locator("text=not found").isVisible();
    const hasBlockHash = await page.locator("text=Block Hash:").isVisible();

    // Either error/not found should be shown, OR no block hash (invalid block)
    expect(hasError || hasNotFound || !hasBlockHash).toBeTruthy();
  });

  test("block by hash works correctly", async ({ page }, testInfo) => {
    const blockPage = new BitcoinBlockPage(page);
    const block = BITCOIN.blocks["0"];
    await blockPage.goto(block.hash);

    const loaded = await waitForBitcoinBlockContent(page, testInfo);
    if (loaded) {
      // Should show genesis block
      await expect(blockPage.blockNumber).toContainText("#0");
    }
  });
});
