import { test, expect } from "../../fixtures/test";
import { TxsPage } from "../../pages/txs.page";
import { waitForTxsContent, DEFAULT_TIMEOUT } from "../../helpers/wait";

test.describe("Transactions Page", () => {
  test("displays transactions list with header", async ({ page }, testInfo) => {
    const txsPage = new TxsPage(page);
    await txsPage.goto("1");

    const loaded = await waitForTxsContent(page, testInfo);
    if (loaded) {
      // Verify header structure
      await expect(txsPage.blocksHeader).toBeVisible();
      await expect(txsPage.blocksHeaderMain).toBeVisible();
      await expect(txsPage.blockLabel).toBeVisible();
      await expect(txsPage.blockLabel).toHaveText("Latest Transactions");

      // Verify header info is present
      await expect(txsPage.blocksHeaderInfo).toBeVisible();
      const infoText = await txsPage.getInfoText();
      expect(infoText).toMatch(/Showing \d+ transactions from the last \d+ blocks/);

      // Verify table is present with transactions
      await expect(txsPage.tableWrapper).toBeVisible();
      await expect(txsPage.txTable).toBeVisible();

      const txCount = await txsPage.getTransactionCount();
      expect(txCount).toBeGreaterThan(0);

      // Verify pagination is present
      await expect(txsPage.paginationContainer.first()).toBeVisible();
      await expect(txsPage.latestBtn.first()).toBeVisible();
      await expect(txsPage.newerBtn.first()).toBeVisible();
      await expect(txsPage.olderBtn.first()).toBeVisible();
    }
  });

  test("RPCIndicator displays strategy info", async ({ page }, testInfo) => {
    const txsPage = new TxsPage(page);
    await txsPage.goto("1");

    const loaded = await waitForTxsContent(page, testInfo);
    if (loaded) {
      // RPC Indicator shows metadata in all modes (fallback, parallel, race)
      await expect(txsPage.rpcIndicator).toBeVisible();
    }
  });

  test("transactions header displays in single line layout", async ({ page }, testInfo) => {
    const txsPage = new TxsPage(page);
    await txsPage.goto("1");

    const loaded = await waitForTxsContent(page, testInfo);
    if (loaded) {
      // Verify header main container has flex layout elements
      await expect(txsPage.blocksHeaderMain).toBeVisible();
      await expect(txsPage.blockLabel).toBeVisible();

      // Verify divider is present
      const divider = page.locator(".block-header-divider");
      await expect(divider).toBeVisible();
      await expect(divider).toHaveText("•");

      // Verify info is inline with label
      await expect(txsPage.blocksHeaderInfo).toBeVisible();
    }
  });

  test("displays correct transaction information in table", async ({ page }, testInfo) => {
    const txsPage = new TxsPage(page);
    await txsPage.goto("1");

    const loaded = await waitForTxsContent(page, testInfo);
    if (loaded) {
      // Verify table headers
      const table = txsPage.txTable;
      await expect(table.locator("th", { hasText: "Tx Hash" })).toBeVisible();
      await expect(table.locator("th", { hasText: "Block" })).toBeVisible();
      await expect(table.locator("th", { hasText: "From" })).toBeVisible();
      await expect(table.locator("th", { hasText: "To" })).toBeVisible();
      await expect(table.locator("th", { hasText: "Value" })).toBeVisible();
      await expect(table.locator("th", { hasText: "Gas Price" })).toBeVisible();
      await expect(table.locator("th", { hasText: /^Gas$/ })).toBeVisible();

      // Verify at least one row exists
      const firstRow = table.locator("tbody tr").first();
      await expect(firstRow).toBeVisible();

      // Verify row contains data
      await expect(firstRow.locator("td").first()).toBeVisible();
    }
  });

  test("pagination buttons work correctly", async ({ page }, testInfo) => {
    const txsPage = new TxsPage(page);
    await txsPage.goto("1");

    const loaded = await waitForTxsContent(page, testInfo);
    if (loaded) {
      // On latest page, Latest and Newer should be disabled
      await expect(txsPage.latestBtn.first()).toBeDisabled();
      await expect(txsPage.newerBtn.first()).toBeDisabled();

      // Older should be enabled
      await expect(txsPage.olderBtn.first()).toBeEnabled();

      // Click Older and wait for URL to change (navigation happened)
      await txsPage.olderBtn.first().click();
      await page.waitForURL(/fromBlock=/, { timeout: DEFAULT_TIMEOUT });

      // Wait for older page data to load (RPC-dependent)
      const olderLoaded = await waitForTxsContent(page, testInfo);
      if (olderLoaded) {
        // Now Newer should be enabled
        await expect(txsPage.newerBtn.first()).toBeEnabled();
      }
    }
  });

  test("navigates between transaction pages correctly", async ({ page }, testInfo) => {
    const txsPage = new TxsPage(page);
    await txsPage.goto("1");

    const loaded = await waitForTxsContent(page, testInfo);
    if (loaded) {
      // Navigate to older transactions and wait for URL change
      await txsPage.olderBtn.first().click();
      await page.waitForURL(/fromBlock=/, { timeout: DEFAULT_TIMEOUT });

      // Wait for older page data to load (RPC-dependent)
      const olderLoaded = await waitForTxsContent(page, testInfo);
      if (olderLoaded) {
        // Verify transactions are displayed
        await expect(txsPage.txTable).toBeVisible();

        // Navigate back to latest - wait for button to be enabled first
        await expect(txsPage.latestBtn.first()).toBeEnabled({ timeout: DEFAULT_TIMEOUT });
        await txsPage.latestBtn.first().click();
        await page.waitForURL(/\/txs(?!\?)/, { timeout: DEFAULT_TIMEOUT });

        // Wait for latest page data to load
        const latestLoaded = await waitForTxsContent(page, testInfo);
        if (latestLoaded) {
          // Verify we're back on latest transactions
          await expect(txsPage.txTable).toBeVisible();
        }
      }
    }
  });

  test("handles loading state correctly", async ({ page }, testInfo) => {
    const txsPage = new TxsPage(page);

    // Start navigation
    const navigation = txsPage.goto("1");

    // Loader should be visible initially or content loads quickly
    await expect(
      txsPage.loader.or(txsPage.blocksHeaderMain)
    ).toBeVisible({ timeout: DEFAULT_TIMEOUT });

    // Wait for navigation to complete
    await navigation;

    // Wait for content to load
    const loaded = await waitForTxsContent(page, testInfo);
    if (loaded) {
      // Content should be visible
      await expect(txsPage.blocksHeader).toBeVisible();
      await expect(txsPage.txTable).toBeVisible();
    }
  });

  test("displays correct block range when using fromBlock parameter", async ({ page }, testInfo) => {
    const txsPage = new TxsPage(page);
    const fromBlock = 1000000;
    await txsPage.gotoWithFromBlock(fromBlock, "1");

    const loaded = await waitForTxsContent(page, testInfo);
    if (loaded) {
      // Verify header shows block range instead of "last N blocks"
      const infoText = await txsPage.getInfoText();
      expect(infoText).toMatch(/Showing \d+ transactions from blocks/);
      expect(infoText).not.toMatch(/last \d+ blocks/);
    }
  });

  test("header has proper styling and layout", async ({ page }, testInfo) => {
    const txsPage = new TxsPage(page);
    await txsPage.goto("1");

    const loaded = await waitForTxsContent(page, testInfo);
    if (loaded) {
      // Verify header has proper structure
      const header = txsPage.blocksHeader;
      await expect(header).toBeVisible();

      // Verify header main section is visible
      await expect(txsPage.blocksHeaderMain).toBeVisible();
      await expect(txsPage.blockLabel).toBeVisible();
      await expect(txsPage.blocksHeaderInfo).toBeVisible();

      // Check that header has proper dimensions
      const headerBox = await header.boundingBox();
      expect(headerBox).not.toBeNull();
    }
  });

  test("uses block-display-card structure with consistent margins", async ({ page }, testInfo) => {
    const txsPage = new TxsPage(page);
    await txsPage.goto("1");

    const loaded = await waitForTxsContent(page, testInfo);
    if (loaded) {
      // Verify container structure
      await expect(txsPage.container).toBeVisible();

      // Check for block-display-card class
      const blockDisplayCard = page.locator(".block-display-card");
      await expect(blockDisplayCard).toBeVisible();

      // Verify blocks-header is inside block-display-card
      const headerInCard = blockDisplayCard.locator(".blocks-header");
      await expect(headerInCard).toBeVisible();
    }
  });
});
