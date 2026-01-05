import type { Locator, Page } from "@playwright/test";
import { DEFAULT_TIMEOUT } from "../helpers/wait";

export class BlockPage {
  readonly page: Page;
  readonly container: Locator;
  readonly blockNumber: Locator;
  readonly blockLabel: Locator;
  readonly timestampAge: Locator;
  readonly statusBadge: Locator;
  readonly txDetails: Locator;
  readonly loader: Locator;
  readonly errorText: Locator;
  readonly navPrevBtn: Locator;
  readonly navNextBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator(".container-wide");
    this.blockNumber = page.locator(".block-number");
    this.blockLabel = page.locator(".block-label");
    this.timestampAge = page.locator(".block-timestamp-age");
    this.statusBadge = page.locator(".block-status-badge");
    this.txDetails = page.locator(".tx-details");
    this.loader = page.locator(".loader-container");
    this.errorText = page.locator(".text-error, .error-text");
    this.navPrevBtn = page.locator(".block-nav-btn").first();
    this.navNextBtn = page.locator(".block-nav-btn").last();
  }

  async goto(blockNumber: number | string, chainId = "1") {
    await this.page.goto(`/${chainId}/block/${blockNumber}`);
  }

  async waitForLoad() {
    await this.loader.waitFor({ state: "hidden", timeout: DEFAULT_TIMEOUT * 3 });
  }

  async getBlockNumber(): Promise<string> {
    return (await this.blockNumber.textContent()) ?? "";
  }

  async getRowValue(label: string): Promise<string> {
    const row = this.txDetails.locator(".tx-row", { hasText: label });
    return (await row.locator(".tx-value").textContent()) ?? "";
  }

  async getTransactionCount(): Promise<string> {
    return this.getRowValue("Transactions");
  }

  async getGasUsed(): Promise<string> {
    return this.getRowValue("Gas Used");
  }

  async getFeeRecipient(): Promise<string> {
    return this.getRowValue("Fee Recipient");
  }
}
