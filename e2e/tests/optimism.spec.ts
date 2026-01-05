import { test, expect } from "../fixtures/test";
import { BlockPage } from "../pages/block.page";
import { AddressPage } from "../pages/address.page";
import { TransactionPage } from "../pages/transaction.page";
import { OPTIMISM } from "../fixtures/optimism";
import {
  waitForBlockContent,
  waitForTxContent,
  waitForAddressContent,
  DEFAULT_TIMEOUT,
} from "../helpers/wait";

const CHAIN_ID = OPTIMISM.chainId;

// Transaction hash constants for readability
const VELODROME_SWAP = "0xa8d73ea0639f39157f787a29591b36fc73c19b443bbe8416d8d6f24858063910";
const OP_TRANSFER = "0xdcf7c4afb479cd47f7ce263cbbb298f559b81fc592cc07737935a6166fb90f0c";
const SYSTEM_TX = "0x5d3522dad0d0745b59e9443733f8423548f99856c00768aba9779ae288dedd0a";

// ============================================
// BLOCK TESTS
// ============================================

test.describe("Optimism - Block Page", () => {
  test("genesis block #0 - Optimism mainnet (post-regenesis)", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = OPTIMISM.blocks["0"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      // Header section
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.timestampAge).toBeVisible();

      // Genesis block has 8,893 transactions from state migration
      await expect(page.locator("text=Transactions:")).toBeVisible();

      // Gas Used should be 0
      await expect(page.locator("text=Gas Used:")).toBeVisible();

      // Gas Limit
      await expect(page.locator("text=Gas Limit:")).toBeVisible();
      await expect(page.locator(`text=${block.gasLimit}`)).toBeVisible();
    }
  });

  test("block #100,000,000 - pre-Bedrock block with gas details", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = OPTIMISM.blocks["100000000"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      // Header
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.statusBadge).toContainText("Finalized");

      // Transaction count
      await expect(page.locator("text=Transactions:")).toBeVisible();
      await expect(page.locator(`text=${block.txCount} transaction`)).toBeVisible();

      // Gas Used
      await expect(page.locator("text=Gas Used:")).toBeVisible();
      await expect(page.locator(`text=${block.gasUsed}`)).toBeVisible();

      // Gas Limit
      await expect(page.locator("text=Gas Limit:")).toBeVisible();
      await expect(page.locator(`text=${block.gasLimit}`)).toBeVisible();
    }
  });

  test("block #100,000,000 more details section shows correct hashes", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = OPTIMISM.blocks["100000000"];
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

        // Block hash
        await expect(page.locator(`text=${block.hash}`)).toBeVisible();
        // Parent hash
        await expect(page.locator(`text=${block.parentHash}`)).toBeVisible();
      }
    }
  });

  test("block #110,000,000 - post-Bedrock with complete gas details", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = OPTIMISM.blocks["110000000"];
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

      // Base Fee Per Gas (post-Bedrock)
      await expect(page.locator("text=Base Fee Per Gas:")).toBeVisible();

      // Fee Recipient (SequencerFeeVault)
      await expect(page.locator("text=Fee Recipient:")).toBeVisible();
      const feeRecipient = await blockPage.getFeeRecipient();
      expect(feeRecipient.toLowerCase()).toContain(block.feeRecipientPartial.toLowerCase());
    }
  });

  test("block #110,000,000 more details shows hashes", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = OPTIMISM.blocks["110000000"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      const showMoreBtn = page.locator("text=Show More Details");
      if (await showMoreBtn.isVisible()) {
        await showMoreBtn.click();
        await expect(page.locator("text=Hide More Details")).toBeVisible();

        await expect(page.locator(`text=${block.hash}`)).toBeVisible();
        await expect(page.locator(`text=${block.parentHash}`)).toBeVisible();
      }
    }
  });

  test("block #120,000,000 - post-Ecotone (EIP-4844) high utilization", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = OPTIMISM.blocks["120000000"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      await expect(blockPage.blockNumber).toBeVisible();

      // Should have many transactions (21)
      await expect(page.locator("text=Transactions:")).toBeVisible();
      await expect(page.locator(`text=${block.txCount} transactions in this block`)).toBeVisible();

      // Gas details - high utilization block (91.9%)
      await expect(page.locator("text=Gas Used:")).toBeVisible();
      await expect(page.locator(`text=${block.gasUsed}`)).toBeVisible();

      await expect(page.locator("text=Gas Limit:")).toBeVisible();
      await expect(page.locator(`text=${block.gasLimit}`)).toBeVisible();

      // Base Fee Per Gas
      await expect(page.locator("text=Base Fee Per Gas:")).toBeVisible();

      // Fee Recipient
      await expect(page.locator("text=Fee Recipient:")).toBeVisible();
      const feeRecipient = await blockPage.getFeeRecipient();
      expect(feeRecipient.toLowerCase()).toContain(block.feeRecipientPartial.toLowerCase());
    }
  });

  test("block #120,000,000 more details shows hashes", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = OPTIMISM.blocks["120000000"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      const showMoreBtn = page.locator("text=Show More Details");
      if (await showMoreBtn.isVisible()) {
        await showMoreBtn.click();
        await expect(page.locator("text=Hide More Details")).toBeVisible();

        await expect(page.locator(`text=${block.hash}`)).toBeVisible();
        await expect(page.locator(`text=${block.parentHash}`)).toBeVisible();
      }
    }
  });

  test("block #130,000,000 - post-Holocene with increased gas limit (60M)", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = OPTIMISM.blocks["130000000"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      await expect(blockPage.blockNumber).toBeVisible();

      // Transaction count
      await expect(page.locator("text=Transactions:")).toBeVisible();
      await expect(page.locator(`text=${block.txCount} transactions in this block`)).toBeVisible();

      // Gas Used
      await expect(page.locator("text=Gas Used:")).toBeVisible();
      await expect(page.locator(`text=${block.gasUsed}`)).toBeVisible();

      // Gas Limit - increased post-Holocene (60M)
      await expect(page.locator("text=Gas Limit:")).toBeVisible();
      await expect(page.locator(`text=${block.gasLimit}`)).toBeVisible();

      // Base Fee Per Gas
      await expect(page.locator("text=Base Fee Per Gas:")).toBeVisible();

      // Fee Recipient
      await expect(page.locator("text=Fee Recipient:")).toBeVisible();
      const feeRecipient = await blockPage.getFeeRecipient();
      expect(feeRecipient.toLowerCase()).toContain(block.feeRecipientPartial.toLowerCase());
    }
  });

  test("block #130,000,000 more details shows hashes", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = OPTIMISM.blocks["130000000"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      const showMoreBtn = page.locator("text=Show More Details");
      if (await showMoreBtn.isVisible()) {
        await showMoreBtn.click();
        await expect(page.locator("text=Hide More Details")).toBeVisible();

        await expect(page.locator(`text=${block.hash}`)).toBeVisible();
        await expect(page.locator(`text=${block.parentHash}`)).toBeVisible();
      }
    }
  });

  test("genesis block more details section shows correct hash", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = OPTIMISM.blocks["0"];
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
        // Genesis parent hash (all zeros) - use first() as it appears in multiple places
        await expect(page.locator(`text=${block.parentHash}`).first()).toBeVisible();
      }
    }
  });

  test("block navigation buttons work on Optimism", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    await blockPage.goto(OPTIMISM.blocks["110000000"].number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      await expect(blockPage.navPrevBtn).toBeVisible();
      await expect(blockPage.navNextBtn).toBeVisible();
    }
  });

  test("handles invalid block number gracefully", async ({ page }, testInfo) => {
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

test.describe("Optimism - Transaction Page", () => {
  test("displays Velodrome DEX swap (Legacy Type 0) with all details", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = OPTIMISM.transactions[VELODROME_SWAP];

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
      await expect(page.getByText("Gas Price:", { exact: true })).toBeVisible();
    }
  });

  test("shows correct from and to addresses for Velodrome swap", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = OPTIMISM.transactions[VELODROME_SWAP];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      const from = await txPage.getFromAddress();
      expect(from.toLowerCase()).toContain(tx.from.toLowerCase().slice(0, 10));

      const to = await txPage.getToAddress();
      expect(to?.toLowerCase()).toContain(tx.to?.toLowerCase().slice(0, 10));
    }
  });

  test("displays transaction fee for Velodrome swap", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = OPTIMISM.transactions[VELODROME_SWAP];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      // Verify transaction fee is displayed
      await expect(page.locator("text=Transaction Fee:")).toBeVisible();
    }
  });

  test("displays Velodrome swap nonce and position", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = OPTIMISM.transactions[VELODROME_SWAP];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Other Attributes:")).toBeVisible();
      await expect(page.locator("text=Nonce:")).toBeVisible();
      await expect(page.locator("text=Position:")).toBeVisible();

      // Verify nonce value is displayed (use locator that includes the label)
      await expect(page.locator(`text=Nonce: ${tx.nonce}`)).toBeVisible();
    }
  });

  test("displays OP token transfer transaction (EIP-1559 Type 2)", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = OPTIMISM.transactions[OP_TRANSFER];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Transaction Hash:")).toBeVisible();
      await expect(page.locator("text=Status:")).toBeVisible();
      await expect(page.locator("text=From:")).toBeVisible();
      await expect(page.locator("text=To:")).toBeVisible();

      // To address should be OP token contract
      const to = await txPage.getToAddress();
      expect(to?.toLowerCase()).toContain(tx.to?.toLowerCase().slice(0, 10));
    }
  });

  test("OP transfer shows correct addresses and gas details", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = OPTIMISM.transactions[OP_TRANSFER];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      const from = await txPage.getFromAddress();
      expect(from.toLowerCase()).toContain(tx.from.toLowerCase().slice(0, 10));

      const to = await txPage.getToAddress();
      expect(to?.toLowerCase()).toContain(tx.to?.toLowerCase().slice(0, 10));

      // Verify gas limit is displayed
      await expect(page.locator("text=Gas Limit")).toBeVisible();
    }
  });

  test("OP transfer shows nonce and position", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = OPTIMISM.transactions[OP_TRANSFER];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Nonce:")).toBeVisible();
      await expect(page.locator("text=Position:")).toBeVisible();

      // Verify nonce value is displayed (use locator that includes the label)
      await expect(page.locator(`text=Nonce: ${tx.nonce}`)).toBeVisible();
    }
  });

  test("displays system transaction (Type 126) - L2CrossDomainMessenger relay", async ({
    page,
  }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = OPTIMISM.transactions[SYSTEM_TX];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Transaction Hash:")).toBeVisible();
      await expect(page.locator("text=Status:")).toBeVisible();
      await expect(page.locator("text=From:")).toBeVisible();
      await expect(page.locator("text=To:")).toBeVisible();

      // To address should be L2CrossDomainMessenger
      const to = await txPage.getToAddress();
      expect(to?.toLowerCase()).toContain(tx.to?.toLowerCase().slice(0, 10));
    }
  });

  test("system transaction shows correct from address (Aliased L1 Messenger)", async ({
    page,
  }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = OPTIMISM.transactions[SYSTEM_TX];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      const from = await txPage.getFromAddress();
      expect(from.toLowerCase()).toContain(tx.from.toLowerCase().slice(0, 10));
    }
  });

  test("displays transaction with input data", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = OPTIMISM.transactions[VELODROME_SWAP];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      // Contract interaction should have input data
      await expect(page.locator("text=Input Data:")).toBeVisible();
    }
  });

  test("displays block number link for transaction", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = OPTIMISM.transactions[VELODROME_SWAP];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Block:")).toBeVisible();
      const blockValue = await txPage.getBlockNumber();
      expect(blockValue).toBeTruthy();
    }
  });

  test("handles invalid tx hash gracefully", async ({ page }, testInfo) => {
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

test.describe("Optimism - Address Page", () => {
  test("displays native USDC contract details", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = OPTIMISM.addresses.usdc;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);

      await expect(page.locator("text=Contract Details")).toBeVisible();
    }
  });

  test("displays bridged USDC.e contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = OPTIMISM.addresses.usdce;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays WETH predeploy contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = OPTIMISM.addresses.weth;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays OP governance token contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = OPTIMISM.addresses.op;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays USDT contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = OPTIMISM.addresses.usdt;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays DAI contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = OPTIMISM.addresses.dai;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays Velodrome Router contract with details", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = OPTIMISM.addresses.velodromeRouter;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);

      await expect(page.locator("text=Contract Details").first()).toBeVisible();
    }
  });

  test("displays Velodrome Universal Router contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = OPTIMISM.addresses.velodromeUniversalRouter;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays Uniswap V3 Router contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = OPTIMISM.addresses.uniswapV3Router;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays Uniswap Universal Router contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = OPTIMISM.addresses.uniswapUniversalRouter;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays SequencerFeeVault system contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = OPTIMISM.addresses.sequencerFeeVault;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays GasPriceOracle system contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = OPTIMISM.addresses.gasPriceOracle;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays L1Block system contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = OPTIMISM.addresses.l1Block;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays L2StandardBridge contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = OPTIMISM.addresses.l2StandardBridge;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays L2CrossDomainMessenger contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = OPTIMISM.addresses.l2CrossDomainMessenger;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays L2ToL1MessagePasser contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = OPTIMISM.addresses.l2ToL1MessagePasser;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays BaseFeeVault system contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = OPTIMISM.addresses.baseFeeVault;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays L1FeeVault system contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = OPTIMISM.addresses.l1FeeVault;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });
});
