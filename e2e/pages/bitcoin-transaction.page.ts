import type { Locator, Page } from "@playwright/test";
import { DEFAULT_TIMEOUT } from "../helpers/wait";

export class BitcoinTransactionPage {
  readonly page: Page;
  readonly container: Locator;
  readonly txHash: Locator;
  readonly txDetails: Locator;
  readonly loader: Locator;
  readonly errorText: Locator;
  readonly confirmationsBadge: Locator;
  readonly coinbaseBadge: Locator;
  readonly inputsSection: Locator;
  readonly outputsSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator(".container-wide");
    this.txHash = page.locator(".tx-header-hash, .header-subtitle");
    this.txDetails = page.locator(".tx-details");
    this.loader = page.locator(".loader-container");
    this.errorText = page.locator(".text-error, .error-text");
    this.confirmationsBadge = page.locator(".tx-status-badge");
    this.coinbaseBadge = page.locator(".btc-coinbase-badge");
    this.inputsSection = page.locator(".btc-inputs-section");
    this.outputsSection = page.locator(".btc-outputs-section");
  }

  async goto(txid: string, networkSlug = "btc") {
    await this.page.goto(`/${networkSlug}/tx/${txid}`);
  }

  async waitForLoad() {
    await this.loader.waitFor({ state: "hidden", timeout: DEFAULT_TIMEOUT * 3 });
  }

  async getTxHash(): Promise<string> {
    return (await this.txHash.textContent()) ?? "";
  }

  async getRowValue(label: string): Promise<string> {
    const row = this.txDetails.locator(".tx-row", { hasText: label });
    return (await row.locator(".tx-value").textContent()) ?? "";
  }

  async getConfirmations(): Promise<string> {
    return (await this.confirmationsBadge.textContent()) ?? "";
  }

  async isCoinbase(): Promise<boolean> {
    return this.coinbaseBadge.isVisible();
  }

  async getFee(): Promise<string> {
    return this.getRowValue("Fee");
  }

  async getBlockHeight(): Promise<string> {
    return this.getRowValue("Block");
  }

  async getInputCount(): Promise<number> {
    const inputs = this.inputsSection.locator(".btc-io-item");
    return inputs.count();
  }

  async getOutputCount(): Promise<number> {
    const outputs = this.outputsSection.locator(".btc-io-item");
    return outputs.count();
  }
}
