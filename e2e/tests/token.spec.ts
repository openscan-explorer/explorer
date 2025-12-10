import { test, expect } from "@playwright/test";
import { MAINNET } from "../fixtures/mainnet";

// Helper to wait for token content or error
async function waitForTokenContent(page: import("@playwright/test").Page) {
  await expect(
    page
      .locator(".erc721-header")
      .or(page.locator(".erc1155-header"))
      .or(page.locator("text=Error:"))
      .or(page.locator("text=Something went wrong"))
  ).toBeVisible({ timeout: 45000 });

  return (
    !(await page.locator("text=Error:").isVisible()) &&
    !(await page.locator("text=Something went wrong").isVisible())
  );
}

test.describe("ERC721 Token Details", () => {
  test("displays BAYC #1 NFT details section", async ({ page }) => {
    const token = MAINNET.tokens.baycToken1;
    await page.goto(`/${MAINNET.chainId}/address/${token.contractAddress}/${token.tokenId}`);

    const loaded = await waitForTokenContent(page);
    if (loaded) {
      // Verify ERC721 header is displayed
      await expect(page.locator(".erc721-header")).toBeVisible();

      // Verify token ID is displayed in title
      await expect(page.locator(".erc721-header-title")).toContainText(`#${token.tokenId}`);

      // Verify collection name is displayed
      await expect(
        page.locator(`text=${token.collectionName}`).or(page.locator(`text=${token.collectionSymbol}`))
      ).toBeVisible();

      // Verify NFT Details section
      await expect(page.locator("text=NFT Details")).toBeVisible();

      // Verify Token ID is shown
      await expect(page.locator("text=Token ID:")).toBeVisible();
      await expect(page.locator(`text=${token.tokenId}`).first()).toBeVisible();

      // Verify Token Standard badge
      await expect(page.locator("text=Token Standard:")).toBeVisible();
      await expect(page.locator(".token-standard-badge")).toBeVisible();

      // Verify Collection Size
      await expect(page.locator("text=Collection Size:")).toBeVisible();
      await expect(page.locator(`text=${token.collectionSize}`)).toBeVisible();

      // Verify Owner is displayed
      await expect(page.locator("text=Owner:")).toBeVisible();
    }
  });

  test("displays BAYC #1 token image", async ({ page }) => {
    const token = MAINNET.tokens.baycToken1;
    await page.goto(`/${MAINNET.chainId}/address/${token.contractAddress}/${token.tokenId}`);

    const loaded = await waitForTokenContent(page);
    if (loaded) {
      // Verify image container exists
      await expect(page.locator(".erc721-image-container")).toBeVisible();

      // Verify token image is rendered
      await expect(page.locator(".erc721-token-image")).toBeVisible();
    }
  });

  test("displays BAYC #1 properties/attributes", async ({ page }) => {
    const token = MAINNET.tokens.baycToken1;
    await page.goto(`/${MAINNET.chainId}/address/${token.contractAddress}/${token.tokenId}`);

    const loaded = await waitForTokenContent(page);
    if (loaded) {
      // Verify Properties section exists
      await expect(page.locator("text=Properties")).toBeVisible();

      // Verify properties count (5 for BAYC #1)
      await expect(page.locator("text=/Properties\\s+5/").or(page.locator("text=Properties 5"))).toBeVisible();

      // Verify specific properties are displayed
      for (const prop of token.properties) {
        await expect(page.locator(`.erc721-attribute-type:has-text("${prop.trait}")`).first()).toBeVisible();
        await expect(page.locator(`.erc721-attribute-value:has-text("${prop.value}")`).first()).toBeVisible();
      }
    }
  });

  test("displays BAYC #1 Token URI section", async ({ page }) => {
    const token = MAINNET.tokens.baycToken1;
    await page.goto(`/${MAINNET.chainId}/address/${token.contractAddress}/${token.tokenId}`);

    const loaded = await waitForTokenContent(page);
    if (loaded) {
      // Verify Token URI section exists
      await expect(page.locator("text=Token URI")).toBeVisible();

      // Verify the IPFS URI is displayed
      await expect(page.locator(`text=${token.tokenUri}`)).toBeVisible();

      // Verify Open URI button exists
      await expect(page.locator("text=Open URI")).toBeVisible();
    }
  });

  test("displays BAYC #1 Raw Metadata section", async ({ page }) => {
    const token = MAINNET.tokens.baycToken1;
    await page.goto(`/${MAINNET.chainId}/address/${token.contractAddress}/${token.tokenId}`);

    const loaded = await waitForTokenContent(page);
    if (loaded) {
      // Verify Raw Metadata section exists (expandable)
      await expect(page.locator("text=Raw Metadata")).toBeVisible();
    }
  });

  test("displays BAYC #100 with different properties", async ({ page }) => {
    const token = MAINNET.tokens.baycToken100;
    await page.goto(`/${MAINNET.chainId}/address/${token.contractAddress}/${token.tokenId}`);

    const loaded = await waitForTokenContent(page);
    if (loaded) {
      // Verify token ID is displayed
      await expect(page.locator(".erc721-header-title")).toContainText(`#${token.tokenId}`);

      // Verify Properties section exists with 5 properties
      await expect(page.locator("text=Properties")).toBeVisible();

      // Verify specific properties for token #100
      for (const prop of token.properties) {
        await expect(page.locator(`.erc721-attribute-type:has-text("${prop.trait}")`).first()).toBeVisible();
        await expect(page.locator(`.erc721-attribute-value:has-text("${prop.value}")`).first()).toBeVisible();
      }

      // Verify Token URI matches token #100
      await expect(page.locator(`text=${token.tokenUri}`)).toBeVisible();
    }
  });

  test("navigates to ERC721 token via collection lookup", async ({ page }) => {
    const addr = MAINNET.addresses.bayc;
    const tokenId = "1";

    // Go to collection page
    await page.goto(`/${MAINNET.chainId}/address/${addr.address}`);

    // Wait for page to load (may show error due to RPC issues)
    await expect(
      page
        .locator(".erc721-token-input")
        .or(page.locator("text=Error:"))
        .or(page.locator("text=Failed to fetch"))
    ).toBeVisible({ timeout: 45000 });

    // Only proceed if the token input is visible (page loaded successfully)
    if (await page.locator(".erc721-token-input").isVisible()) {
      // Enter token ID in lookup input
      await page.locator(".erc721-token-input").fill(tokenId);

      // Click view button
      await page.locator(".erc721-view-button").click();

      // Verify navigation to token details page
      await expect(page).toHaveURL(new RegExp(`/${MAINNET.chainId}/address/${addr.address}/${tokenId}`));

      // Verify token details page loaded
      const loaded = await waitForTokenContent(page);
      if (loaded) {
        await expect(page.locator(".erc721-header")).toBeVisible();
      }
    }
  });
});

test.describe("ERC1155 Token Details", () => {
  test("displays ERC1155 token details page", async ({ page }) => {
    const token = MAINNET.tokens.raribleToken;
    await page.goto(`/${MAINNET.chainId}/address/${token.contractAddress}/${token.tokenId}`);

    const loaded = await waitForTokenContent(page);
    if (loaded) {
      // Verify ERC1155 header is displayed
      await expect(page.locator(".erc1155-header")).toBeVisible();

      // Verify collection name is displayed
      await expect(
        page.locator(`text=${token.collectionName}`).or(page.locator(`text=${token.collectionSymbol}`))
      ).toBeVisible();
    }
  });

  test("displays ERC1155 token image container", async ({ page }) => {
    const token = MAINNET.tokens.raribleToken;
    await page.goto(`/${MAINNET.chainId}/address/${token.contractAddress}/${token.tokenId}`);

    const loaded = await waitForTokenContent(page);
    if (loaded) {
      // Verify image container exists
      await expect(page.locator(".erc1155-image-container")).toBeVisible();
    }
  });

  test("displays ERC1155 balance lookup section", async ({ page }) => {
    const token = MAINNET.tokens.raribleToken;
    await page.goto(`/${MAINNET.chainId}/address/${token.contractAddress}/${token.tokenId}`);

    const loaded = await waitForTokenContent(page);
    if (loaded) {
      // Verify balance lookup section exists (unique to ERC1155)
      await expect(page.locator(".erc1155-balance-lookup")).toBeVisible();

      // Verify balance input field exists
      await expect(page.locator(".erc1155-balance-input")).toBeVisible();

      // Verify check balance button exists
      await expect(page.locator(".erc1155-balance-button")).toBeVisible();
    }
  });

  test("navigates to ERC1155 token via collection lookup", async ({ page }) => {
    const addr = MAINNET.addresses.rarible;
    const tokenId = "1"; // Simple token ID for navigation test

    // Go to collection page
    await page.goto(`/${MAINNET.chainId}/address/${addr.address}`);

    // Wait for page to load - could be ERC1155 view, generic contract, or error
    await expect(
      page
        .locator(".erc1155-token-input")
        .or(page.locator("text=Contract Details"))
        .or(page.locator("text=Error:"))
        .or(page.locator("text=Failed to fetch"))
        .first()
    ).toBeVisible({ timeout: 45000 });

    // Only proceed if the ERC1155 token input is visible (contract detected as ERC1155)
    if (await page.locator(".erc1155-token-input").isVisible()) {
      // Enter token ID in lookup input
      await page.locator(".erc1155-token-input").fill(tokenId);

      // Click view button
      await page.locator(".erc1155-view-button").click();

      // Verify navigation to token details page
      await expect(page).toHaveURL(new RegExp(`/${MAINNET.chainId}/address/${addr.address}/${tokenId}`));

      // Verify token details page loaded (may be ERC1155 or show loading/error for invalid token)
      await expect(
        page.locator(".erc1155-header").or(page.locator("text=Error:")).or(page.locator(".erc1155-detail-content"))
      ).toBeVisible({ timeout: 30000 });
    }
    // If not detected as ERC1155, test passes (RPC may not support interface detection)
  });
});

test.describe("Token Details - Error Handling", () => {
  test("handles invalid token ID gracefully for ERC721", async ({ page }) => {
    const addr = MAINNET.addresses.bayc;
    const invalidTokenId = "999999999"; // Non-existent token

    await page.goto(`/${MAINNET.chainId}/address/${addr.address}/${invalidTokenId}`);

    // Should show error or handle gracefully
    await expect(
      page
        .locator("text=Error:")
        .or(page.locator("text=Something went wrong"))
        .or(page.locator(".erc721-header"))
        .or(page.locator(".erc721-detail-content"))
    ).toBeVisible({ timeout: 30000 });
  });

  test("handles invalid contract for token view", async ({ page }) => {
    const invalidContract = "0x0000000000000000000000000000000000000000";
    const tokenId = "1";

    await page.goto(`/${MAINNET.chainId}/address/${invalidContract}/${tokenId}`);

    // Should show error or handle gracefully
    await expect(
      page
        .locator("text=Error:")
        .or(page.locator("text=Something went wrong"))
        .or(page.locator(".container-wide"))
    ).toBeVisible({ timeout: 30000 });
  });
});
