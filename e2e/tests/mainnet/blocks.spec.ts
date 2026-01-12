import { test, expect } from "../../fixtures/test";
import { BlocksPage } from "../../pages/blocks.page";
import { DEFAULT_TIMEOUT } from "../../helpers/wait";

test.describe("Blocks Page", () => {
  test("displays blocks list with header", async ({ page }) => {
    const blocksPage = new BlocksPage(page);
    await blocksPage.goto("1");

    // Wait for loader to disappear
    await expect(blocksPage.loader).toBeHidden({ timeout: DEFAULT_TIMEOUT * 3 });

    // Verify header structure
    await expect(blocksPage.blocksHeader).toBeVisible();
    await expect(blocksPage.blocksHeaderMain).toBeVisible();
    await expect(blocksPage.blockLabel).toBeVisible();
    await expect(blocksPage.blockLabel).toHaveText("Latest Blocks");

    // Verify header info is present
    await expect(blocksPage.blocksHeaderInfo).toBeVisible();
    const infoText = await blocksPage.getInfoText();
    expect(infoText).toMatch(/Showing \d+ most recent blocks/);

    // Verify table is present with blocks
    await expect(blocksPage.tableWrapper).toBeVisible();
    await expect(blocksPage.blockTable).toBeVisible();

    const blockCount = await blocksPage.getBlockCount();
    expect(blockCount).toBeGreaterThan(0);
    expect(blockCount).toBeLessThanOrEqual(10); // BLOCKS_PER_PAGE = 10

    // Verify pagination is present
    await expect(blocksPage.paginationContainer).toBeVisible();
    await expect(blocksPage.latestBtn).toBeVisible();
    await expect(blocksPage.newerBtn).toBeVisible();
    await expect(blocksPage.olderBtn).toBeVisible();
  });

  test("RPCIndicator is not visible in fallback mode (default)", async ({ page }) => {
    const blocksPage = new BlocksPage(page);
    await blocksPage.goto("1");

    await expect(blocksPage.loader).toBeHidden({ timeout: DEFAULT_TIMEOUT * 3 });

    // RPC Indicator should NOT be present in fallback mode (default strategy)
    // It only displays in parallel mode where multiple providers are compared
    await expect(blocksPage.rpcIndicator).not.toBeVisible();
  });

  test("blocks header displays in single line layout", async ({ page }) => {
    const blocksPage = new BlocksPage(page);
    await blocksPage.goto("1");

    await expect(blocksPage.loader).toBeHidden({ timeout: DEFAULT_TIMEOUT * 3 });

    // Verify header main container has flex layout elements
    await expect(blocksPage.blocksHeaderMain).toBeVisible();
    await expect(blocksPage.blockLabel).toBeVisible();

    // Verify divider is present
    const divider = page.locator(".block-header-divider");
    await expect(divider).toBeVisible();
    await expect(divider).toHaveText("•");

    // Verify info is inline with label
    await expect(blocksPage.blocksHeaderInfo).toBeVisible();
  });

  test("displays correct block information in table", async ({ page }) => {
    const blocksPage = new BlocksPage(page);
    await blocksPage.goto("1");

    await expect(blocksPage.loader).toBeHidden({ timeout: DEFAULT_TIMEOUT * 3 });

    // Verify table headers
    const table = blocksPage.blockTable;
    await expect(table.locator("th", { hasText: "Block" })).toBeVisible();
    await expect(table.locator("th", { hasText: "Timestamp" })).toBeVisible();
    await expect(table.locator("th", { hasText: "Txns" })).toBeVisible();
    await expect(table.locator("th", { hasText: "Miner" })).toBeVisible();
    await expect(table.locator("th", { hasText: "Gas Used" })).toBeVisible();
    await expect(table.locator("th", { hasText: "Gas Limit" })).toBeVisible();
    await expect(table.locator("th", { hasText: "Size" })).toBeVisible();

    // Verify at least one row exists
    const firstRow = table.locator("tbody tr").first();
    await expect(firstRow).toBeVisible();

    // Verify row contains data
    await expect(firstRow.locator("td").first()).toBeVisible();
  });

  test("pagination buttons work correctly", async ({ page }) => {
    const blocksPage = new BlocksPage(page);
    await blocksPage.goto("1");

    await expect(blocksPage.loader).toBeHidden({ timeout: DEFAULT_TIMEOUT * 3 });

    // On latest page, Latest and Newer should be disabled
    await expect(blocksPage.latestBtn).toBeDisabled();
    await expect(blocksPage.newerBtn).toBeDisabled();

    // Older should be enabled
    await expect(blocksPage.olderBtn).toBeEnabled();

    // Click Older button
    await blocksPage.olderBtn.click();

    // Wait for new blocks to load
    await expect(blocksPage.loader).toBeHidden({ timeout: DEFAULT_TIMEOUT * 3 });

    // Now Newer should be enabled
    await expect(blocksPage.newerBtn).toBeEnabled();
  });

  test("navigates between block pages correctly", async ({ page }) => {
    const blocksPage = new BlocksPage(page);
    await blocksPage.goto("1");

    await expect(blocksPage.loader).toBeHidden({ timeout: DEFAULT_TIMEOUT * 3 });

    // Navigate to older blocks
    await blocksPage.olderBtn.click();
    await expect(blocksPage.loader).toBeHidden({ timeout: DEFAULT_TIMEOUT * 3 });

    // Verify blocks are still displayed
    await expect(blocksPage.blockTable).toBeVisible();

    // Navigate back to latest
    await blocksPage.latestBtn.click();
    await expect(blocksPage.loader).toBeHidden({ timeout: DEFAULT_TIMEOUT * 3 });

    // Verify we're back on latest blocks
    await expect(blocksPage.blockTable).toBeVisible();
  });

  test("handles loading state correctly", async ({ page }) => {
    const blocksPage = new BlocksPage(page);

    // Start navigation
    const navigation = blocksPage.goto("1");

    // Loader should be visible initially
    await expect(blocksPage.loader).toBeVisible({ timeout: 5000 });

    // Wait for navigation to complete
    await navigation;

    // Loader should eventually disappear
    await expect(blocksPage.loader).toBeHidden({ timeout: DEFAULT_TIMEOUT * 3 });

    // Content should be visible
    await expect(blocksPage.blocksHeader).toBeVisible();
    await expect(blocksPage.blockTable).toBeVisible();
  });

  test("displays correct block range when using fromBlock parameter", async ({ page }) => {
    const blocksPage = new BlocksPage(page);
    const fromBlock = 1000000;
    await blocksPage.gotoWithFromBlock(fromBlock, "1");

    await expect(blocksPage.loader).toBeHidden({ timeout: DEFAULT_TIMEOUT * 3 });

    // Verify header shows block range instead of "most recent"
    const infoText = await blocksPage.getInfoText();
    expect(infoText).toMatch(/Showing blocks/);
    expect(infoText).not.toMatch(/most recent/);
  });

  test("header has proper styling and layout", async ({ page }) => {
    const blocksPage = new BlocksPage(page);
    await blocksPage.goto("1");

    await expect(blocksPage.loader).toBeHidden({ timeout: DEFAULT_TIMEOUT * 3 });

    // Verify header has proper structure
    const header = blocksPage.blocksHeader;
    await expect(header).toBeVisible();

    // Verify header main section is visible
    await expect(blocksPage.blocksHeaderMain).toBeVisible();
    await expect(blocksPage.blockLabel).toBeVisible();
    await expect(blocksPage.blocksHeaderInfo).toBeVisible();

    // Check that header has proper dimensions
    const headerBox = await header.boundingBox();
    expect(headerBox).not.toBeNull();
  });
});
