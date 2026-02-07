import type { Locator, Page } from "@playwright/test";
import { DEFAULT_TIMEOUT } from "../helpers/wait";

export class BitcoinBlockPage {
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
  readonly minerBadge: Locator;

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
    this.minerBadge = page.locator(".btc-miner-badge");
  }

  async goto(blockNumber: number | string, networkSlug = "btc") {
    await this.page.goto(`/${networkSlug}/block/${blockNumber}`);
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

  async getMiner(): Promise<string> {
    return (await this.minerBadge.textContent()) ?? "";
  }

  async getBlockReward(): Promise<string> {
    return this.getRowValue("Block Reward");
  }

  async getDifficulty(): Promise<string> {
    return this.getRowValue("Difficulty");
  }

  async getBlockHash(): Promise<string> {
    return this.getRowValue("Block Hash");
  }
}
