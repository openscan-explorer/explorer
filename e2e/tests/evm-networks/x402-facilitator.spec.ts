import { test, expect } from "../../fixtures/test";
import { AddressPage } from "../../pages/address.page";
import { BASE } from "../../fixtures/base";
import { waitForAddressContent, DEFAULT_TIMEOUT } from "../../helpers/wait";

const CHAIN_ID = BASE.chainId;

// ============================================
// x402 FACILITATOR TESTS
// ============================================

test.describe("x402 Facilitator - Address Page", () => {
  test("detects PayAI as x402 facilitator type", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const facilitator = BASE.facilitators.payai;

    await addressPage.goto(facilitator.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      // Verify it's identified as x402 Facilitator
      const type = await addressPage.getAddressType();
      expect(type.toLowerCase()).toContain("x402");
    }
  });

  test("displays facilitator info card with name and logo", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const facilitator = BASE.facilitators.payai;

    await addressPage.goto(facilitator.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      // Facilitator Info card should be visible
      await expect(page.locator(".facilitator-info-card")).toBeVisible();

      // Name should be displayed
      await expect(page.locator(`text=${facilitator.name}`).first()).toBeVisible();

      // Logo should be present
      await expect(page.locator(".facilitator-logo")).toBeVisible();
    }
  });

  test("displays facilitator description", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const facilitator = BASE.facilitators.payai;

    await addressPage.goto(facilitator.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      await expect(page.locator(".facilitator-info-card")).toBeVisible();
      await expect(
        page.locator(`text=${facilitator.description}`).first(),
      ).toBeVisible();
    }
  });

  test("displays facilitator website link", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const facilitator = BASE.facilitators.payai;

    await addressPage.goto(facilitator.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const websiteLink = page.locator(".facilitator-link", {
        hasText: facilitator.websiteUrl,
      });
      await expect(websiteLink).toBeVisible();
      await expect(websiteLink).toHaveAttribute("href", facilitator.websiteUrl);
      await expect(websiteLink).toHaveAttribute("target", "_blank");
    }
  });

  test("displays facilitator base URL", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const facilitator = BASE.facilitators.payai;

    await addressPage.goto(facilitator.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      await expect(
        page.locator(`text=${facilitator.baseUrl}`).first(),
      ).toBeVisible();
    }
  });

  test("displays facilitator schemes and assets", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const facilitator = BASE.facilitators.payai;

    await addressPage.goto(facilitator.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      // Schemes
      await expect(
        page.locator(`text=${facilitator.schemes.join(", ")}`),
      ).toBeVisible();

      // Assets
      await expect(
        page.locator(`text=${facilitator.assets.join(", ")}`),
      ).toBeVisible();
    }
  });

  test("displays facilitator capability badges", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const facilitator = BASE.facilitators.payai;

    await addressPage.goto(facilitator.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      // PayAI supports verify, settle, supported, and list
      const badges = page.locator(".facilitator-capability-badge.supported");
      await expect(badges.first()).toBeVisible();
      expect(await badges.count()).toBeGreaterThanOrEqual(3);
    }
  });

  test("displays balance for facilitator address", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const facilitator = BASE.facilitators.payai;

    await addressPage.goto(facilitator.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Balance:")).toBeVisible();
      const balance = await addressPage.getBalance();
      expect(balance).toContain("ETH");
    }
  });

  test("displays transaction history for facilitator", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const facilitator = BASE.facilitators.payai;

    await addressPage.goto(facilitator.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      // Transaction history section should be present
      await expect(
        page
          .locator("text=Transaction History")
          .or(page.locator("text=Transactions:"))
          .first(),
      ).toBeVisible();
    }
  });

  test("detects Kobaru as x402 facilitator type", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const facilitator = BASE.facilitators.kobaru;

    await addressPage.goto(facilitator.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const type = await addressPage.getAddressType();
      expect(type.toLowerCase()).toContain("x402");

      // Facilitator Info card should be visible with correct name
      await expect(page.locator(".facilitator-info-card")).toBeVisible();
      await expect(
        page.locator(`text=${facilitator.name}`).first(),
      ).toBeVisible();
    }
  });

  test("displays contract details when facilitator has code", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const facilitator = BASE.facilitators.payai;

    await addressPage.goto(facilitator.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      // If the facilitator has contract code, Contract Details should be shown
      const hasContractDetails = await page
        .locator("text=Contract Details")
        .isVisible({ timeout: DEFAULT_TIMEOUT });
      if (hasContractDetails) {
        await expect(page.locator("text=Contract Details")).toBeVisible();
        await expect(
          page
            .locator("text=Contract Bytecode")
            .or(page.locator("text=Bytecode")),
        ).toBeVisible();
      }
    }
  });
});
