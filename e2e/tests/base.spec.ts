import { test, expect } from "../fixtures/test";
import { BlockPage } from "../pages/block.page";
import { AddressPage } from "../pages/address.page";
import { TransactionPage } from "../pages/transaction.page";
import { BASE } from "../fixtures/base";
import {
  waitForBlockContent,
  waitForTxContent,
  waitForAddressContent,
  DEFAULT_TIMEOUT,
} from "../helpers/wait";

const CHAIN_ID = BASE.chainId;

// Transaction hash constants for readability
const AERODROME_SWAP = "0x961cf2c57f006d8c6fdbe266b2ef201159dd135dc560155e8c16d307ee321681";
const USDC_TRANSFER = "0x6b212a5069286d710f388b948364452d28b8c33e0f39b8f50b394ff4deff1f03";

// ============================================
// BLOCK TESTS
// ============================================

test.describe("Base Network - Block Page", () => {
  test("genesis block #0 - Base mainnet launch", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = BASE.blocks["0"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      // Header section
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.timestampAge).toBeVisible();

      // Genesis block should have 0 transactions
      await expect(page.locator("text=Transactions:")).toBeVisible();
      await expect(page.locator("text=0 transactions in this block")).toBeVisible();

      // Gas Used should be 0
      await expect(page.locator("text=Gas Used:")).toBeVisible();

      // Gas Limit
      await expect(page.locator("text=Gas Limit:")).toBeVisible();
    }
  });

  test("block #1,000,000 - early Base block with gas details", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = BASE.blocks["1000000"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      // Header
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.statusBadge).toContainText("Finalized");

      // Transaction count
      await expect(page.locator("text=Transactions:")).toBeVisible();
      await expect(page.locator(`text=${block.txCount} transaction`)).toBeVisible();

      // Gas Used with percentage
      await expect(page.locator("text=Gas Used:")).toBeVisible();
      await expect(page.locator(`text=${block.gasUsed}`)).toBeVisible();

      // Gas Limit
      await expect(page.locator("text=Gas Limit:")).toBeVisible();
      await expect(page.locator(`text=${block.gasLimit}`)).toBeVisible();

      // Size
      await expect(page.locator("text=Size:")).toBeVisible();
      await expect(page.locator(`text=${block.size}`)).toBeVisible();

      // Base Fee Per Gas (Base always has EIP-1559)
      await expect(page.locator("text=Base Fee Per Gas:")).toBeVisible();

      // Fee Recipient (SequencerFeeVault)
      await expect(page.locator("text=Fee Recipient:")).toBeVisible();
      const feeRecipient = await blockPage.getFeeRecipient();
      expect(feeRecipient.toLowerCase()).toContain(block.feeRecipientPartial.toLowerCase());
    }
  });

  test("block #10,000,000 - pre-Ecotone block", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = BASE.blocks["10000000"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.statusBadge).toContainText("Finalized");

      // Transaction count
      await expect(page.locator("text=Transactions:")).toBeVisible();
      await expect(page.locator(`text=${block.txCount} transactions in this block`)).toBeVisible();

      // Gas details
      await expect(page.locator("text=Gas Used:")).toBeVisible();
      await expect(page.locator(`text=${block.gasUsed}`)).toBeVisible();

      await expect(page.locator("text=Gas Limit:")).toBeVisible();
      await expect(page.locator(`text=${block.gasLimit}`)).toBeVisible();

      // Size
      await expect(page.locator("text=Size:")).toBeVisible();
      await expect(page.locator(`text=${block.size}`)).toBeVisible();
    }
  });

  test("block #25,000,000 - post-Holocene with increased gas limit", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = BASE.blocks["25000000"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      await expect(blockPage.blockNumber).toBeVisible();

      // Should have many transactions
      await expect(page.locator("text=Transactions:")).toBeVisible();
      await expect(page.locator(`text=${block.txCount} transactions in this block`)).toBeVisible();

      // Gas details - higher gas limit post-Holocene
      await expect(page.locator("text=Gas Limit:")).toBeVisible();
      await expect(page.locator(`text=${block.gasLimit}`)).toBeVisible();

      // Size
      await expect(page.locator("text=Size:")).toBeVisible();
      await expect(page.locator(`text=${block.size}`)).toBeVisible();

      // Base Fee Per Gas
      await expect(page.locator("text=Base Fee Per Gas:")).toBeVisible();
    }
  });

  test("genesis block more details section shows correct hashes", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = BASE.blocks["0"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      const showMoreBtn = page.locator("text=Show More Details");
      if (await showMoreBtn.isVisible()) {
        await showMoreBtn.click();
        await expect(page.locator("text=Hide More Details")).toBeVisible();

        // Verify hash field labels
        await expect(page.getByText("Hash:", { exact: true })).toBeVisible();
        await expect(page.getByText("Parent Hash:", { exact: true })).toBeVisible();

        // Genesis block hash
        await expect(page.locator(`text=${block.hash}`)).toBeVisible();
        // Genesis parent hash (all zeros) - use first() as it appears in multiple places (also in logs bloom)
        await expect(page.locator(`text=${block.parentHash}`).first()).toBeVisible();
      }
    }
  });

  test("block navigation buttons work on Base", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    await blockPage.goto(BASE.blocks["1000000"].number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      await expect(blockPage.navPrevBtn).toBeVisible();
      await expect(blockPage.navNextBtn).toBeVisible();
    }
  });

  test("handles invalid block number gracefully", async ({ page }) => {
    const blockPage = new BlockPage(page);
    await blockPage.goto(999999999999, CHAIN_ID);

    await expect(
      blockPage.errorText
        .or(blockPage.container)
        .or(page.locator("text=Something went wrong"))
        .first()
    ).toBeVisible({ timeout: DEFAULT_TIMEOUT * 3 });
  });
});

// ============================================
// TRANSACTION TESTS
// ============================================

test.describe("Base Network - Transaction Page", () => {
  test("displays Aerodrome DEX swap with all details", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = BASE.transactions[AERODROME_SWAP];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      // Verify core transaction details
      await expect(page.locator("text=Transaction Hash:")).toBeVisible();
      await expect(page.locator("text=Status:")).toBeVisible();
      await expect(page.locator("text=Block:")).toBeVisible();
      await expect(page.locator("text=From:")).toBeVisible();
      await expect(page.locator("text=To:")).toBeVisible();

      // Verify gas information
      await expect(page.locator("text=Gas Limit")).toBeVisible();
    }
  });

  test("shows correct from and to addresses for swap", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = BASE.transactions[AERODROME_SWAP];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      const from = await txPage.getFromAddress();
      expect(from.toLowerCase()).toContain(tx.from.toLowerCase().slice(0, 10));

      const to = await txPage.getToAddress();
      expect(to?.toLowerCase()).toContain(tx.to?.toLowerCase().slice(0, 10));
    }
  });

  test("displays USDC transfer transaction", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = BASE.transactions[USDC_TRANSFER];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Transaction Hash:")).toBeVisible();
      await expect(page.locator("text=Status:")).toBeVisible();
      await expect(page.locator("text=From:")).toBeVisible();
      await expect(page.locator("text=To:")).toBeVisible();

      // To address should be USDC contract
      const to = await txPage.getToAddress();
      expect(to?.toLowerCase()).toContain(tx.to?.toLowerCase().slice(0, 10));
    }
  });

  test("displays transaction with input data", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = BASE.transactions[AERODROME_SWAP];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      // Contract interaction should have input data
      await expect(page.locator("text=Input Data:")).toBeVisible();
    }
  });

  test("displays other attributes section", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = BASE.transactions[AERODROME_SWAP];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Other Attributes:")).toBeVisible();
      await expect(page.locator("text=Nonce:")).toBeVisible();
      await expect(page.locator("text=Position:")).toBeVisible();
    }
  });

  test("displays block number link", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = BASE.transactions[AERODROME_SWAP];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Block:")).toBeVisible();
      const blockValue = await txPage.getBlockNumber();
      expect(blockValue).toBeTruthy();
    }
  });

  test("handles invalid tx hash gracefully", async ({ page }) => {
    const txPage = new TransactionPage(page);
    await txPage.goto("0xinvalid", CHAIN_ID);

    await expect(
      txPage.errorText
        .or(txPage.container)
        .or(page.locator("text=Something went wrong"))
        .first()
    ).toBeVisible({ timeout: DEFAULT_TIMEOUT * 3 });
  });
});

// ============================================
// ADDRESS TESTS
// ============================================

test.describe("Base Network - Address Page", () => {
  test("displays USDC contract details", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BASE.addresses.usdc;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);

      await expect(page.locator("text=Contract Details")).toBeVisible();
    }
  });

  test("displays USDbC (bridged USDC) contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BASE.addresses.usdbc;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays WETH predeploy contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BASE.addresses.weth;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays AERO token contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BASE.addresses.aero;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays Aerodrome Router contract with details", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BASE.addresses.aerodromeRouter;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);

      await expect(page.locator("text=Contract Details")).toBeVisible();
    }
  });

  test("displays SequencerFeeVault system contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BASE.addresses.sequencerFeeVault;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays GasPriceOracle system contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BASE.addresses.gasPriceOracle;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays L1Block system contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BASE.addresses.l1Block;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays L2StandardBridge contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BASE.addresses.l2StandardBridge;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays L2CrossDomainMessenger contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BASE.addresses.l2CrossDomainMessenger;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });
});
