import type { Locator, Page } from "@playwright/test";
import { DEFAULT_TIMEOUT } from "../helpers/wait";

export class BitcoinAddressPage {
  readonly page: Page;
  readonly container: Locator;
  readonly addressHeader: Locator;
  readonly addressTypeBadge: Locator;
  readonly txDetails: Locator;
  readonly loader: Locator;
  readonly errorText: Locator;
  readonly utxosSection: Locator;
  readonly transactionsSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator(".container-wide");
    this.addressHeader = page.locator(".address-header, .header-subtitle");
    this.addressTypeBadge = page.locator(".btc-address-type-badge");
    this.txDetails = page.locator(".tx-details");
    this.loader = page.locator(".loader-container");
    this.errorText = page.locator(".text-error, .error-text");
    this.utxosSection = page.locator(".btc-utxos-section");
    this.transactionsSection = page.locator(".btc-transactions-section");
  }

  async goto(address: string, networkSlug = "btc") {
    await this.page.goto(`/${networkSlug}/address/${address}`);
  }

  async waitForLoad() {
    await this.loader.waitFor({ state: "hidden", timeout: DEFAULT_TIMEOUT * 3 });
  }

  async getAddress(): Promise<string> {
    return (await this.addressHeader.textContent()) ?? "";
  }

  async getAddressType(): Promise<string> {
    return (await this.addressTypeBadge.textContent()) ?? "";
  }

  async getRowValue(label: string): Promise<string> {
    const row = this.txDetails.locator(".tx-row", { hasText: label });
    return (await row.locator(".tx-value").textContent()) ?? "";
  }

  async getBalance(): Promise<string> {
    return this.getRowValue("Balance");
  }

  async getTotalReceived(): Promise<string> {
    return this.getRowValue("Total Received");
  }

  async getTotalSent(): Promise<string> {
    return this.getRowValue("Total Sent");
  }

  async getTransactionCount(): Promise<string> {
    return this.getRowValue("Transactions");
  }

  async getUtxoCount(): Promise<number> {
    const utxos = this.utxosSection.locator(".btc-utxo-item");
    return utxos.count();
  }
}
