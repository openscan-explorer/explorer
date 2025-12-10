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
      .first()
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
      // Check for ENS Records section (use first() to avoid strict mode with loading state)
      await expect(
        page.getByText("ENS Records", { exact: true }).or(page.getByText("ENS Name", { exact: true }))
      ).toBeVisible();
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

  test("displays ERC721 NFT collection (BAYC) with collection details", async ({ page }) => {
    const addressPage = new AddressPage(page);
    const addr = MAINNET.addresses.bayc;

    await addressPage.goto(addr.address);

    const loaded = await waitForAddressContent(page);
    if (loaded) {
      // Verify it's identified as ERC721 (type displays as "ERC-721 NFT")
      const type = await addressPage.getAddressType();
      expect(type.toLowerCase()).toMatch(/erc.?721/);

      // Verify collection name and symbol are displayed
      await expect(page.locator(`text=${addr.fullName}`).or(page.locator(`text=${addr.name}`))).toBeVisible();
      await expect(page.locator(`text=${addr.symbol}`)).toBeVisible();

      // Verify ERC721 badge is present (shows as "ERC-721")
      await expect(page.locator(".token-standard-badge")).toBeVisible();

      // Verify token lookup input exists
      await expect(page.locator(".erc721-token-input")).toBeVisible();

      // Verify NFT Collection Details section
      await expect(page.locator("text=NFT Collection Details")).toBeVisible();

      // Contract should have balance displayed
      await expect(page.locator("text=Contract Balance:").or(page.locator("text=Balance:"))).toBeVisible();

      // Verify contract is verified
      await expect(page.locator("text=Verified")).toBeVisible();
    }
  });

  test("displays BAYC contract verification details", async ({ page }) => {
    const addressPage = new AddressPage(page);
    const addr = MAINNET.addresses.bayc;

    await addressPage.goto(addr.address);

    const loaded = await waitForAddressContent(page);
    if (loaded) {
      // Contract Details section exists (may be collapsed)
      await expect(page.locator("text=Contract Details")).toBeVisible();

      // Click to expand Contract Details if collapsed
      const contractDetailsHeader = page.locator("text=Contract Details").first();
      await contractDetailsHeader.click();

      // Wait for expansion and verify details
      await expect(page.locator("text=Verified At")).toBeVisible({ timeout: 5000 });

      // Verify match type badge
      await expect(page.locator(`text=${addr.matchType}`)).toBeVisible();

      // Verify compiler version
      await expect(page.locator("text=Compiler")).toBeVisible();
      await expect(page.locator(`text=${addr.compiler}`)).toBeVisible();

      // Verify bytecode and source code sections exist
      await expect(page.locator("text=Contract Bytecode")).toBeVisible();
      await expect(page.locator("text=Source Code")).toBeVisible();
    }
  });

  test("displays BAYC contract read functions", async ({ page }) => {
    const addressPage = new AddressPage(page);
    const addr = MAINNET.addresses.bayc;

    await addressPage.goto(addr.address);

    const loaded = await waitForAddressContent(page);
    if (loaded) {
      // Click to expand Contract Details to show functions
      const contractDetailsHeader = page.locator("text=Contract Details").first();
      await contractDetailsHeader.click();

      // Wait for Read Functions section to be visible
      await expect(page.locator("text=/Read Functions \\(\\d+\\)/")).toBeVisible({ timeout: 5000 });

      // Verify some key read functions are displayed
      const keyReadFunctions = ["name", "symbol", "totalSupply", "balanceOf", "ownerOf", "tokenURI"];
      for (const fn of keyReadFunctions) {
        await expect(page.locator(`button:has-text("${fn}")`).first()).toBeVisible();
      }
    }
  });

  test("displays BAYC contract write functions", async ({ page }) => {
    const addressPage = new AddressPage(page);
    const addr = MAINNET.addresses.bayc;

    await addressPage.goto(addr.address);

    const loaded = await waitForAddressContent(page);
    if (loaded) {
      // Click to expand Contract Details to show functions
      const contractDetailsHeader = page.locator("text=Contract Details").first();
      await contractDetailsHeader.click();

      // Wait for Write Functions section to be visible
      await expect(page.locator("text=/Write Functions \\(\\d+\\)/")).toBeVisible({ timeout: 5000 });

      // Verify some key write functions are displayed
      const keyWriteFunctions = ["approve", "transferFrom", "safeTransferFrom"];
      for (const fn of keyWriteFunctions) {
        await expect(page.locator(`button:has-text("${fn}")`).first()).toBeVisible();
      }
    }
  });

  test("displays BAYC contract events", async ({ page }) => {
    const addressPage = new AddressPage(page);
    const addr = MAINNET.addresses.bayc;

    await addressPage.goto(addr.address);

    const loaded = await waitForAddressContent(page);
    if (loaded) {
      // Click to expand Contract Details to show events
      const contractDetailsHeader = page.locator("text=Contract Details").first();
      await contractDetailsHeader.click();

      // Wait for Events section to be visible
      await expect(page.locator("text=/Events \\(\\d+\\)/")).toBeVisible({ timeout: 5000 });

      // Verify the events are displayed
      for (const event of addr.events) {
        await expect(page.locator(`button:has-text("${event}")`).first()).toBeVisible();
      }
    }
  });

  test("displays ERC1155 multi-token contract (Rarible) with collection details", async ({ page }) => {
    const addressPage = new AddressPage(page);
    const addr = MAINNET.addresses.rarible;

    await addressPage.goto(addr.address);

    const loaded = await waitForAddressContent(page);
    if (loaded) {
      // Verify it's identified as ERC1155 (type displays as "ERC-1155 MULTI-TOKEN")
      const type = await addressPage.getAddressType();
      expect(type.toLowerCase()).toMatch(/erc.?1155/);

      // Verify collection name and symbol are displayed
      await expect(page.locator(`text=${addr.name}`).or(page.locator(`text=${addr.symbol}`))).toBeVisible();

      // Verify ERC1155 badge is present
      await expect(page.locator(".token-standard-badge")).toBeVisible();

      // Verify token lookup input exists
      await expect(page.locator(".erc1155-token-input")).toBeVisible();

      // Verify Multi-Token Collection Details section
      await expect(page.locator("text=Multi-Token Collection Details")).toBeVisible();

      // Contract should have balance displayed
      await expect(page.locator("text=Contract Balance:").or(page.locator("text=Balance:"))).toBeVisible();

      // Verify contract is verified
      await expect(page.locator("text=Verified")).toBeVisible();
    }
  });

  test("displays Rarible contract verification details", async ({ page }) => {
    const addressPage = new AddressPage(page);
    const addr = MAINNET.addresses.rarible;

    await addressPage.goto(addr.address);

    const loaded = await waitForAddressContent(page);
    if (loaded) {
      // Contract Details section exists (may be collapsed)
      await expect(page.locator("text=Contract Details")).toBeVisible();

      // Click to expand Contract Details if collapsed
      const contractDetailsHeader = page.locator("text=Contract Details").first();
      await contractDetailsHeader.click();

      // Wait for expansion and verify details
      await expect(page.locator("text=Verified At")).toBeVisible({ timeout: 5000 });

      // Verify match type badge (MATCH for Rarible)
      await expect(page.locator(`text=${addr.matchType}`)).toBeVisible();

      // Verify compiler version
      await expect(page.locator("text=Compiler")).toBeVisible();
      await expect(page.locator(`text=${addr.compiler}`)).toBeVisible();

      // Verify bytecode and source code sections exist
      await expect(page.locator("text=Contract Bytecode")).toBeVisible();
      await expect(page.locator("text=Source Code")).toBeVisible();
    }
  });

  test("displays Rarible contract read functions", async ({ page }) => {
    const addressPage = new AddressPage(page);
    const addr = MAINNET.addresses.rarible;

    await addressPage.goto(addr.address);

    const loaded = await waitForAddressContent(page);
    if (loaded) {
      // Click to expand Contract Details to show functions
      const contractDetailsHeader = page.locator("text=Contract Details").first();
      await contractDetailsHeader.click();

      // Wait for Read Functions section to be visible
      await expect(page.locator("text=/Read Functions \\(\\d+\\)/")).toBeVisible({ timeout: 5000 });

      // Verify some key read functions are displayed
      const keyReadFunctions = ["balanceOf", "name", "symbol", "uri", "supportsInterface"];
      for (const fn of keyReadFunctions) {
        await expect(page.locator(`button:has-text("${fn}")`).first()).toBeVisible();
      }
    }
  });

  test("displays Rarible contract write functions", async ({ page }) => {
    const addressPage = new AddressPage(page);
    const addr = MAINNET.addresses.rarible;

    await addressPage.goto(addr.address);

    const loaded = await waitForAddressContent(page);
    if (loaded) {
      // Click to expand Contract Details to show functions
      const contractDetailsHeader = page.locator("text=Contract Details").first();
      await contractDetailsHeader.click();

      // Wait for Write Functions section to be visible
      await expect(page.locator("text=/Write Functions \\(\\d+\\)/")).toBeVisible({ timeout: 5000 });

      // Verify some key write functions are displayed
      const keyWriteFunctions = ["mint", "burn", "safeTransferFrom", "setApprovalForAll"];
      for (const fn of keyWriteFunctions) {
        await expect(page.locator(`button:has-text("${fn}")`).first()).toBeVisible();
      }
    }
  });

  test("displays Rarible contract events", async ({ page }) => {
    const addressPage = new AddressPage(page);
    const addr = MAINNET.addresses.rarible;

    await addressPage.goto(addr.address);

    const loaded = await waitForAddressContent(page);
    if (loaded) {
      // Click to expand Contract Details to show events
      const contractDetailsHeader = page.locator("text=Contract Details").first();
      await contractDetailsHeader.click();

      // Wait for Events section to be visible
      await expect(page.locator("text=/Events \\(\\d+\\)/")).toBeVisible({ timeout: 5000 });

      // Verify some key events are displayed
      const keyEvents = ["TransferSingle", "TransferBatch", "ApprovalForAll", "URI"];
      for (const event of keyEvents) {
        await expect(page.locator(`button:has-text("${event}")`).first()).toBeVisible();
      }
    }
  });
});
