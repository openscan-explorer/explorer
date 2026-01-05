import { test, expect } from "../fixtures/test";
import { BlockPage } from "../pages/block.page";
import { TransactionPage } from "../pages/transaction.page";
import { AddressPage } from "../pages/address.page";
import { BSC } from "../fixtures/bsc";
import {
  waitForBlockContent,
  waitForTxContent,
  waitForAddressContent,
  DEFAULT_TIMEOUT,
} from "../helpers/wait";

const CHAIN_ID = BSC.chainId;

// Transaction hash constants for readability
const BLOCK_20M_TX = "0xad5c9b13688627d670985d68a5be0fadd5f0e34d3ff20e35c655ef4bceec7e7c";
const DEX_SWAP_TX = "0x0e3384ad2350d20921190b15e29305ed08eecfe97de975b6e015a6c6d476a90a";
const DEX_AGGREGATOR_TX = "0x874a90a47bc3140adbffff0f4b89da4bea48f9420f97bc5a50e2e478d9a06176";

// ============================================
// BLOCK TESTS
// ============================================

test.describe("BSC Block Page", () => {
  test("genesis block #0 - BSC mainnet launch", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = BSC.blocks["0"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      // Header section
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.timestampAge).toBeVisible();
      await expect(blockPage.statusBadge).toContainText("Finalized");

      // Transactions - genesis has 0 transactions
      await expect(page.locator("text=Transactions:")).toBeVisible();
      await expect(page.locator("text=0 transactions in this block")).toBeVisible();

      // Gas Used (0 for genesis)
      await expect(page.locator("text=Gas Used:")).toBeVisible();
      await expect(page.locator("text=0 (0.0%)")).toBeVisible();

      // Gas Limit
      await expect(page.locator("text=Gas Limit:")).toBeVisible();
    }
  });

  test("genesis block #0 more details shows hash and parent hash", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = BSC.blocks["0"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      // Click "Show More Details" to expand
      const showMoreBtn = page.locator("text=Show More Details");
      if (await showMoreBtn.isVisible()) {
        await showMoreBtn.click();

        // Wait for details to expand
        await expect(page.locator("text=Hide More Details")).toBeVisible();

        // Verify hash field labels
        await expect(page.getByText("Hash:", { exact: true })).toBeVisible();
        await expect(page.getByText("Parent Hash:", { exact: true })).toBeVisible();

        // Verify hash values
        await expect(page.locator(`text=${block.hash}`)).toBeVisible();
        // Parent hash is all zeros for genesis - use .first() to avoid matching logs bloom
        await expect(page.locator(`text=${block.parentHash}`).first()).toBeVisible();
      }
    }
  });

  test("block #10,000,000 - Pre-Euler block with transactions", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = BSC.blocks["10000000"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      // Header
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.statusBadge).toContainText("Finalized");

      // Transactions with count
      await expect(page.locator("text=Transactions:")).toBeVisible();

      // Fee Recipient (validator)
      await expect(page.locator("text=Fee Recipient:")).toBeVisible();

      // Gas Used
      await expect(page.locator("text=Gas Used:")).toBeVisible();

      // Gas Limit
      await expect(page.locator("text=Gas Limit:")).toBeVisible();
    }
  });

  test("block #10,000,000 more details shows hashes", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = BSC.blocks["10000000"];
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

  test("block #20,000,000 - Post-Euler block with gas details", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = BSC.blocks["20000000"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      // Header
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.statusBadge).toContainText("Finalized");

      // Transaction count
      await expect(page.locator("text=Transactions:")).toBeVisible();

      // Fee Recipient (validator)
      await expect(page.locator("text=Fee Recipient:")).toBeVisible();

      // Gas Used
      await expect(page.locator("text=Gas Used:")).toBeVisible();

      // Gas Limit
      await expect(page.locator("text=Gas Limit:")).toBeVisible();
    }
  });

  test("block #20,000,000 more details shows hashes", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = BSC.blocks["20000000"];
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

  test("block #30,000,000 - Post-Luban with fast finality", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = BSC.blocks["30000000"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      // Header
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.statusBadge).toContainText("Finalized");

      // Transactions
      await expect(page.locator("text=Transactions:")).toBeVisible();

      // Fee Recipient (validator)
      await expect(page.locator("text=Fee Recipient:")).toBeVisible();

      // Gas Used
      await expect(page.locator("text=Gas Used:")).toBeVisible();

      // Gas Limit
      await expect(page.locator("text=Gas Limit:")).toBeVisible();
    }
  });

  test("block #30,000,000 more details shows hashes", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = BSC.blocks["30000000"];
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

  test("block #40,000,000 - Post-Feynman after BNB Chain Fusion", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = BSC.blocks["40000000"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      // Header
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.statusBadge).toContainText("Finalized");

      // Transaction count
      await expect(page.locator("text=Transactions:")).toBeVisible();

      // Fee Recipient (validator)
      await expect(page.locator("text=Fee Recipient:")).toBeVisible();

      // Gas Used
      await expect(page.locator("text=Gas Used:")).toBeVisible();

      // Gas Limit
      await expect(page.locator("text=Gas Limit:")).toBeVisible();
    }
  });

  test("block #40,000,000 more details shows hashes", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = BSC.blocks["40000000"];
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

  test("block #50,000,000 - Post-Maxwell with 0.75s block time", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = BSC.blocks["50000000"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      // Header
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.statusBadge).toContainText("Finalized");

      // Transaction count
      await expect(page.locator("text=Transactions:")).toBeVisible();

      // Fee Recipient (validator)
      await expect(page.locator("text=Fee Recipient:")).toBeVisible();

      // Gas Used
      await expect(page.locator("text=Gas Used:")).toBeVisible();

      // Gas Limit
      await expect(page.locator("text=Gas Limit:")).toBeVisible();
    }
  });

  test("block #50,000,000 more details shows hashes", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = BSC.blocks["50000000"];
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

  test("block navigation buttons work", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    await blockPage.goto(BSC.blocks["10000000"].number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      // Verify navigation buttons exist
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

test.describe("BSC Transaction Page", () => {
  test("displays transaction from block 20M with all details", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = BSC.transactions[BLOCK_20M_TX];

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
      await expect(page.getByText("Gas Price:", { exact: true })).toBeVisible();
      await expect(page.locator("text=Gas Limit")).toBeVisible();

      // Verify has input data (contract interaction)
      await expect(page.locator("text=Input Data:")).toBeVisible();
    }
  });

  test("shows correct from and to addresses for block 20M tx", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = BSC.transactions[BLOCK_20M_TX];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      // Verify from address
      const from = await txPage.getFromAddress();
      expect(from.toLowerCase()).toContain(tx.from.toLowerCase().slice(0, 10));

      // Verify to address
      const to = await txPage.getToAddress();
      expect(to?.toLowerCase()).toContain(tx.to?.toLowerCase().slice(0, 10));
    }
  });

  test("displays legacy transaction type correctly (Type 0)", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = BSC.transactions[BLOCK_20M_TX];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      // Legacy transaction should show Transaction Type with value 0 or "Legacy"
      // Check for "Type:" which is how the UI displays it
      await expect(
        page.locator("text=Type:").or(page.locator("text=Transaction Type:")).first()
      ).toBeVisible();
    }
  });

  test("displays DEX swap transaction from block 40M", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = BSC.transactions[DEX_SWAP_TX];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      // Verify core transaction details
      await expect(page.locator("text=Transaction Hash:")).toBeVisible();
      await expect(page.locator("text=Status:")).toBeVisible();
      await expect(page.locator("text=Block:")).toBeVisible();

      // Verify gas information
      await expect(page.locator("text=Gas Limit")).toBeVisible();

      // Verify has input data (DEX swap)
      await expect(page.locator("text=Input Data:")).toBeVisible();
    }
  });

  test("DEX swap shows correct addresses and gas details", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = BSC.transactions[DEX_SWAP_TX];

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

  test("displays DEX aggregator transaction from block 50M", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = BSC.transactions[DEX_AGGREGATOR_TX];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      // Verify core transaction details
      await expect(page.locator("text=Transaction Hash:")).toBeVisible();
      await expect(page.locator("text=Status:")).toBeVisible();

      // Verify gas information
      await expect(page.locator("text=Gas Limit")).toBeVisible();

      // Verify has input data (contract interaction)
      await expect(page.locator("text=Input Data:")).toBeVisible();
    }
  });

  test("displays transaction nonce and position for block 20M tx", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = BSC.transactions[BLOCK_20M_TX];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      // Verify other attributes section
      await expect(page.locator("text=Other Attributes:")).toBeVisible();
      await expect(page.locator("text=Nonce:")).toBeVisible();
      await expect(page.locator("text=Position:")).toBeVisible();

      // Verify nonce value (use label to avoid strict mode issues)
      await expect(page.locator(`text=Nonce: ${tx.nonce}`)).toBeVisible();
    }
  });

  test("displays DEX swap nonce and position", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = BSC.transactions[DEX_SWAP_TX];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Nonce:")).toBeVisible();
      await expect(page.locator("text=Position:")).toBeVisible();

      // Verify nonce value
      await expect(page.locator(`text=Nonce: ${tx.nonce}`)).toBeVisible();
    }
  });

  test("displays DEX aggregator nonce and position", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = BSC.transactions[DEX_AGGREGATOR_TX];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Nonce:")).toBeVisible();
      await expect(page.locator("text=Position:")).toBeVisible();

      // Verify nonce value
      await expect(page.locator(`text=Nonce: ${tx.nonce}`)).toBeVisible();

      // Verify position value
      await expect(page.locator(`text=Position: ${tx.position}`)).toBeVisible();
    }
  });

  test("displays transaction fee", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = BSC.transactions[BLOCK_20M_TX];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      // Verify transaction fee is displayed
      await expect(page.locator("text=Transaction Fee:")).toBeVisible();
    }
  });

  test("displays block number link for transaction", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = BSC.transactions[DEX_SWAP_TX];

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
// ADDRESS TESTS - BEP20 TOKENS
// ============================================

test.describe("BSC Address Page - Tokens", () => {
  test("displays WBNB token contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BSC.addresses.wbnb;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      // Verify it's identified as a contract
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);

      // Verify contract has balance section
      await expect(
        page.locator("text=Contract Balance:").or(page.locator("text=Balance:"))
      ).toBeVisible();
    }
  });

  test("displays USDT (BSC-USD) token contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BSC.addresses.usdt;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      // Verify it's identified as a contract
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays BUSD token contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BSC.addresses.busd;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      // Verify it's identified as a contract
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays CAKE (PancakeSwap Token) contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BSC.addresses.cake;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      // Verify it's identified as a contract
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays USDC token contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BSC.addresses.usdc;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      // Verify it's identified as a contract
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });

  test("displays DAI token contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BSC.addresses.dai;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      // Verify it's identified as a contract
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);
    }
  });
});

// ============================================
// ADDRESS TESTS - DEX CONTRACTS
// ============================================

test.describe("BSC Address Page - DEX Contracts", () => {
  test("displays PancakeSwap Router v2 contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BSC.addresses.pancakeswapRouterV2;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      // Verify it's identified as a contract
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);

      // Check for contract details section
      await expect(page.locator("text=Contract Details")).toBeVisible();
    }
  });

  test("displays PancakeSwap Factory v2 contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BSC.addresses.pancakeswapFactoryV2;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      // Verify it's identified as a contract
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);

      // Check for contract details section
      await expect(page.locator("text=Contract Details")).toBeVisible();
    }
  });

  test("displays PancakeSwap Universal Router contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BSC.addresses.pancakeswapUniversalRouter;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      // Verify it's identified as a contract
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);

      // Check for contract details section
      await expect(page.locator("text=Contract Details")).toBeVisible();
    }
  });
});

// ============================================
// ADDRESS TESTS - SYSTEM CONTRACTS
// ============================================

test.describe("BSC Address Page - System Contracts", () => {
  test("displays Validator Set system contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BSC.addresses.validatorSet;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      // Verify it's identified as a contract
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);

      // Verify address is displayed
      await expect(page.locator(`text=${addr.address.slice(0, 10)}`)).toBeVisible();
    }
  });

  test("displays System Reward contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BSC.addresses.systemReward;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      // Verify it's identified as a contract
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);

      // Verify address is displayed
      await expect(page.locator(`text=${addr.address.slice(0, 10)}`)).toBeVisible();
    }
  });

  test("displays Token Hub contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BSC.addresses.tokenHub;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      // Verify it's identified as a contract
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);

      // Verify address is displayed
      await expect(page.locator(`text=${addr.address.slice(0, 10)}`)).toBeVisible();
    }
  });

  test("displays Stake Hub contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BSC.addresses.stakeHub;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      // Verify it's identified as a contract
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);

      // Verify address is displayed
      await expect(page.locator(`text=${addr.address.slice(0, 10)}`)).toBeVisible();
    }
  });

  test("displays Governor contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BSC.addresses.governor;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      // Verify it's identified as a contract
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);

      // Verify address is displayed
      await expect(page.locator(`text=${addr.address.slice(0, 10)}`)).toBeVisible();
    }
  });

  test("handles invalid address gracefully", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    await addressPage.goto("0xinvalid", CHAIN_ID);

    await expect(
      addressPage.errorText
        .or(addressPage.container)
        .or(page.locator("text=Something went wrong"))
        .first()
    ).toBeVisible({ timeout: DEFAULT_TIMEOUT * 3 });
  });
});

// ============================================
// ADDRESS TESTS - STAKING CONTRACTS
// ============================================

test.describe("BSC Address Page - Staking Contracts", () => {
  test("displays PancakeSwap Main Staking contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BSC.addresses.pancakeswapStaking;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      // Verify it's identified as a contract
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);

      // Check for contract details section
      await expect(page.locator("text=Contract Details")).toBeVisible();
    }
  });

  test("displays PancakeSwap Cake Pool contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const addr = BSC.addresses.pancakeswapCakePool;

    await addressPage.goto(addr.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      // Verify it's identified as a contract
      const isContract = await addressPage.isContract();
      expect(isContract).toBe(true);

      // Check for contract details section
      await expect(page.locator("text=Contract Details")).toBeVisible();
    }
  });
});
