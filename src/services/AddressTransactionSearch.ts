import type {
  EthereumClient,
  EthTransaction,
  EthTransactionReceipt,
} from "@openscan/network-connectors";
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
    elapsedMs: number;
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

  // Adaptive branching configuration
  // Can be increased later when RPC type detection is added (e.g., for localhost/private RPCs)
  private static readonly MAX_SEGMENTS = 8; // Max segments per split (safe for public RPCs)
  private static readonly BATCH_SIZE = 4; // Max parallel state fetches (4 blocks = 8 RPC calls)

  constructor(client: EthereumClient) {
    this.client = client;
  }

  /**
   * Determine optimal segment count based on transaction density.
   * Uses nonce delta (exact outgoing tx count) as the primary indicator.
   *
   * - nonceDelta = 0 and no balance change → skip range (returns 0)
   * - nonceDelta = 0 but balance changed → binary (2) - can't estimate incoming txs
   * - nonceDelta 1-2 → binary (2 segments)
   * - nonceDelta 3-10 → 4 segments
   * - nonceDelta > 10 → MAX_SEGMENTS (8)
   */
  private getOptimalSegmentCount(
    startState: AddressState,
    endState: AddressState,
    blockRange: number,
  ): number {
    const nonceDelta = endState.nonce - startState.nonce;
    const balanceChanged = startState.balance !== endState.balance;

    // No activity in this range
    if (nonceDelta === 0 && !balanceChanged) {
      return 0;
    }

    // For small ranges, always use binary - segmentation overhead not worth it
    if (blockRange <= 100) {
      return 2;
    }

    // Nonce delta gives us exact outgoing tx count
    // All values capped at MAX_SEGMENTS
    if (nonceDelta > 0) {
      if (nonceDelta <= 2) return Math.min(2, AddressTransactionSearch.MAX_SEGMENTS);
      if (nonceDelta <= 10) return Math.min(4, AddressTransactionSearch.MAX_SEGMENTS);
      return AddressTransactionSearch.MAX_SEGMENTS;
    }

    // Balance-only changes (incoming txs): conservative binary search
    // We can't estimate incoming tx count from balance delta
    return 2;
  }

  /**
   * Calculate N evenly-spaced boundary blocks for segmentation.
   * Returns array of segmentCount + 1 boundaries (including start and end).
   */
  private calculateBoundaries(
    startBlock: number,
    endBlock: number,
    segmentCount: number,
  ): number[] {
    const segmentSize = Math.floor((endBlock - startBlock) / segmentCount);
    const boundaries: number[] = [startBlock];
    for (let i = 1; i < segmentCount; i++) {
      boundaries.push(startBlock + segmentSize * i);
    }
    boundaries.push(endBlock);
    return boundaries;
  }

  /**
   * Fetch states for multiple blocks in batches (rate-limit safe).
   * Uses BATCH_SIZE to limit parallel requests.
   */
  private async getStatesInBatches(
    address: string,
    blocks: number[],
  ): Promise<Map<number, AddressState>> {
    const results = new Map<number, AddressState>();

    for (let i = 0; i < blocks.length; i += AddressTransactionSearch.BATCH_SIZE) {
      const batch = blocks.slice(i, i + AddressTransactionSearch.BATCH_SIZE);

      // Fetch batch in parallel
      const batchPromises = batch.map(async (block) => {
        const state = await this.getState(address, block);
        return { block, state };
      });

      const batchResults = await Promise.all(batchPromises);
      for (const { block, state } of batchResults) {
        results.set(block, state);
      }

      // Delay between batches if rate limiting enabled
      if (i + AddressTransactionSearch.BATCH_SIZE < blocks.length && this.requestDelay > 0) {
        await this.delay(this.requestDelay);
      }
    }

    return results;
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
    const directTxs: Array<{ tx: EthTransaction; isSent: boolean }> = [];
    const otherTxs: Array<{ tx: EthTransaction }> = [];

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
    const receipts = new Map<string, EthTransactionReceipt | null>();

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

    // Retry failed receipts sequentially (handles rate-limiting from concurrent strategies)
    const failedHashes: string[] = [];
    receipts.forEach((receipt, hash) => {
      if (receipt === null) failedHashes.push(hash);
    });

    for (const hash of failedHashes) {
      await this.delay(100);
      try {
        const receiptResult = await this.client.getTransactionReceipt(hash);
        const receipt = extractData(receiptResult.data);
        if (receipt) {
          receipts.set(hash, receipt);
        }
      } catch {
        // Still failed after retry, keep as null
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
      const txsWithAddressInInput: Array<{ tx: EthTransaction }> = [];
      const txsNeedingReceiptCheck: Array<{ tx: EthTransaction }> = [];

      for (const { tx } of otherTxs) {
        if (tx.input?.toLowerCase().includes(normalizedAddr)) {
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
      fromBlock?: number; // Stop searching at this block (inclusive) - for "search recent" functionality
      onProgress?: ProgressCallback;
      onTransactionsFound?: TransactionFoundCallback;
    } = {},
  ): Promise<SearchResult> {
    const { limit = 100, toBlock, fromBlock, onProgress, onTransactionsFound } = options;
    const normalizedAddress = address.toLowerCase();
    const searchStartTime = performance.now();

    console.log(
      "[AddressTransactionSearch] Starting search, limit:",
      limit,
      "toBlock:",
      toBlock,
      "fromBlock:",
      fromBlock,
    );

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
    // If fromBlock is provided, use it as the lower bound instead of block 0
    const startBlock = fromBlock !== undefined ? fromBlock : 0;
    const initialState = await this.getState(address, startBlock);
    const finalState = await this.getState(address, endBlock);

    // No activity if states are identical and nonce is 0
    if (
      initialState.nonce === finalState.nonce &&
      initialState.balance === finalState.balance &&
      finalState.nonce === 0
    ) {
      const elapsedMs = Math.round(performance.now() - searchStartTime);
      console.log("[AddressTransactionSearch] No activity found. Elapsed:", elapsedMs, "ms");
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
          elapsedMs,
        },
      };
    }

    // Collect all transactions and blocks as we find them
    const allTransactions: Array<Transaction & { type: "sent" | "received" | "internal" }> = [];
    const foundBlocks = new Set<number>();
    const processedBlocks = new Set<number>();

    /**
     * Adaptive recursive search - finds blocks where EITHER nonce OR balance changed
     * Uses nonce delta to determine optimal segment count (2, 4, or 8 segments)
     * Searches RIGHT (newest) first, then LEFT (older)
     * Immediately fetches transactions when important block is found
     */
    const search = async (
      searchStartBlock: number,
      searchEndBlock: number,
      searchStartState: AddressState,
      searchEndState: AddressState,
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
      if (searchEndBlock - searchStartBlock <= 1) {
        const nonceChanged = searchStartState.nonce !== searchEndState.nonce;
        const balanceChanged = searchStartState.balance !== searchEndState.balance;

        if ((nonceChanged || balanceChanged) && !processedBlocks.has(searchEndBlock)) {
          foundBlocks.add(searchEndBlock);
          processedBlocks.add(searchEndBlock);

          // Immediately fetch transactions from this block
          // If only balance changed (not nonce), search for internal transactions
          const searchForInternal = balanceChanged && !nonceChanged;
          await this.delay(this.requestDelay);
          const blockTxs = await this.fetchBlockTransactions(
            searchEndBlock,
            normalizedAddress,
            searchForInternal,
          );

          if (blockTxs.length > 0) {
            allTransactions.push(...blockTxs);
            console.log(
              "[Search] Found",
              blockTxs.length,
              "txs in block",
              searchEndBlock,
              "- Total:",
              allTransactions.length,
            );
            // Notify callback immediately so UI can update
            onTransactionsFound?.(blockTxs);
          }
        }
        return;
      }

      // Determine optimal segment count based on activity density
      const blockRange = searchEndBlock - searchStartBlock;
      const segmentCount = this.getOptimalSegmentCount(
        searchStartState,
        searchEndState,
        blockRange,
      );

      // Skip if no activity detected
      if (segmentCount === 0) {
        return;
      }

      // For binary (2 segments), use optimized path
      if (segmentCount <= 2) {
        const midBlock = Math.floor((searchStartBlock + searchEndBlock) / 2);
        await this.delay(this.requestDelay);
        const midState = await this.getState(address, midBlock);

        const leftChanged =
          searchStartState.nonce !== midState.nonce ||
          searchStartState.balance !== midState.balance;
        const rightChanged =
          midState.nonce !== searchEndState.nonce || midState.balance !== searchEndState.balance;

        // Search RIGHT (newest) first to find newest transactions sooner
        if (rightChanged) {
          await search(midBlock, searchEndBlock, midState, searchEndState, depth + 1);
        }

        // Then search LEFT (older) if we still need more transactions
        if (leftChanged && (limit === 0 || allTransactions.length < limit)) {
          await search(searchStartBlock, midBlock, searchStartState, midState, depth + 1);
        }
        return;
      }

      // Multi-segment adaptive branching (4 or 8 segments)
      console.log(
        "[Search] Using",
        segmentCount,
        "segments for range",
        searchStartBlock,
        "-",
        searchEndBlock,
        "(nonce delta:",
        searchEndState.nonce - searchStartState.nonce,
        ")",
      );

      // Calculate boundaries and fetch internal boundary states in batches
      const boundaries = this.calculateBoundaries(searchStartBlock, searchEndBlock, segmentCount);
      const internalBlocks = boundaries.slice(1, -1); // Exclude start and end (already known)
      const stateMap = await this.getStatesInBatches(address, internalBlocks);

      // Add known start/end states
      stateMap.set(searchStartBlock, searchStartState);
      stateMap.set(searchEndBlock, searchEndState);

      // Build segments with activity info
      const segments: Array<{
        start: number;
        end: number;
        startState: AddressState;
        endState: AddressState;
        hasChanges: boolean;
      }> = [];

      for (let i = 0; i < segmentCount; i++) {
        const segStart = boundaries[i];
        const segEnd = boundaries[i + 1];

        // Skip if boundaries are missing (shouldn't happen, but TypeScript requires check)
        if (segStart === undefined || segEnd === undefined) {
          continue;
        }

        const segStartState = stateMap.get(segStart);
        const segEndState = stateMap.get(segEnd);

        if (!segStartState || !segEndState) {
          console.warn("[Search] Missing state for segment", i, "- skipping");
          continue;
        }

        const hasChanges =
          segStartState.nonce !== segEndState.nonce ||
          segStartState.balance !== segEndState.balance;

        segments.push({
          start: segStart,
          end: segEnd,
          startState: segStartState,
          endState: segEndState,
          hasChanges,
        });
      }

      // Process segments RIGHT-TO-LEFT (newest first)
      for (let i = segments.length - 1; i >= 0; i--) {
        if (limit > 0 && allTransactions.length >= limit) {
          break;
        }

        const segment = segments[i];
        if (segment?.hasChanges) {
          await search(segment.start, segment.end, segment.startState, segment.endState, depth + 1);
        }
      }
    };

    // Report progress
    onProgress?.({ phase: "searching", current: 0, total: 1 });

    // Run unified search (use startBlock which is fromBlock if provided, otherwise 0)
    await search(startBlock, endBlock, initialState, finalState);

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
    const rpcCalls = this.nonceCache.size + this.balanceCache.size;
    const elapsedMs = Math.round(performance.now() - searchStartTime);

    console.log(
      `[AddressTransactionSearch] Search complete:`,
      `\n  Transactions: ${limitedTxs.length} (sent: ${sentCount}, received: ${receivedCount}, internal: ${internalCount})`,
      `\n  Blocks with activity: ${sortedBlocks.length}`,
      `\n  RPC calls: ${rpcCalls} (nonce: ${this.nonceCache.size}, balance: ${this.balanceCache.size})`,
      `\n  Elapsed: ${elapsedMs}ms (${(elapsedMs / 1000).toFixed(2)}s)`,
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
        rpcCalls,
        elapsedMs,
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
