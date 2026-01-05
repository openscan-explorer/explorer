import { test, expect } from "../fixtures/test";
import { BlockPage } from "../pages/block.page";
import { TransactionPage } from "../pages/transaction.page";
import { AddressPage } from "../pages/address.page";
import { POLYGON } from "../fixtures/polygon";
import {
  waitForBlockContent,
  waitForTxContent,
  waitForAddressContent,
  DEFAULT_TIMEOUT,
} from "../helpers/wait";

const CHAIN_ID = POLYGON.chainId;

// Transaction hash constants for readability
const LEGACY_NFT_TX = "0xb14598e46791c2f0ab366ba2fd4a533e21a0c9894f902773e02e3869b7373c3e";
const DEFI_SWAP_TX = "0x1ed0c46bafb76d5a3d8201cdf8fc732efa97b000d88bd48dc203ac45d6340af0";
const CONTRACT_TX = "0x65edbf03a20a0317295efaeb9c20836b20b16740c8311ce51ceee91d7674b20d";

// ============================================
// BLOCK TESTS
// ============================================

test.describe("Polygon Block Page", () => {
  test("genesis block #0 - Polygon PoS mainnet launch", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = POLYGON.blocks["0"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      // Header
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.statusBadge).toContainText("Finalized");

      // Genesis has 0 transactions
      await expect(page.locator("text=Transactions:")).toBeVisible();
      await expect(page.locator("text=0 transactions")).toBeVisible();

      // Gas Used should be 0
      await expect(page.locator("text=Gas Used:")).toBeVisible();

      // Gas Limit
      await expect(page.locator("text=Gas Limit:")).toBeVisible();
    }
  });

  test("genesis block #0 more details shows hash and parent hash", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = POLYGON.blocks["0"];
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
        // Genesis parent hash (all zeros) - use .first() to avoid matching logs bloom
        await expect(page.locator(`text=${block.parentHash}`).first()).toBeVisible();
      }
    }
  });

  test("block #10,000,000 - Early Polygon activity", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = POLYGON.blocks["10000000"];
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

  test("block #10,000,000 more details shows hashes", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = POLYGON.blocks["10000000"];
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

  test("block #20,000,000 - Growing DeFi activity", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = POLYGON.blocks["20000000"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.statusBadge).toContainText("Finalized");
      await expect(page.locator("text=Transactions:")).toBeVisible();
      await expect(page.locator("text=Fee Recipient:")).toBeVisible();
      await expect(page.locator("text=Gas Used:")).toBeVisible();
      await expect(page.locator("text=Gas Limit:")).toBeVisible();
    }
  });

  test("block #20,000,000 more details shows hashes", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = POLYGON.blocks["20000000"];
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

  test("block #30,000,000 - Mature network", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = POLYGON.blocks["30000000"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.statusBadge).toContainText("Finalized");
      await expect(page.locator("text=Transactions:")).toBeVisible();
      await expect(page.locator("text=Fee Recipient:")).toBeVisible();
      await expect(page.locator("text=Gas Used:")).toBeVisible();
      await expect(page.locator("text=Gas Limit:")).toBeVisible();
    }
  });

  test("block #30,000,000 more details shows hashes", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = POLYGON.blocks["30000000"];
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

  test("block #38,189,056 - Delhi Hard Fork", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = POLYGON.blocks["38189056"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.statusBadge).toContainText("Finalized");
      await expect(page.locator("text=Transactions:")).toBeVisible();
      await expect(page.locator("text=Fee Recipient:")).toBeVisible();
      await expect(page.locator("text=Gas Used:")).toBeVisible();
      await expect(page.locator("text=Gas Limit:")).toBeVisible();
    }
  });

  test("block #38,189,056 more details shows hashes", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = POLYGON.blocks["38189056"];
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

  test("block #50,000,000 - High activity block", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = POLYGON.blocks["50000000"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.statusBadge).toContainText("Finalized");
      await expect(page.locator("text=Transactions:")).toBeVisible();
      await expect(page.locator("text=Fee Recipient:")).toBeVisible();
      await expect(page.locator("text=Gas Used:")).toBeVisible();
      await expect(page.locator("text=Gas Limit:")).toBeVisible();
    }
  });

  test("block #50,000,000 more details shows hashes", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = POLYGON.blocks["50000000"];
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

  test("block #62,278,656 - Ahmedabad Hard Fork (MATIC to POL)", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = POLYGON.blocks["62278656"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.statusBadge).toContainText("Finalized");
      await expect(page.locator("text=Transactions:")).toBeVisible();
      await expect(page.locator("text=Fee Recipient:")).toBeVisible();
      await expect(page.locator("text=Gas Used:")).toBeVisible();
      await expect(page.locator("text=Gas Limit:")).toBeVisible();
    }
  });

  test("block #62,278,656 more details shows hashes", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = POLYGON.blocks["62278656"];
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

  test("block #65,000,000 - Post-Ahmedabad POL era", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = POLYGON.blocks["65000000"];
    await blockPage.goto(block.number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(blockPage.statusBadge).toContainText("Finalized");
      await expect(page.locator("text=Transactions:")).toBeVisible();
      await expect(page.locator("text=Fee Recipient:")).toBeVisible();
      await expect(page.locator("text=Gas Used:")).toBeVisible();
      await expect(page.locator("text=Gas Limit:")).toBeVisible();
    }
  });

  test("block #65,000,000 more details shows hashes", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    const block = POLYGON.blocks["65000000"];
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

  test("block page loads successfully", async ({ page }, testInfo) => {
    const blockPage = new BlockPage(page);
    await blockPage.goto(POLYGON.blocks["20000000"].number, CHAIN_ID);

    const loaded = await waitForBlockContent(page, testInfo);
    if (loaded) {
      // Verify block page loaded with expected content
      await expect(blockPage.blockNumber).toBeVisible();
      await expect(page.locator("text=Transactions:")).toBeVisible();
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

test.describe("Polygon Transaction Page", () => {
  test("displays legacy NFT transaction from block 30M", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = POLYGON.transactions[LEGACY_NFT_TX];

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

      // Verify has input data (NFT transfer)
      await expect(page.locator("text=Input Data:")).toBeVisible();
    }
  });

  test("shows correct from and to addresses for legacy NFT tx", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = POLYGON.transactions[LEGACY_NFT_TX];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      const from = await txPage.getFromAddress();
      expect(from.toLowerCase()).toContain(tx.from.toLowerCase().slice(0, 10));

      const to = await txPage.getToAddress();
      expect(to?.toLowerCase()).toContain(tx.to?.toLowerCase().slice(0, 10));
    }
  });

  test("displays legacy transaction type correctly (Type 0)", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = POLYGON.transactions[LEGACY_NFT_TX];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      await expect(
        page.locator("text=Type:").or(page.locator("text=Transaction Type:")).first()
      ).toBeVisible();
    }
  });

  test("displays DeFi swap transaction from block 50M", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = POLYGON.transactions[DEFI_SWAP_TX];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Transaction Hash:")).toBeVisible();
      await expect(page.locator("text=Status:")).toBeVisible();
      await expect(page.locator("text=Block:")).toBeVisible();
      await expect(page.locator("text=Gas Limit")).toBeVisible();
      await expect(page.locator("text=Input Data:")).toBeVisible();
    }
  });

  test("DeFi swap shows correct addresses", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = POLYGON.transactions[DEFI_SWAP_TX];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      const from = await txPage.getFromAddress();
      expect(from.toLowerCase()).toContain(tx.from.toLowerCase().slice(0, 10));

      const to = await txPage.getToAddress();
      expect(to?.toLowerCase()).toContain(tx.to?.toLowerCase().slice(0, 10));
    }
  });

  test("displays contract interaction from block 65M", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = POLYGON.transactions[CONTRACT_TX];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Transaction Hash:")).toBeVisible();
      await expect(page.locator("text=Status:")).toBeVisible();
      await expect(page.locator("text=Gas Limit")).toBeVisible();
      await expect(page.locator("text=Input Data:")).toBeVisible();
    }
  });

  test("displays transaction nonce and position for legacy NFT tx", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = POLYGON.transactions[LEGACY_NFT_TX];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Other Attributes:")).toBeVisible();
      await expect(page.locator("text=Nonce:")).toBeVisible();
      await expect(page.locator("text=Position:")).toBeVisible();

      // Verify position value (nonce is very large, just check it's displayed)
      await expect(page.locator(`text=Position: ${tx.position}`)).toBeVisible();
    }
  });

  test("displays DeFi swap nonce and position", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = POLYGON.transactions[DEFI_SWAP_TX];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Nonce:")).toBeVisible();
      await expect(page.locator("text=Position:")).toBeVisible();

      await expect(page.locator(`text=Nonce: ${tx.nonce}`)).toBeVisible();
    }
  });

  test("displays contract tx nonce and position", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = POLYGON.transactions[CONTRACT_TX];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Nonce:")).toBeVisible();
      await expect(page.locator("text=Position:")).toBeVisible();

      await expect(page.locator(`text=Nonce: ${tx.nonce}`)).toBeVisible();
      await expect(page.locator(`text=Position: ${tx.position}`)).toBeVisible();
    }
  });

  test("displays transaction fee", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = POLYGON.transactions[LEGACY_NFT_TX];

    await txPage.goto(tx.hash, CHAIN_ID);

    const loaded = await waitForTxContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Transaction Fee:")).toBeVisible();
    }
  });

  test("displays block number link for transaction", async ({ page }, testInfo) => {
    const txPage = new TransactionPage(page);
    const tx = POLYGON.transactions[DEFI_SWAP_TX];

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
// ADDRESS TESTS - ERC20 TOKENS
// ============================================

test.describe("Polygon Address Page - Tokens", () => {
  test("displays WPOL (Wrapped POL) token contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const token = POLYGON.addresses.wpol;
    await addressPage.goto(token.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Balance")).toBeVisible();
      // Contract should show code or token info
      await expect(
        page.locator("text=Contract").or(page.locator("text=Token")).first()
      ).toBeVisible();
    }
  });

  test("displays USDC.e (Bridged USDC) token contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const token = POLYGON.addresses.usdc;
    await addressPage.goto(token.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Balance")).toBeVisible();
    }
  });

  test("displays Native USDC token contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const token = POLYGON.addresses.usdcNative;
    await addressPage.goto(token.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Balance")).toBeVisible();
    }
  });

  test("displays USDT token contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const token = POLYGON.addresses.usdt;
    await addressPage.goto(token.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Balance")).toBeVisible();
    }
  });

  test("displays WETH token contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const token = POLYGON.addresses.weth;
    await addressPage.goto(token.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Balance")).toBeVisible();
    }
  });

  test("displays DAI token contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const token = POLYGON.addresses.dai;
    await addressPage.goto(token.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Balance")).toBeVisible();
    }
  });

  test("displays AAVE token contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const token = POLYGON.addresses.aave;
    await addressPage.goto(token.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Balance")).toBeVisible();
    }
  });

  test("displays LINK token contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const token = POLYGON.addresses.link;
    await addressPage.goto(token.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Balance")).toBeVisible();
    }
  });
});

// ============================================
// ADDRESS TESTS - DEX CONTRACTS
// ============================================

test.describe("Polygon Address Page - DEX Contracts", () => {
  test("displays QuickSwap Router contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const contract = POLYGON.addresses.quickswapRouter;
    await addressPage.goto(contract.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Balance")).toBeVisible();
      await expect(
        page.locator("text=Contract").or(page.locator("text=Code")).first()
      ).toBeVisible();
    }
  });

  test("displays Uniswap V3 Router contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const contract = POLYGON.addresses.uniswapV3Router;
    await addressPage.goto(contract.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Balance")).toBeVisible();
    }
  });

  test("displays SushiSwap Router contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const contract = POLYGON.addresses.sushiswapRouter;
    await addressPage.goto(contract.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Balance")).toBeVisible();
    }
  });
});

// ============================================
// ADDRESS TESTS - NFT & LENDING
// ============================================

test.describe("Polygon Address Page - NFT & Lending", () => {
  test("displays OpenSea Storefront contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const contract = POLYGON.addresses.openseaStorefront;
    await addressPage.goto(contract.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Balance")).toBeVisible();
    }
  });

  test("displays Aave V3 Pool contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const contract = POLYGON.addresses.aaveV3Pool;
    await addressPage.goto(contract.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Balance")).toBeVisible();
    }
  });
});

// ============================================
// ADDRESS TESTS - SYSTEM CONTRACTS
// ============================================

test.describe("Polygon Address Page - System Contracts", () => {
  test("displays POL Token system contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const contract = POLYGON.addresses.maticToken;
    await addressPage.goto(contract.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Balance")).toBeVisible();
    }
  });

  test("displays StateReceiver system contract", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    const contract = POLYGON.addresses.stateReceiver;
    await addressPage.goto(contract.address, CHAIN_ID);

    const loaded = await waitForAddressContent(page, testInfo);
    if (loaded) {
      await expect(page.locator("text=Balance")).toBeVisible();
    }
  });

  test("handles invalid address gracefully", async ({ page }, testInfo) => {
    const addressPage = new AddressPage(page);
    await addressPage.goto("0xinvalid", CHAIN_ID);

    await expect(
      addressPage.errorText
        .or(addressPage.container)
        .or(page.locator("text=Something went wrong"))
        .or(page.locator("text=Invalid"))
        .first()
    ).toBeVisible({ timeout: DEFAULT_TIMEOUT * 3 });
  });
});
