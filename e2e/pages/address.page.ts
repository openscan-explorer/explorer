import type { Locator, Page } from "@playwright/test";
import { DEFAULT_TIMEOUT } from "../helpers/wait";

export class AddressPage {
  readonly page: Page;
  readonly container: Locator;
  readonly addressType: Locator;
  readonly ensName: Locator;
  readonly balance: Locator;
  readonly txDetails: Locator;
  readonly txHistory: Locator;
  readonly loader: Locator;
  readonly errorText: Locator;
  readonly contractBytecode: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator(".container-wide");
    this.addressType = page.locator(".address-type-label");
    this.ensName = page.locator(".address-ens-name");
    this.balance = page.locator(".tx-value-highlight");
    this.txDetails = page.locator(".tx-details");
    this.txHistory = page.locator(".recent-transactions-table");
    this.loader = page.locator(".loader-container");
    this.errorText = page.locator(".text-error, .error-text");
    this.contractBytecode = page.locator(".contract-bytecode, .bytecode-container");
  }

  async goto(address: string, chainId = "1") {
    await this.page.goto(`/${chainId}/address/${address}`);
  }

  async waitForLoad() {
    await this.loader.waitFor({ state: "hidden", timeout: DEFAULT_TIMEOUT * 3 });
  }

  async getAddressType(): Promise<string> {
    return (await this.addressType.textContent()) ?? "";
  }

  async getBalance(): Promise<string> {
    return (await this.balance.textContent()) ?? "";
  }

  async hasENSName(): Promise<boolean> {
    return this.ensName.isVisible();
  }

  async getENSName(): Promise<string> {
    if (await this.ensName.isVisible()) {
      return (await this.ensName.textContent()) ?? "";
    }
    return "";
  }

  async getRowValue(label: string): Promise<string> {
    const row = this.txDetails.locator(".tx-row", { hasText: label });
    return (await row.locator(".tx-value").textContent()) ?? "";
  }

  async getTransactionCount(): Promise<string> {
    return this.getRowValue("Transactions");
  }

  async isContract(): Promise<boolean> {
    const type = await this.getAddressType();
    return type.toLowerCase().includes("contract") || type.toLowerCase().includes("erc");
  }
}
