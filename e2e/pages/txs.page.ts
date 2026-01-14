import type { Locator, Page } from "@playwright/test";
import { DEFAULT_TIMEOUT } from "../helpers/wait";

export class TxsPage {
  readonly page: Page;
  readonly container: Locator;
  readonly blocksHeader: Locator;
  readonly blocksHeaderMain: Locator;
  readonly blockLabel: Locator;
  readonly blocksHeaderInfo: Locator;
  readonly rpcIndicator: Locator;
  readonly rpcBadge: Locator;
  readonly rpcDropdown: Locator;
  readonly tableWrapper: Locator;
  readonly txTable: Locator;
  readonly loader: Locator;
  readonly errorText: Locator;
  readonly paginationContainer: Locator;
  readonly latestBtn: Locator;
  readonly newerBtn: Locator;
  readonly olderBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator(".container-wide");
    this.blocksHeader = page.locator(".blocks-header");
    this.blocksHeaderMain = page.locator(".blocks-header-main");
    this.blockLabel = page.locator(".block-label");
    this.blocksHeaderInfo = page.locator(".blocks-header-info");
    this.rpcIndicator = page.locator(".rpc-indicator");
    this.rpcBadge = page.locator(".rpc-badge");
    this.rpcDropdown = page.locator(".rpc-dropdown");
    this.tableWrapper = page.locator(".table-wrapper");
    this.txTable = page.locator(".dash-table");
    this.loader = page.locator(".loader-container");
    this.errorText = page.locator(".text-error, .error-text");
    this.paginationContainer = page.locator(".pagination-container");
    this.latestBtn = page.locator(".pagination-btn", { hasText: "Latest" });
    this.newerBtn = page.locator(".pagination-btn", { hasText: "Newer" });
    this.olderBtn = page.locator(".pagination-btn", { hasText: "Older" });
  }

  async goto(chainId = "1") {
    await this.page.goto(`/${chainId}/txs`);
  }

  async gotoWithFromBlock(fromBlock: number, chainId = "1") {
    await this.page.goto(`/${chainId}/txs?fromBlock=${fromBlock}`);
  }

  async waitForLoad() {
    // Wait for content that only appears when data is loaded (not in loading state)
    // blocksHeaderInfo only renders after loading=false with data
    // Also handle error states gracefully
    await this.blocksHeaderInfo.or(this.errorText).waitFor({
      state: "visible",
      timeout: DEFAULT_TIMEOUT * 6,
    });
  }

  /**
   * Wait for navigation to complete after clicking a pagination button.
   * This waits for loading to start (old content disappears) and finish (new content appears).
   */
  async waitForNavigationLoad() {
    // First wait for loading state to start (blocksHeaderInfo disappears)
    await this.blocksHeaderInfo.waitFor({
      state: "hidden",
      timeout: DEFAULT_TIMEOUT * 2,
    });
    // Then wait for loading to complete (blocksHeaderInfo reappears)
    await this.waitForLoad();
  }

  async getTransactionCount(): Promise<number> {
    const rows = await this.txTable.locator("tbody tr").count();
    return rows;
  }

  async getHeaderText(): Promise<string> {
    return (await this.blockLabel.textContent()) ?? "";
  }

  async getInfoText(): Promise<string> {
    return (await this.blocksHeaderInfo.textContent()) ?? "";
  }

  async isRPCIndicatorVisible(): Promise<boolean> {
    return this.rpcIndicator.isVisible();
  }

  async getRPCBadgeText(): Promise<string> {
    return (await this.rpcBadge.textContent()) ?? "";
  }

  async clickRPCBadge() {
    await this.rpcBadge.click();
  }

  async isRPCDropdownVisible(): Promise<boolean> {
    return this.rpcDropdown.isVisible();
  }

  async getProviderOptions(): Promise<string[]> {
    const options = await this.rpcDropdown.locator(".provider-option").all();
    return Promise.all(options.map(async (opt) => (await opt.textContent()) ?? ""));
  }

  async selectProvider(providerUrl: string) {
    const option = this.rpcDropdown.locator(".provider-option", { hasText: providerUrl });
    await option.click();
  }
}
