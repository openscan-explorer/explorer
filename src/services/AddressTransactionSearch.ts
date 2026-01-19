import type { EthereumClient } from "@openscan/network-connectors";
import type { Transaction } from "../types";
import { hexToNumber } from "./adapters/EVMAdapter/utils";

/**
 * Binary search based address transaction discovery.
 *
 * Uses the insight that nonce and balance are recorded at every block:
 * - Nonce increases with each sent tx
 * - Balance changes with sent/received txs
 *
 * By binary searching for state changes, we find "important" blocks
 * containing address activity without needing an indexer.
 *
 * Complexity: O(log(blocks) * changes) instead of O(blocks)
 */

interface AddressState {
  nonce: number;
  balance: bigint;
}

interface SearchResult {
  blocks: number[];
  transactions: Array<Transaction & { type: "sent" | "received" | "internal" }>;
  stats: {
    totalBlocks: number;
    totalTxs: number;
    sentCount: number;
    receivedCount: number;
    internalCount: number;
    rpcCalls: number;
  };
}

interface SearchProgress {
  phase: "searching" | "fetching";
  current: number;
  total: number;
}

type ProgressCallback = (progress: SearchProgress) => void;
type TransactionFoundCallback = (
  txs: Array<Transaction & { type: "sent" | "received" | "internal" }>,
) => void;

/**
 * Extract data from strategy result, handling both fallback and parallel modes
 */
function extractData<T>(data: T | T[] | null | undefined): T | null {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) return data[0] ?? null;
  return data;
}

export class AddressTransactionSearch {
  private client: EthereumClient;
  private nonceCache: Map<string, number> = new Map();
  private balanceCache: Map<string, bigint> = new Map();
  private requestDelay = 0; // ms between requests

  constructor(client: EthereumClient) {
    this.client = client;
  }

  /**
   * Delay helper to avoid rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get nonce at a specific block with caching
   */
  private async getNonce(address: string, block: number): Promise<number> {
    const key = `${address}:${block}`;
    const cached = this.nonceCache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const result = await this.client.getTransactionCount(address, `0x${block.toString(16)}`);
    const nonce = hexToNumber(extractData(result.data) || "0x0");
    this.nonceCache.set(key, nonce);
    return nonce;
  }

  /**
   * Get balance at a specific block with caching
   */
  private async getBalance(address: string, block: number): Promise<bigint> {
    const key = `${address}:${block}`;
    const cached = this.balanceCache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const result = await this.client.getBalance(address, `0x${block.toString(16)}`);
    const balance = BigInt(extractData(result.data) || "0x0");
    this.balanceCache.set(key, balance);
    return balance;
  }

  /**
   * Get both nonce and balance at a block (parallel with optional delay before)
   */
  private async getState(address: string, block: number): Promise<AddressState> {
    // Apply delay before the parallel fetch (for rate limiting if needed)
    if (this.requestDelay > 0) {
      await this.delay(this.requestDelay);
    }
    // Fetch nonce and balance in parallel
    const [nonce, balance] = await Promise.all([
      this.getNonce(address, block),
      this.getBalance(address, block),
    ]);
    return { nonce, balance };
  }

  /**
   * Clear caches (call between different address searches)
   */
  clearCache(): void {
    this.nonceCache.clear();
    this.balanceCache.clear();
  }

  /**
   * Find all blocks where an address had activity using unified binary search.
   * Checks both nonce AND balance changes in a single search.
   */
  /**
   * Fetch transactions from a block and filter by address, including receipts
   * Uses parallel receipt fetching for better performance
   * Also detects internal transactions by scanning logs for address mentions
   */
  private async fetchBlockTransactions(
    blockNum: number,
    normalizedAddress: string,
    searchForInternal = false,
  ): Promise<Array<Transaction & { type: "sent" | "received" | "internal" }>> {
    const result = await this.client.getBlockByNumber(`0x${blockNum.toString(16)}`, true);
    const block = extractData(result.data);
    if (!block || !block.transactions) return [];

    // First pass: identify direct transactions (from/to matches address)
    const directTxs: Array<{ tx: any; isSent: boolean }> = [];
    const otherTxs: Array<{ tx: any }> = [];

    for (const tx of block.transactions) {
      if (typeof tx === "string") continue;

      const txFrom = tx.from?.toLowerCase();
      const txTo = tx.to?.toLowerCase();

      const isSent = txFrom === normalizedAddress;
      const isReceived = txTo === normalizedAddress;

      if (isSent || isReceived) {
        directTxs.push({ tx, isSent });
      } else {
        otherTxs.push({ tx });
      }
    }

    // Second pass: fetch receipts for direct transactions
    const RECEIPT_BATCH_SIZE = 20;
    const receipts = new Map<string, any>();

    for (let i = 0; i < directTxs.length; i += RECEIPT_BATCH_SIZE) {
      const batch = directTxs.slice(i, i + RECEIPT_BATCH_SIZE);
      const receiptPromises = batch.map(({ tx }) =>
        this.client
          .getTransactionReceipt(tx.hash)
          .then((receiptResult) => ({
            hash: tx.hash,
            receipt: extractData(receiptResult.data),
          }))
          .catch((e) => {
            console.warn(`[TxSearch] Failed to fetch receipt for ${tx.hash}`, e);
            return { hash: tx.hash, receipt: null };
          }),
      );
      const batchResults = await Promise.all(receiptPromises);
      for (const { hash, receipt } of batchResults) {
        receipts.set(hash, receipt);
      }
    }

    // Build direct transaction results
    const transactions: Array<Transaction & { type: "sent" | "received" | "internal" }> = [];
    for (const { tx, isSent } of directTxs) {
      const receipt = receipts.get(tx.hash);

      transactions.push({
        hash: tx.hash,
        blockNumber: tx.blockNumber || "",
        blockHash: tx.blockHash || "",
        from: tx.from,
        to: tx.to || "",
        value: tx.value,
        gas: tx.gas,
        gasPrice: tx.gasPrice || "0x0",
        maxFeePerGas: tx.maxFeePerGas,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
        data: tx.input,
        input: tx.input,
        nonce: tx.nonce,
        transactionIndex: tx.transactionIndex || "0x0",
        timestamp: block.timestamp,
        type: isSent ? "sent" : "received",
        v: tx.v || "0x0",
        r: tx.r || "0x0",
        s: tx.s || "0x0",
        receipt: receipt || undefined,
      } as Transaction & { type: "sent" | "received" | "internal" });
    }

    // Third pass: if no direct transactions found and searchForInternal is true,
    // scan other transactions for address mentions
    if (directTxs.length === 0 && searchForInternal && otherTxs.length > 0) {
      const normalizedAddr = normalizedAddress.replace("0x", "");

      // First: check tx.input for all transactions (no RPC calls needed)
      // This catches Disperse.app, multicall, and similar contracts
      const txsWithAddressInInput: Array<{ tx: any }> = [];
      const txsNeedingReceiptCheck: Array<{ tx: any }> = [];

      for (const { tx } of otherTxs) {
        if (tx.input && tx.input.toLowerCase().includes(normalizedAddr)) {
          txsWithAddressInInput.push({ tx });
        } else {
          txsNeedingReceiptCheck.push({ tx });
        }
      }

      // Process transactions where address was found in input (just need receipt for status)
      const INTERNAL_BATCH_SIZE = 5; // Smaller batch size for rate limiting
      for (let i = 0; i < txsWithAddressInInput.length; i += INTERNAL_BATCH_SIZE) {
        if (i > 0) await this.delay(100); // Delay between batches
        const batch = txsWithAddressInInput.slice(i, i + INTERNAL_BATCH_SIZE);
        const receiptPromises = batch.map(({ tx }) =>
          this.client
            .getTransactionReceipt(tx.hash)
            .then((receiptResult) => ({
              tx,
              receipt: extractData(receiptResult.data),
            }))
            .catch(() => ({ tx, receipt: null })),
        );
        const batchResults = await Promise.all(receiptPromises);

        for (const { tx, receipt } of batchResults) {
          transactions.push({
            hash: tx.hash,
            blockNumber: tx.blockNumber || "",
            blockHash: tx.blockHash || "",
            from: tx.from,
            to: tx.to || "",
            value: tx.value,
            gas: tx.gas,
            gasPrice: tx.gasPrice || "0x0",
            maxFeePerGas: tx.maxFeePerGas,
            maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
            data: tx.input,
            input: tx.input,
            nonce: tx.nonce,
            transactionIndex: tx.transactionIndex || "0x0",
            timestamp: block.timestamp,
            type: "internal",
            v: tx.v || "0x0",
            r: tx.r || "0x0",
            s: tx.s || "0x0",
            receipt: receipt || undefined,
          } as Transaction & { type: "internal" });
        }
      }

      // Only fetch receipts for remaining txs if we didn't find anything in input data
      // This is expensive (many RPC calls) so we skip it if we already found the tx
      if (txsWithAddressInInput.length === 0 && txsNeedingReceiptCheck.length > 0) {
        // Check logs for remaining transactions (smaller batches with delays)
        for (let i = 0; i < txsNeedingReceiptCheck.length; i += INTERNAL_BATCH_SIZE) {
          if (i > 0) await this.delay(100); // Delay between batches
          const batch = txsNeedingReceiptCheck.slice(i, i + INTERNAL_BATCH_SIZE);
          const receiptPromises = batch.map(({ tx }) =>
            this.client
              .getTransactionReceipt(tx.hash)
              .then((receiptResult) => ({
                tx,
                receipt: extractData(receiptResult.data),
              }))
              .catch(() => ({ tx, receipt: null })),
          );
          const batchResults = await Promise.all(receiptPromises);

          for (const { tx, receipt } of batchResults) {
            const logs = receipt?.logs || [];
            // Only check logs here since we already checked input above
            for (const log of logs) {
              let found = false;
              if (log.topics) {
                for (const topic of log.topics) {
                  if (topic.toLowerCase().includes(normalizedAddr)) {
                    found = true;
                    break;
                  }
                }
              }
              if (!found && log.data && log.data.toLowerCase().includes(normalizedAddr)) {
                found = true;
              }
              if (found) {
                transactions.push({
                  hash: tx.hash,
                  blockNumber: tx.blockNumber || "",
                  blockHash: tx.blockHash || "",
                  from: tx.from,
                  to: tx.to || "",
                  value: tx.value,
                  gas: tx.gas,
                  gasPrice: tx.gasPrice || "0x0",
                  maxFeePerGas: tx.maxFeePerGas,
                  maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
                  data: tx.input,
                  input: tx.input,
                  nonce: tx.nonce,
                  transactionIndex: tx.transactionIndex || "0x0",
                  timestamp: block.timestamp,
                  type: "internal",
                  v: tx.v || "0x0",
                  r: tx.r || "0x0",
                  s: tx.s || "0x0",
                  receipt: receipt || undefined,
                } as Transaction & { type: "internal" });
                break; // Don't add same tx multiple times
              }
            }
          }
        }
      }
    }

    return transactions;
  }

  async searchAddressActivity(
    address: string,
    options: {
      limit?: number;
      toBlock?: number; // Search up to this block (exclusive) - for "load more" functionality
      onProgress?: ProgressCallback;
      onTransactionsFound?: TransactionFoundCallback;
    } = {},
  ): Promise<SearchResult> {
    const { limit = 100, toBlock, onProgress, onTransactionsFound } = options;
    const normalizedAddress = address.toLowerCase();
    console.log("[AddressTransactionSearch] Starting search, limit:", limit, "toBlock:", toBlock);

    // Clear cache for fresh search (unless continuing from previous search)
    if (!toBlock) {
      this.clearCache();
    }

    // Get latest block number or use provided toBlock
    let endBlock: number;
    if (toBlock !== undefined) {
      endBlock = toBlock - 1; // Exclusive - don't include the toBlock itself
    } else {
      const blockNumberResult = await this.client.blockNumber();
      endBlock = hexToNumber(extractData(blockNumberResult.data) || "0x0");
    }

    // Get initial and final states (getState already handles delay)
    const initialState = await this.getState(address, 0);
    const finalState = await this.getState(address, endBlock);

    // No activity if states are identical and nonce is 0
    if (
      initialState.nonce === finalState.nonce &&
      initialState.balance === finalState.balance &&
      finalState.nonce === 0
    ) {
      return {
        blocks: [],
        transactions: [],
        stats: {
          totalBlocks: 0,
          totalTxs: 0,
          sentCount: 0,
          receivedCount: 0,
          internalCount: 0,
          rpcCalls: this.nonceCache.size + this.balanceCache.size,
        },
      };
    }

    // Collect all transactions and blocks as we find them
    const allTransactions: Array<Transaction & { type: "sent" | "received" | "internal" }> = [];
    const foundBlocks = new Set<number>();
    const processedBlocks = new Set<number>();

    /**
     * Unified recursive search - finds blocks where EITHER nonce OR balance changed
     * Searches RIGHT (newest) first, then LEFT (older)
     * Immediately fetches transactions when important block is found
     */
    const search = async (
      startBlock: number,
      endBlock: number,
      startState: AddressState,
      endState: AddressState,
      depth = 0,
    ): Promise<void> => {
      // Check limit - stop if we have enough transactions (0 means no limit)
      if (limit > 0 && allTransactions.length >= limit) {
        console.log(
          "[Search] Limit reached, stopping. Found:",
          allTransactions.length,
          "Limit:",
          limit,
        );
        return;
      }

      // Base case: adjacent blocks
      if (endBlock - startBlock <= 1) {
        const nonceChanged = startState.nonce !== endState.nonce;
        const balanceChanged = startState.balance !== endState.balance;

        if ((nonceChanged || balanceChanged) && !processedBlocks.has(endBlock)) {
          foundBlocks.add(endBlock);
          processedBlocks.add(endBlock);

          // Immediately fetch transactions from this block
          // If only balance changed (not nonce), search for internal transactions
          const searchForInternal = balanceChanged && !nonceChanged;
          await this.delay(this.requestDelay);
          const blockTxs = await this.fetchBlockTransactions(
            endBlock,
            normalizedAddress,
            searchForInternal,
          );

          if (blockTxs.length > 0) {
            allTransactions.push(...blockTxs);
            console.log(
              "[Search] Found",
              blockTxs.length,
              "txs in block",
              endBlock,
              "- Total:",
              allTransactions.length,
            );
            // Notify callback immediately so UI can update
            onTransactionsFound?.(blockTxs);
          }
        }
        return;
      }

      // Check if anything changed in this range
      const nonceChanged = startState.nonce !== endState.nonce;
      const balanceChanged = startState.balance !== endState.balance;

      // Nothing changed, skip this range
      if (!nonceChanged && !balanceChanged) {
        return;
      }

      // Get midpoint state
      const midBlock = Math.floor((startBlock + endBlock) / 2);
      await this.delay(this.requestDelay);
      const midState = await this.getState(address, midBlock);

      // Check which halves have changes
      const leftNonceChanged = startState.nonce !== midState.nonce;
      const leftBalanceChanged = startState.balance !== midState.balance;
      const rightNonceChanged = midState.nonce !== endState.nonce;
      const rightBalanceChanged = midState.balance !== endState.balance;

      const leftChanged = leftNonceChanged || leftBalanceChanged;
      const rightChanged = rightNonceChanged || rightBalanceChanged;

      // Search RIGHT (newest) first to find newest transactions sooner
      if (rightChanged) {
        await search(midBlock, endBlock, midState, endState, depth + 1);
      }

      // Then search LEFT (older) if we still need more transactions (0 means no limit)
      if (leftChanged && (limit === 0 || allTransactions.length < limit)) {
        await search(startBlock, midBlock, startState, midState, depth + 1);
      }
    };

    // Report progress
    onProgress?.({ phase: "searching", current: 0, total: 1 });

    // Run unified search
    await search(0, endBlock, initialState, finalState);

    // Sort blocks (newest first) for the result
    const sortedBlocks = Array.from(foundBlocks).sort((a, b) => b - a);

    // Sort transactions by block number (newest first)
    allTransactions.sort((a, b) => {
      const blockA = hexToNumber(a.blockNumber || "0x0");
      const blockB = hexToNumber(b.blockNumber || "0x0");
      return blockB - blockA;
    });

    // Apply limit to transactions (limit=0 means no limit)
    const limitedTxs = limit > 0 ? allTransactions.slice(0, limit) : allTransactions;

    const sentCount = limitedTxs.filter((t) => t.type === "sent").length;
    const receivedCount = limitedTxs.filter((t) => t.type === "received").length;
    const internalCount = limitedTxs.filter((t) => t.type === "internal").length;

    console.log(
      "[AddressTransactionSearch] Search complete. Total found:",
      allTransactions.length,
      "Returning:",
      limitedTxs.length,
      "(internal:",
      internalCount,
      ")",
    );

    return {
      blocks: sortedBlocks,
      transactions: limitedTxs,
      stats: {
        totalBlocks: sortedBlocks.length,
        totalTxs: limitedTxs.length,
        sentCount,
        receivedCount,
        internalCount,
        rpcCalls: this.nonceCache.size + this.balanceCache.size,
      },
    };
  }

  /**
   * Simple version: just get the block range and transaction count
   * Much faster than full search (~40-50 RPC calls)
   */
  async getTransactionRange(
    address: string,
  ): Promise<{ startBlock: number; endBlock: number; totalSent: number } | null> {
    // Get latest block and current nonce (sequential to avoid rate limiting)
    const blockNumberResult = await this.client.blockNumber();
    await this.delay(this.requestDelay);
    const nonceResult = await this.client.getTransactionCount(address, "latest");

    const latestBlock = hexToNumber(extractData(blockNumberResult.data) || "0x0");
    const currentNonce = hexToNumber(extractData(nonceResult.data) || "0x0");

    // No transactions sent from this address
    if (currentNonce === 0) return null;

    /**
     * Binary search to find the block where nonce first reached targetNonce
     */
    const findBlockByNonce = async (targetNonce: number, low = 0): Promise<number> => {
      let high = latestBlock;

      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        await this.delay(this.requestDelay);
        const nonceAtMid = await this.getNonce(address, mid);

        if (nonceAtMid < targetNonce) {
          // Nonce not yet reached, tx must be in later block
          low = mid + 1;
        } else {
          // Nonce already reached, tx is in this block or earlier
          high = mid;
        }
      }

      return low;
    };

    // Find first tx: block where nonce went from 0 to 1
    const startBlock = await findBlockByNonce(1);

    // Find last tx: block where nonce reached current value
    // Optimization: start search from startBlock instead of 0
    const endBlock = await findBlockByNonce(currentNonce, startBlock);

    return { startBlock, endBlock, totalSent: currentNonce };
  }
}
