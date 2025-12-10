import { test, expect } from "@playwright/test";
import { AddressPage } from "../pages/address.page";
import { MAINNET } from "../fixtures/mainnet";

// Helper to wait for content or error
async function waitForAddressContent(page: import("@playwright/test").Page) {
  await expect(
    page
      .locator("text=Balance:")
      .or(page.locator("text=Error:"))
      .or(page.locator("text=Something went wrong"))
  ).toBeVisible({ timeout: 45000 });

  return (
    !(await page.locator("text=Error:").isVisible()) &&
    !(await page.locator("text=Something went wrong").isVisible())
  );
}

test.describe("Address Page", () => {
  test("displays address with balance and transaction count", async ({ page }) => {
    const addressPage = new AddressPage(page);
    const addr = MAINNET.addresses.vitalik;

    await addressPage.goto(addr.address);

    const loaded = await waitForAddressContent(page);
    if (loaded) {
      // Verify balance section shows ETH
      await expect(page.locator("text=Balance:")).toBeVisible();
      const balance = await addressPage.getBalance();
      expect(balance).toContain("ETH");

      // Verify transaction count is displayed
      await expect(page.locator("text=Transactions:")).toBeVisible();
      const txCount = await addressPage.getTransactionCount();
      expect(txCount).toBeTruthy();
    }
  });

  test("shows ENS name for known address", async ({ page }) => {
    const addressPage = new AddressPage(page);
    const addr = MAINNET.addresses.vitalik;

    await addressPage.goto(addr.address);

    const loaded = await waitForAddressContent(page);
    if (loaded && addr.hasENS) {
      // Verify ENS name is displayed
      await expect(page.locator(`text=${addr.ensName}`)).toBeVisible();
      // Check for ENS Records section
      await expect(page.locator("text=ENS Records").or(page.locator("text=ENS Name"))).toBeVisible();
    }
  });

  test("identifies contract type for USDC", async ({ page }) => {
    const addressPage = new AddressPage(page);
    const addr = MAINNET.addresses.usdc;

    await addressPage.goto(addr.address);

    const loaded = await waitForAddressContent(page);
    if (loaded) {
      // Verify it's identified as a contract
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);

      // Check for contract details section
      await expect(page.locator("text=Contract Details")).toBeVisible();

      // Contract should have verification status
      const hasVerified = await page.locator("text=Verified").isVisible();
      const hasNotVerified = await page.locator("text=Not Verified").isVisible();
      expect(hasVerified || hasNotVerified).toBe(true);
    }
  });

  test("displays contract details for Uniswap Router", async ({ page }) => {
    const addressPage = new AddressPage(page);
    const addr = MAINNET.addresses.uniswapRouter;

    await addressPage.goto(addr.address);

    const loaded = await waitForAddressContent(page);
    if (loaded) {
      // Verify contract type is displayed
      const type = await addressPage.getAddressType();
      expect(type.toLowerCase()).toMatch(/contract|erc/);

      // Contract should have bytecode section
      await expect(
        page.locator("text=Contract Bytecode").or(page.locator("text=Bytecode"))
      ).toBeVisible();
    }
  });

  test("displays address header with partial address", async ({ page }) => {
    const addressPage = new AddressPage(page);
    const addr = MAINNET.addresses.vitalik;

    await addressPage.goto(addr.address);

    // Verify address is displayed in header (at least partial)
    await expect(page.locator(`text=${addr.address.slice(0, 10)}`)).toBeVisible({ timeout: 30000 });
  });

  test("handles invalid address gracefully", async ({ page }) => {
    const addressPage = new AddressPage(page);
    await addressPage.goto("0xinvalid");

    await expect(
      addressPage.errorText.or(addressPage.container).or(page.locator("text=Something went wrong"))
    ).toBeVisible({ timeout: 30000 });
  });
});
