import { test, expect } from "../../fixtures/test";
import { AddressPage } from "../../pages/address.page";
import { DEFAULT_TIMEOUT } from "../../helpers/wait";

test.describe("Address Page - RPCIndicator", () => {
  test("displays address page with RPCIndicator badge always visible", async ({ page }) => {
    const addressPage = new AddressPage(page);

    // Use Vitalik's address as a test address
    await addressPage.goto("1", "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");

    // Wait for loader to disappear
    await expect(addressPage.loader).toBeHidden({ timeout: DEFAULT_TIMEOUT * 3 });

    // Verify header structure
    await expect(addressPage.addressHeader).toBeVisible();

    // CRITICAL: Verify RPC Indicator badge is ALWAYS visible
    await expect(addressPage.rpcIndicator).toBeVisible();
    await expect(addressPage.rpcBadge).toBeVisible();

    // Verify RPC badge shows strategy
    const badgeText = await addressPage.getRPCBadgeText();
    expect(badgeText).toMatch(/Fallback|Parallel/);

    // Verify address details are present
    await expect(addressPage.addressDetails).toBeVisible();
  });

  test("RPCIndicator badge is visible for contract addresses", async ({ page }) => {
    const addressPage = new AddressPage(page);

    // Use USDC contract address
    await addressPage.goto("1", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");

    await expect(addressPage.loader).toBeHidden({ timeout: DEFAULT_TIMEOUT * 3 });

    // RPC Indicator should always be present
    await expect(addressPage.rpcIndicator).toBeVisible();
    await expect(addressPage.rpcBadge).toBeVisible();

    // Badge should be clickable
    const badgeText = await addressPage.getRPCBadgeText();
    expect(badgeText.length).toBeGreaterThan(0);
  });

  test("RPCIndicator badge is visible for EOA addresses", async ({ page }) => {
    const addressPage = new AddressPage(page);

    // Use a regular EOA address
    await addressPage.goto("1", "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");

    await expect(addressPage.loader).toBeHidden({ timeout: DEFAULT_TIMEOUT * 3 });

    // RPC Indicator should always be present
    await expect(addressPage.rpcIndicator).toBeVisible();
    await expect(addressPage.rpcBadge).toBeVisible();
  });

  test("RPCIndicator badge is visible for ERC20 token addresses", async ({ page }) => {
    const addressPage = new AddressPage(page);

    // Use USDT contract address (ERC20)
    await addressPage.goto("1", "0xdAC17F958D2ee523a2206206994597C13D831ec7");

    await expect(addressPage.loader).toBeHidden({ timeout: DEFAULT_TIMEOUT * 3 });

    // RPC Indicator should always be present
    await expect(addressPage.rpcIndicator).toBeVisible();
    await expect(addressPage.rpcBadge).toBeVisible();

    // Verify address type indicator is also visible
    const addressTypeLabel = page.locator(".address-type-label");
    await expect(addressTypeLabel).toBeVisible();
  });

  test("RPCIndicator has proper styling in address header", async ({ page }) => {
    const addressPage = new AddressPage(page);

    await addressPage.goto("1", "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");

    await expect(addressPage.loader).toBeHidden({ timeout: DEFAULT_TIMEOUT * 3 });

    // Verify RPC indicator is part of header
    const indicator = addressPage.rpcIndicator;
    await expect(indicator).toBeVisible();

    // Verify badge is visible and has text
    await expect(addressPage.rpcBadge).toBeVisible();
    const badgeText = await addressPage.getRPCBadgeText();
    expect(badgeText.length).toBeGreaterThan(0);

    // Verify header has proper structure
    const header = addressPage.addressHeader;
    await expect(header).toBeVisible();

    // Check that indicator is within header bounds
    const headerBox = await header.boundingBox();
    const indicatorBox = await indicator.boundingBox();

    expect(headerBox).not.toBeNull();
    expect(indicatorBox).not.toBeNull();

    // Indicator should be within header bounds
    if (headerBox && indicatorBox) {
      expect(indicatorBox.x + indicatorBox.width).toBeLessThanOrEqual(
        headerBox.x + headerBox.width + 1,
      ); // +1 for rounding
    }
  });

  test("handles loading state correctly with RPCIndicator", async ({ page }) => {
    const addressPage = new AddressPage(page);

    // Start navigation
    const navigation = addressPage.goto("1", "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");

    // Loader should be visible initially
    await expect(addressPage.loader).toBeVisible({ timeout: 5000 });

    // Wait for navigation to complete
    await navigation;

    // Loader should eventually disappear
    await expect(addressPage.loader).toBeHidden({ timeout: DEFAULT_TIMEOUT * 3 });

    // Content should be visible
    await expect(addressPage.addressHeader).toBeVisible();
    await expect(addressPage.rpcIndicator).toBeVisible();
    await expect(addressPage.addressDetails).toBeVisible();
  });

  test("RPCIndicator persists across different address types", async ({ page }) => {
    const addressPage = new AddressPage(page);

    // Test EOA
    await addressPage.goto("1", "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
    await expect(addressPage.loader).toBeHidden({ timeout: DEFAULT_TIMEOUT * 3 });
    await expect(addressPage.rpcIndicator).toBeVisible();
    const eoaBadgeText = await addressPage.getRPCBadgeText();

    // Navigate to contract
    await addressPage.goto("1", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
    await expect(addressPage.loader).toBeHidden({ timeout: DEFAULT_TIMEOUT * 3 });
    await expect(addressPage.rpcIndicator).toBeVisible();
    const contractBadgeText = await addressPage.getRPCBadgeText();

    // Badge text should be consistent (same strategy)
    expect(contractBadgeText).toBe(eoaBadgeText);
  });

  test("uses block-display-card structure with consistent margins", async ({ page }) => {
    const addressPage = new AddressPage(page);

    await addressPage.goto("1", "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");

    await expect(addressPage.loader).toBeHidden({ timeout: DEFAULT_TIMEOUT * 3 });

    // Verify container structure
    await expect(addressPage.container).toBeVisible();

    // Check for block-display-card class
    const blockDisplayCard = page.locator(".block-display-card");
    await expect(blockDisplayCard).toBeVisible();

    // Verify address-header is inside block-display-card
    const headerInCard = blockDisplayCard.locator(".address-header");
    await expect(headerInCard).toBeVisible();
  });

  test("address header displays address type and ENS name when available", async ({ page }) => {
    const addressPage = new AddressPage(page);

    // Use Vitalik's address which has an ENS name
    await addressPage.goto("1", "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");

    await expect(addressPage.loader).toBeHidden({ timeout: DEFAULT_TIMEOUT * 3 });

    // Verify address type indicator
    const addressTypeIndicator = page.locator(".address-type-indicator");
    await expect(addressTypeIndicator).toBeVisible();

    // Verify address type icon and label
    const addressTypeIcon = page.locator(".address-type-icon");
    const addressTypeLabel = page.locator(".address-type-label");
    await expect(addressTypeIcon).toBeVisible();
    await expect(addressTypeLabel).toBeVisible();

    // RPC indicator should be visible alongside
    await expect(addressPage.rpcIndicator).toBeVisible();
  });

  test("handles ENS name resolution with RPCIndicator visible", async ({ page }) => {
    const addressPage = new AddressPage(page);

    // Use an ENS name
    await addressPage.gotoWithENS("1", "vitalik.eth");

    // Wait for ENS resolution and page load
    await expect(addressPage.loader).toBeHidden({ timeout: DEFAULT_TIMEOUT * 4 });

    // RPC Indicator should be visible after ENS resolution
    await expect(addressPage.rpcIndicator).toBeVisible();
    await expect(addressPage.rpcBadge).toBeVisible();

    // ENS name should be displayed
    const ensNameDisplay = page.locator(".address-ens-name");
    await expect(ensNameDisplay).toBeVisible();
  });
});
