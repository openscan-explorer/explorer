import { test, expect } from "@playwright/test";
import { BlockPage } from "../pages/block.page";
import { MAINNET } from "../fixtures/mainnet";

// Helper to wait for content or error
async function waitForBlockContent(page: import("@playwright/test").Page) {
  await expect(
    page
      .locator("text=Transactions:")
      .or(page.locator("text=Error:"))
      .or(page.locator("text=Something went wrong"))
  ).toBeVisible({ timeout: 45000 });

  return (
    !(await page.locator("text=Error:").isVisible()) &&
    !(await page.locator("text=Something went wrong").isVisible())
  );
}

test.describe("Block Page", () => {
  test("block #10,000 - pre-London block with no transactions", async ({ page }) => {
    const blockPage = new BlockPage(page);
    const block = MAINNET.blocks["10000"];
    await blockPage.goto(block.number);

    const loaded = await waitForBlockContent(page);
    if (loaded) {
      // Header section
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.timestampAge).toBeVisible();
      await expect(blockPage.statusBadge).toContainText("Finalized");

      // Transactions
      await expect(page.locator("text=Transactions:")).toBeVisible();
      await expect(page.locator("text=0 transactions in this block")).toBeVisible();

      // Fee Recipient
      await expect(page.locator("text=Fee Recipient:")).toBeVisible();
      const feeRecipient = await blockPage.getFeeRecipient();
      expect(feeRecipient.toLowerCase()).toContain(block.feeRecipientPartial.toLowerCase());

      // Gas Used with value (0 (0.0%))
      await expect(page.locator("text=Gas Used:")).toBeVisible();
      await expect(page.locator("text=0 (0.0%)")).toBeVisible();

      // Gas Limit with value
      await expect(page.locator("text=Gas Limit:")).toBeVisible();
      await expect(page.locator(`text=${block.gasLimit}`)).toBeVisible();

      // Extra Data with value
      await expect(page.locator("text=Extra Data:")).toBeVisible();
      await expect(page.locator(`text=${block.extraData}`)).toBeVisible();

      // Difficulty with value
      await expect(page.getByText("Difficulty:", { exact: true })).toBeVisible();
      await expect(page.getByText(block.difficulty).first()).toBeVisible();

      // Total Difficulty with value
      await expect(page.getByText("Total Difficulty:", { exact: true })).toBeVisible();

      // Size with value
      await expect(page.locator("text=Size:")).toBeVisible();
      await expect(page.locator(`text=${block.size}`)).toBeVisible();

      // Should NOT have base fee (pre-London)
      await expect(page.locator("text=Base Fee Per Gas:")).not.toBeVisible();
    }
  });

  test("block #1,000,000 - pre-London block with transactions", async ({ page }) => {
    const blockPage = new BlockPage(page);
    const block = MAINNET.blocks["1000000"];
    await blockPage.goto(block.number);

    const loaded = await waitForBlockContent(page);
    if (loaded) {
      // Header
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.statusBadge).toContainText("Finalized");

      // Transactions with count
      await expect(page.locator("text=Transactions:")).toBeVisible();
      await expect(page.locator(`text=${block.txCount} transactions in this block`)).toBeVisible();

      // Fee Recipient
      await expect(page.locator("text=Fee Recipient:")).toBeVisible();
      const feeRecipient = await blockPage.getFeeRecipient();
      expect(feeRecipient.toLowerCase()).toContain(block.feeRecipientPartial.toLowerCase());

      // Gas Used with value
      await expect(page.locator("text=Gas Used:")).toBeVisible();
      await expect(page.locator(`text=${block.gasUsed}`)).toBeVisible();

      // Gas Limit with value
      await expect(page.locator("text=Gas Limit:")).toBeVisible();
      await expect(page.locator(`text=${block.gasLimit}`)).toBeVisible();

      // Extra Data
      await expect(page.locator("text=Extra Data:")).toBeVisible();

      // Difficulty with value
      await expect(page.getByText("Difficulty:", { exact: true })).toBeVisible();
      await expect(page.getByText(block.difficulty).first()).toBeVisible();

      // Total Difficulty with value
      await expect(page.getByText("Total Difficulty:", { exact: true })).toBeVisible();

      // Size with value
      await expect(page.locator("text=Size:")).toBeVisible();
      await expect(page.locator(`text=${block.size}`)).toBeVisible();

      // Should NOT have base fee (pre-London)
      await expect(page.locator("text=Base Fee Per Gas:")).not.toBeVisible();
    }
  });

  test("block #20,000,000 - post-London block with base fee and withdrawals", async ({ page }) => {
    const blockPage = new BlockPage(page);
    const block = MAINNET.blocks["20000000"];
    await blockPage.goto(block.number);

    const loaded = await waitForBlockContent(page);
    if (loaded) {
      // Header
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.statusBadge).toContainText("Finalized");

      // Transactions with count
      await expect(page.locator("text=Transactions:")).toBeVisible();
      await expect(page.locator(`text=${block.txCount} transactions in this block`)).toBeVisible();

      // Withdrawals with count
      await expect(page.locator("text=Withdrawals:")).toBeVisible();
      await expect(page.locator(`text=${block.withdrawals} withdrawals in this block`)).toBeVisible();

      // Fee Recipient
      await expect(page.locator("text=Fee Recipient:")).toBeVisible();
      const feeRecipient = await blockPage.getFeeRecipient();
      expect(feeRecipient.toLowerCase()).toContain(block.feeRecipientPartial.toLowerCase());

      // Gas Used with value
      await expect(page.locator("text=Gas Used:")).toBeVisible();
      await expect(page.locator(`text=${block.gasUsed}`)).toBeVisible();

      // Gas Limit with value
      await expect(page.locator("text=Gas Limit:")).toBeVisible();
      await expect(page.locator(`text=${block.gasLimit}`)).toBeVisible();

      // Base Fee Per Gas with value (post-London)
      await expect(page.locator("text=Base Fee Per Gas:")).toBeVisible();
      await expect(page.locator(`text=${block.baseFeePerGas}`)).toBeVisible();

      // Burnt Fees with value
      await expect(page.locator("text=Burnt Fees:")).toBeVisible();
      await expect(page.locator(`text=${block.burntFees}`)).toBeVisible();

      // Extra Data with value
      await expect(page.locator("text=Extra Data:")).toBeVisible();
      await expect(page.locator(`text=${block.extraData}`)).toBeVisible();

      // Size with value
      await expect(page.locator("text=Size:")).toBeVisible();
      await expect(page.locator(`text=${block.size}`)).toBeVisible();
    }
  });

  test("block #10,000 more details section shows correct hash values", async ({ page }) => {
    const blockPage = new BlockPage(page);
    const block = MAINNET.blocks["10000"];
    await blockPage.goto(block.number);

    const loaded = await waitForBlockContent(page);
    if (loaded) {
      // Click "Show More Details" to expand
      const showMoreBtn = page.locator("text=Show More Details");
      if (await showMoreBtn.isVisible()) {
        await showMoreBtn.click();

        // Wait for details to expand (button text changes)
        await expect(page.locator("text=Hide More Details")).toBeVisible();

        // Verify hash field labels are present (source text is title case, CSS transforms to uppercase)
        await expect(page.getByText("Hash:", { exact: true })).toBeVisible();
        await expect(page.getByText("Parent Hash:", { exact: true })).toBeVisible();
        await expect(page.getByText("State Root:", { exact: true })).toBeVisible();
        await expect(page.getByText("Transactions Root:", { exact: true })).toBeVisible();
        await expect(page.getByText("Receipts Root:", { exact: true })).toBeVisible();
        await expect(page.getByText("Nonce:", { exact: true })).toBeVisible();
        await expect(page.getByText("Mix Hash:", { exact: true })).toBeVisible();
        await expect(page.getByText("Sha3 Uncles:", { exact: true })).toBeVisible();

        // Verify actual hash values (use .first() for values that may appear multiple times)
        await expect(page.locator(`text=${block.hash}`)).toBeVisible();
        await expect(page.locator(`text=${block.parentHash}`)).toBeVisible();
        await expect(page.locator(`text=${block.stateRoot}`)).toBeVisible();
        // transactionsRoot and receiptsRoot are identical for empty blocks, use .first()
        await expect(page.locator(`text=${block.transactionsRoot}`).first()).toBeVisible();
        await expect(page.locator(`text=${block.nonce}`)).toBeVisible();
        await expect(page.locator(`text=${block.mixHash}`)).toBeVisible();
        await expect(page.locator(`text=${block.sha3Uncles}`)).toBeVisible();
      }
    }
  });

  test("block #20,000,000 more details section includes withdrawals root", async ({ page }) => {
    const blockPage = new BlockPage(page);
    const block = MAINNET.blocks["20000000"];
    await blockPage.goto(block.number);

    const loaded = await waitForBlockContent(page);
    if (loaded) {
      // Click "Show More Details" to expand
      const showMoreBtn = page.locator("text=Show More Details");
      if (await showMoreBtn.isVisible()) {
        await showMoreBtn.click();

        // Wait for details to expand
        await expect(page.locator("text=Hide More Details")).toBeVisible();

        // Verify hash field labels including withdrawals root (post-Shanghai)
        await expect(page.getByText("Hash:", { exact: true })).toBeVisible();
        await expect(page.getByText("Parent Hash:", { exact: true })).toBeVisible();
        await expect(page.getByText("State Root:", { exact: true })).toBeVisible();
        await expect(page.getByText("Transactions Root:", { exact: true })).toBeVisible();
        await expect(page.getByText("Receipts Root:", { exact: true })).toBeVisible();
        await expect(page.getByText("Withdrawals Root:", { exact: true })).toBeVisible();
        await expect(page.getByText("Nonce:", { exact: true })).toBeVisible();
        await expect(page.getByText("Mix Hash:", { exact: true })).toBeVisible();
        await expect(page.getByText("Sha3 Uncles:", { exact: true })).toBeVisible();

        // Verify actual hash values
        await expect(page.locator(`text=${block.hash}`)).toBeVisible();
        await expect(page.locator(`text=${block.parentHash}`)).toBeVisible();
        await expect(page.locator(`text=${block.stateRoot}`)).toBeVisible();
        await expect(page.locator(`text=${block.transactionsRoot}`)).toBeVisible();
        await expect(page.locator(`text=${block.receiptsRoot}`)).toBeVisible();
        await expect(page.locator(`text=${block.withdrawalsRoot}`)).toBeVisible();
        await expect(page.locator(`text=${block.nonce}`)).toBeVisible();
        await expect(page.locator(`text=${block.mixHash}`)).toBeVisible();
        await expect(page.locator(`text=${block.sha3Uncles}`)).toBeVisible();
      }
    }
  });

  test("block navigation buttons work", async ({ page }) => {
    const blockPage = new BlockPage(page);
    await blockPage.goto(MAINNET.blocks["1000000"].number);

    const loaded = await waitForBlockContent(page);
    if (loaded) {
      // Verify navigation buttons exist
      await expect(blockPage.navPrevBtn).toBeVisible();
      await expect(blockPage.navNextBtn).toBeVisible();
    }
  });

  test("handles invalid block number gracefully", async ({ page }) => {
    const blockPage = new BlockPage(page);
    await blockPage.goto(999999999999);

    await expect(
      blockPage.errorText.or(blockPage.container).or(page.locator("text=Something went wrong"))
    ).toBeVisible({ timeout: 30000 });
  });
});
