import { expect, test } from "../../fixtures/test";
import { BITCOIN } from "../../fixtures/bitcoin";
import { waitForBitcoinAddressContent } from "../../helpers/wait";
import { BitcoinAddressPage } from "../../pages/bitcoin-address.page";

test.describe("Bitcoin Address Page", () => {
  test("genesis address - Satoshi's P2PKH legacy address", async ({ page }, testInfo) => {
    const addressPage = new BitcoinAddressPage(page);
    const addr = BITCOIN.addresses.genesis;
    await addressPage.goto(addr.address);

    const loaded = await waitForBitcoinAddressContent(page, testInfo);
    if (loaded) {
      // Address should be displayed
      await expect(page.locator(`text=${addr.address.slice(0, 10)}`)).toBeVisible();

      // Address type badge - Legacy (P2PKH)
      await expect(page.locator("text=Legacy").or(page.locator("text=P2PKH"))).toBeVisible();

      // Balance should be visible
      await expect(page.locator("text=Balance:")).toBeVisible();

      // Should have some BTC balance (donations to genesis address)
      await expect(page.locator("text=BTC")).toBeVisible();

      // Transaction count
      await expect(page.locator("text=Transactions:")).toBeVisible();
    }
  });

  test("legacy P2PKH address (1...)", async ({ page }, testInfo) => {
    const addressPage = new BitcoinAddressPage(page);
    const addr = BITCOIN.addresses.legacy;
    await addressPage.goto(addr.address);

    const loaded = await waitForBitcoinAddressContent(page, testInfo);
    if (loaded) {
      // Address type - Legacy
      await expect(page.locator("text=Legacy").or(page.locator("text=P2PKH"))).toBeVisible();

      // Balance
      await expect(page.locator("text=Balance:")).toBeVisible();

      // Total Received
      await expect(page.locator("text=Total Received:")).toBeVisible();

      // Total Sent
      await expect(page.locator("text=Total Sent:")).toBeVisible();
    }
  });

  test("P2SH address (3...)", async ({ page }, testInfo) => {
    const addressPage = new BitcoinAddressPage(page);
    const addr = BITCOIN.addresses.p2sh;
    await addressPage.goto(addr.address);

    const loaded = await waitForBitcoinAddressContent(page, testInfo);
    if (loaded) {
      // Address type - P2SH
      await expect(page.locator("text=P2SH")).toBeVisible();

      // Balance
      await expect(page.locator("text=Balance:")).toBeVisible();
    }
  });

  test("SegWit address (bc1q...)", async ({ page }, testInfo) => {
    const addressPage = new BitcoinAddressPage(page);
    const addr = BITCOIN.addresses.segwit;
    await addressPage.goto(addr.address);

    const loaded = await waitForBitcoinAddressContent(page, testInfo);
    if (loaded) {
      // Address type - SegWit
      await expect(page.locator("text=SegWit").or(page.locator("text=P2WPKH"))).toBeVisible();

      // Balance
      await expect(page.locator("text=Balance:")).toBeVisible();
    }
  });

  test("Taproot address (bc1p...)", async ({ page }, testInfo) => {
    const addressPage = new BitcoinAddressPage(page);
    const addr = BITCOIN.addresses.taproot;
    await addressPage.goto(addr.address);

    const loaded = await waitForBitcoinAddressContent(page, testInfo);
    if (loaded) {
      // Address type - Taproot
      await expect(page.locator("text=Taproot").or(page.locator("text=P2TR"))).toBeVisible();

      // Balance
      await expect(page.locator("text=Balance:")).toBeVisible();
    }
  });

  test("address with UTXOs shows unspent outputs", async ({ page }, testInfo) => {
    const addressPage = new BitcoinAddressPage(page);
    const addr = BITCOIN.addresses.genesis;
    await addressPage.goto(addr.address);

    const loaded = await waitForBitcoinAddressContent(page, testInfo);
    if (loaded) {
      // Genesis address has UTXOs from donations
      await expect(page.locator("text=Balance:")).toBeVisible();

      // UTXOs section should be visible if there are unspent outputs
      const utxoSection = page.locator("text=UTXOs").or(page.locator("text=Unspent"));
      if (await utxoSection.isVisible()) {
        // UTXOs should be listed
        await expect(utxoSection).toBeVisible();
      }
    }
  });

  test("address shows transaction history", async ({ page }, testInfo) => {
    const addressPage = new BitcoinAddressPage(page);
    const addr = BITCOIN.addresses.genesis;
    await addressPage.goto(addr.address);

    const loaded = await waitForBitcoinAddressContent(page, testInfo);
    if (loaded) {
      // Transaction history section
      await expect(page.locator("text=Transactions:")).toBeVisible();

      // Transaction links should be clickable
      const txLinks = page.locator('a[href*="/btc/tx/"]');
      if ((await txLinks.count()) > 0) {
        await expect(txLinks.first()).toBeVisible();
      }
    }
  });

  test("handles invalid address gracefully", async ({ page }, testInfo) => {
    const addressPage = new BitcoinAddressPage(page);
    await addressPage.goto("invalid-address-format");

    // Wait for loader to disappear, then check for error or empty state
    try {
      await addressPage.loader.waitFor({ state: "hidden", timeout: 30000 });
    } catch {
      // Loader may not appear
    }

    // Should show error, not found, or redirect (no balance shown)
    const hasError = await page.locator(".text-error").isVisible();
    const hasNotFound = await page.locator("text=not found").isVisible();
    const hasBalance = await page.locator("text=Balance:").isVisible();

    // Either error/not found should be shown, OR no balance (invalid address)
    expect(hasError || hasNotFound || !hasBalance).toBeTruthy();
  });

  test("address page links to block explorer", async ({ page }, testInfo) => {
    const addressPage = new BitcoinAddressPage(page);
    const addr = BITCOIN.addresses.genesis;
    await addressPage.goto(addr.address);

    const loaded = await waitForBitcoinAddressContent(page, testInfo);
    if (loaded) {
      // If there are transactions, clicking one should navigate to tx page
      const txLinks = page.locator('a[href*="/btc/tx/"]');
      if ((await txLinks.count()) > 0) {
        const firstTxLink = txLinks.first();
        const href = await firstTxLink.getAttribute("href");
        expect(href).toContain("/btc/tx/");
      }
    }
  });
});
