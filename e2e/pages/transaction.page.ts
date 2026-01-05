import type { Locator, Page } from "@playwright/test";
import { DEFAULT_TIMEOUT } from "../helpers/wait";

export class TransactionPage {
  readonly page: Page;
  readonly container: Locator;
  readonly txHash: Locator;
  readonly txLabel: Locator;
  readonly statusBadge: Locator;
  readonly txDetails: Locator;
  readonly loader: Locator;
  readonly errorText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator(".container-wide");
    this.txHash = page.locator(".header-subtitle");
    this.txLabel = page.locator(".block-label");
    this.statusBadge = page.locator('[class*="status-badge"]');
    this.txDetails = page.locator(".tx-details");
    this.loader = page.locator(".loader-container");
    this.errorText = page.locator(".text-error, .error-text");
  }

  async goto(txHash: string, chainId = "1") {
    await this.page.goto(`/${chainId}/tx/${txHash}`);
  }

  async waitForLoad() {
    await this.loader.waitFor({ state: "hidden", timeout: DEFAULT_TIMEOUT * 3 });
  }

  async getStatus(): Promise<"success" | "failed"> {
    const badge = await this.statusBadge.getAttribute("class");
    return badge?.includes("success") ? "success" : "failed";
  }

  async getRowValue(label: string): Promise<string> {
    const row = this.txDetails.locator(".tx-row", { hasText: label });
    return (await row.locator(".tx-value").textContent()) ?? "";
  }

  async getFromAddress(): Promise<string> {
    return this.getRowValue("From");
  }

  async getToAddress(): Promise<string> {
    return this.getRowValue("To");
  }

  async getValue(): Promise<string> {
    return this.getRowValue("Value");
  }

  async getGas(): Promise<string> {
    return this.getRowValue("Gas");
  }

  async getBlockNumber(): Promise<string> {
    return this.getRowValue("Block");
  }

  async getGasUsed(): Promise<string> {
    return this.getRowValue("Gas Used");
  }
}
