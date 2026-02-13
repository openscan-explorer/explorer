import type {
  EthereumClient,
  EthTransaction,
  EthTransactionReceipt,
} from "@openscan/network-connectors";
import type { Transaction } from "../types";
import { logger } from "../utils/logger";
import { hexToNumber } from "./adapters/EVMAdapter/utils";
import type { NonceLookupService } from "./NonceLookupService";

interface Semaphore {
  acquire(): Promise<() => void>;
}

function createSemaphore(max: number): Semaphore {
  let active = 0;
  const queue: Array<() => void> = [];
  return {
    acquire(): Promise<() => void> {
      return new Promise((resolve) => {
        const tryRun = () => {
          if (active < max) {
            active++;
            resolve(() => {
              active--;
              if (queue.length > 0) queue.shift()?.();
            });
          } else {
            queue.push(tryRun);
          }
        };
        tryRun();
      });
    },
  };
}

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
  message?: string;
  blockRange?: { from: number; to: number };
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
  private nonceLookup: NonceLookupService | null;
  private nonceCache: Map<string, number> = new Map();
  private balanceCache: Map<string, bigint> = new Map();
  private rpcSemaphore: Semaphore = createSemaphore(4);

  // Adaptive branching configuration
  // Can be increased later when RPC type detection is added (e.g., for localhost/private RPCs)
  private static readonly MAX_SEGMENTS = 8; // Max segments per split (safe for public RPCs)
  private static readonly BATCH_SIZE = 8; // Max parallel state fetches (8 blocks = 16 RPC calls)
  private static readonly RECEIPT_BATCH_SIZE = 20;

  constructor(client: EthereumClient, nonceLookup?: NonceLookupService) {
    this.client = client;
    this.nonceLookup = nonceLookup ?? null;
  }

  private rpcLimited<T>(fn: () => Promise<T>): Promise<T> {
    return this.rpcSemaphore.acquire().then((release) => fn().finally(release));
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
    }

    return results;
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

    const result = await this.rpcLimited(() =>
      this.client.getTransactionCount(address, `0x${block.toString(16)}`),
    );
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

    const result = await this.rpcLimited(() =>
      this.client.getBalance(address, `0x${block.toString(16)}`),
    );
    const balance = BigInt(extractData(result.data) || "0x0");
    this.balanceCache.set(key, balance);
    return balance;
  }

  /**
   * Get both nonce and balance at a block in parallel
   */
  private async getState(address: string, block: number): Promise<AddressState> {
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
   * Find the smallest recent block range containing address activity.
   * Uses exponential (galloping) search from the chain tip: checks the last
   * 100K blocks, then 200K, 400K, 800K, etc., doubling each step.
   *
   * This is used as Phase 1 of the auto-search: quickly narrow down
   * the search range before running the full binary search tree.
   *
   * @param address - Address to check
   * @param initialRange - Initial block range to check from tip (default 100,000)
   * @returns { fromBlock, toBlock } for the narrowest recent range, or null if no activity
   */
  async findRecentActivityRange(
    address: string,
    initialRange = 100_000,
    signal?: AbortSignal,
  ): Promise<{ fromBlock: number; toBlock: number } | null> {
    const blockNumberResult = await this.rpcLimited(() => this.client.blockNumber());
    const latestBlock = hexToNumber(extractData(blockNumberResult.data) || "0x0");

    if (latestBlock === 0) return null;

    // Get state at latest block
    const latestState = await this.getState(address, latestBlock);

    // No activity at all if nonce is 0 and balance is 0
    if (latestState.nonce === 0 && latestState.balance === BigInt(0)) {
      return null;
    }

    // Exponential search: check last 100K, 200K, 400K, 800K, ... blocks
    let range = initialRange;
    let prevBoundary = latestBlock;

    while (true) {
      if (signal?.aborted) return null;

      const boundary = Math.max(latestBlock - range, 0);
      const boundaryState = await this.getState(address, boundary);

      if (
        boundaryState.nonce !== latestState.nonce ||
        boundaryState.balance !== latestState.balance
      ) {
        return { fromBlock: boundary, toBlock: prevBoundary };
      }

      if (boundary === 0) break;

      prevBoundary = boundary;
      range *= 2;
    }

    // State at block 0 equals latest → edge case
    // Fall back to searching from block 0
    return { fromBlock: 0, toBlock: latestBlock };
  }

  /**
   * Fetch transactions from a block and filter by address, including receipts
   * Uses parallel receipt fetching for better performance
   * Also detects internal transactions by scanning logs for address mentions
   */
  private async fetchBlockTransactions(
    blockNum: number,
    normalizedAddress: string,
    searchForInternal = false,
    signal?: AbortSignal,
  ): Promise<Array<Transaction & { type: "sent" | "received" | "internal" }>> {
    const result = await this.rpcLimited(() =>
      this.client.getBlockByNumber(`0x${blockNum.toString(16)}`, true),
    );
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
      if (signal?.aborted) break;
      const batch = directTxs.slice(i, i + RECEIPT_BATCH_SIZE);
      const receiptPromises = batch.map(({ tx }) =>
        this.rpcLimited(() => this.client.getTransactionReceipt(tx.hash))
          .then((receiptResult) => ({
            hash: tx.hash,
            receipt: extractData(receiptResult.data),
          }))
          .catch(() => ({ hash: tx.hash, receipt: null })),
      );
      const batchResults = await Promise.all(receiptPromises);
      for (const { hash, receipt } of batchResults) {
        receipts.set(hash, receipt);
      }
    }

    // Retry failed receipts in parallel (semaphore handles backpressure)
    const failedHashes: string[] = [];
    receipts.forEach((receipt, hash) => {
      if (receipt === null) failedHashes.push(hash);
    });

    if (failedHashes.length > 0 && !signal?.aborted) {
      await Promise.all(
        failedHashes.map(async (hash) => {
          try {
            const receiptResult = await this.rpcLimited(() =>
              this.client.getTransactionReceipt(hash),
            );
            const receipt = extractData(receiptResult.data);
            if (receipt) {
              receipts.set(hash, receipt);
            }
          } catch {
            // Still failed after retry, keep as null
          }
        }),
      );
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
      const INTERNAL_BATCH_SIZE = 15;
      for (let i = 0; i < txsWithAddressInInput.length; i += INTERNAL_BATCH_SIZE) {
        if (signal?.aborted) break;
        const batch = txsWithAddressInInput.slice(i, i + INTERNAL_BATCH_SIZE);
        const receiptPromises = batch.map(({ tx }) =>
          this.rpcLimited(() => this.client.getTransactionReceipt(tx.hash))
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
        // Check logs for remaining transactions
        for (let i = 0; i < txsNeedingReceiptCheck.length; i += INTERNAL_BATCH_SIZE) {
          if (signal?.aborted) break;
          const batch = txsNeedingReceiptCheck.slice(i, i + INTERNAL_BATCH_SIZE);
          const receiptPromises = batch.map(({ tx }) =>
            this.rpcLimited(() => this.client.getTransactionReceipt(tx.hash))
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

  /**
   * Optimized search using eth_getTransactionBySenderAndNonce for sent transactions,
   * with gap-based binary search for received/internal transactions.
   *
   * Phase 1: Nonce lookups (reth) + receipt fetches (user RPC) in parallel
   * Phase 2: Gap searches for received/internal txs in intervals between sent tx blocks
   * Phase 3: Combine, sort, deliver as one batch
   *
   * Returns null if it should fall back to binary search.
   */
  private async searchWithNonceLookup(
    normalizedAddress: string,
    endBlock: number,
    initialState: AddressState,
    finalState: AddressState,
    options: {
      limit: number;
      onProgress?: ProgressCallback;
      onTransactionsFound?: TransactionFoundCallback;
      signal?: AbortSignal;
    },
  ): Promise<SearchResult | null> {
    const { limit, onProgress, onTransactionsFound, signal } = options;
    const nonceLookup = this.nonceLookup;
    if (!nonceLookup) return null;

    const searchStartTime = performance.now();
    const nonceDelta = finalState.nonce - initialState.nonce;

    // Determine nonce range to fetch
    const totalNoncesToFetch = limit > 0 ? Math.min(limit, nonceDelta) : nonceDelta;
    const startNonce = finalState.nonce - totalNoncesToFetch;
    const endNonce = finalState.nonce;

    // Probe availability with the first nonce in range
    const available = await nonceLookup.isAvailable(normalizedAddress, startNonce);
    if (!available) return null;

    // Phase 1: Fetch sent transactions via nonce lookup + receipts in parallel
    const sentTxs: Array<Transaction & { type: "sent" | "received" | "internal" }> = [];
    const sentBlockNumbers = new Set<number>();
    let completedNonces = 0;

    onProgress?.({
      phase: "fetching",
      current: 0,
      total: totalNoncesToFetch,
      message: `Fetching sent transactions (0/${totalNoncesToFetch})...`,
    });

    const nonceResults = await nonceLookup.fetchSentTransactions(
      normalizedAddress,
      startNonce,
      endNonce,
      signal,
      (completed, total) => {
        completedNonces = completed;
        onProgress?.({
          phase: "fetching",
          current: completed,
          total,
          message: `Fetching sent transactions (${completed}/${total})...`,
        });
      },
    );

    if (signal?.aborted) return null;

    // Fetch receipts and full tx data for nonce lookup results
    // These go to the user's RPC (not reth), so they can run concurrently
    for (let i = 0; i < nonceResults.length; i += AddressTransactionSearch.RECEIPT_BATCH_SIZE) {
      if (signal?.aborted) break;
      const batch = nonceResults.slice(i, i + AddressTransactionSearch.RECEIPT_BATCH_SIZE);

      const txPromises = batch.map(async (nr) => {
        try {
          const [txResult, receiptResult] = await Promise.all([
            this.rpcLimited(() => this.client.getTransactionByHash(nr.txHash)),
            this.rpcLimited(() => this.client.getTransactionReceipt(nr.txHash)),
          ]);

          const tx = extractData(txResult.data);
          const receipt = extractData(receiptResult.data);
          if (!tx) return null;

          // Also get block timestamp
          let timestamp = "";
          try {
            const blockResult = await this.rpcLimited(() =>
              this.client.getBlockByNumber(`0x${nr.blockNumber.toString(16)}`, false),
            );
            const block = extractData(blockResult.data);
            if (block) timestamp = block.timestamp;
          } catch {
            // timestamp remains empty
          }

          return {
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
            timestamp,
            type: "sent" as const,
            v: tx.v || "0x0",
            r: tx.r || "0x0",
            s: tx.s || "0x0",
            receipt: receipt || undefined,
          } as Transaction & { type: "sent" | "received" | "internal" };
        } catch (err) {
          logger.warn(`Failed to fetch tx details for ${nr.txHash}:`, err);
          return null;
        }
      });

      const results = await Promise.all(txPromises);
      for (const tx of results) {
        if (tx) {
          sentTxs.push(tx);
          const blockNum = hexToNumber(tx.blockNumber || "0x0");
          if (blockNum > 0) sentBlockNumbers.add(blockNum);
        }
      }
    }

    if (signal?.aborted) return null;

    // Phase 2: Interleaved progressive delivery — walk from newest to oldest,
    // alternating gap searches and sent tx delivery so the UI appends in order.
    onProgress?.({
      phase: "searching",
      current: completedNonces,
      total: totalNoncesToFetch,
      message: "Searching for received transactions...",
    });

    const allTransactions: Array<Transaction & { type: "sent" | "received" | "internal" }> = [];

    if (sentBlockNumbers.size === 0) {
      // No sent txs found — fall back to binary search (return null)
      return null;
    }

    // Sort sent txs by block number descending (newest first) and index by block
    sentTxs.sort((a, b) => {
      const blockA = hexToNumber(a.blockNumber || "0x0");
      const blockB = hexToNumber(b.blockNumber || "0x0");
      return blockB - blockA;
    });
    const sentTxsByBlock = new Map<
      number,
      Array<Transaction & { type: "sent" | "received" | "internal" }>
    >();
    for (const tx of sentTxs) {
      const blockNum = hexToNumber(tx.blockNumber || "0x0");
      const existing = sentTxsByBlock.get(blockNum);
      if (existing) {
        existing.push(tx);
      } else {
        sentTxsByBlock.set(blockNum, [tx]);
      }
    }

    // Build ordered segments: [gap, sentTx, gap, sentTx, ...] newest to oldest
    // Each segment is either a gap to search or a sent tx block to deliver
    type Segment = { kind: "gap"; from: number; to: number } | { kind: "sent"; blockNum: number };

    const segments: Segment[] = [];
    const sortedDesc = Array.from(sentBlockNumbers).sort((a, b) => b - a);
    const newestSent = sortedDesc[0] as number;

    // Gap after newest sent tx (contains the most recent possible received txs)
    if (newestSent < endBlock) {
      segments.push({ kind: "gap", from: newestSent + 1, to: endBlock });
    }

    // Interleave sent txs and gaps between them, newest to oldest
    for (let i = 0; i < sortedDesc.length; i++) {
      const current = sortedDesc[i] as number;
      segments.push({ kind: "sent", blockNum: current });

      if (i < sortedDesc.length - 1) {
        const older = sortedDesc[i + 1] as number;
        if (current - older > 1) {
          segments.push({ kind: "gap", from: older + 1, to: current - 1 });
        }
      }
    }

    const processedBlocks = new Set<number>();

    // Process segments in order — each delivery is chronologically after the previous
    for (const segment of segments) {
      if (signal?.aborted) break;
      if (limit > 0 && allTransactions.length >= limit) break;

      if (segment.kind === "sent") {
        // Deliver sent tx(s) at this block
        const txsAtBlock = sentTxsByBlock.get(segment.blockNum);
        if (txsAtBlock && txsAtBlock.length > 0) {
          allTransactions.push(...txsAtBlock);
          onTransactionsFound?.(txsAtBlock);
        }
        continue;
      }

      // Gap search
      const gap = segment;
      try {
        const gapEndState = await this.getState(normalizedAddress, gap.to);
        const gapStartState = await this.getState(normalizedAddress, gap.from);

        if (
          gapStartState.balance === gapEndState.balance &&
          gapStartState.nonce === gapEndState.nonce
        ) {
          continue; // No activity in this gap
        }

        // Exponential narrowing for large gaps
        let narrowedFrom = gap.from;
        let narrowedTo = gap.to;
        const gapSize = gap.to - gap.from;

        if (gapSize > 100_000) {
          let range = 100_000;
          let prevBoundary = gap.to;

          while (range < gapSize) {
            if (signal?.aborted) break;
            const probe = Math.max(gap.to - range, gap.from);
            const probeState = await this.getState(normalizedAddress, probe);

            if (
              probeState.nonce !== gapEndState.nonce ||
              probeState.balance !== gapEndState.balance
            ) {
              narrowedFrom = probe;
              narrowedTo = prevBoundary;
              break;
            }

            if (probe === gap.from) break;
            prevBoundary = probe;
            range *= 2;
          }

          const narrowedStartState = await this.getState(normalizedAddress, narrowedFrom);
          const narrowedEndState = await this.getState(normalizedAddress, narrowedTo);
          if (
            narrowedStartState.balance === narrowedEndState.balance &&
            narrowedStartState.nonce === narrowedEndState.nonce
          ) {
            continue;
          }
        }

        // Adaptive segmented search — delivers txs progressively via onTransactionsFound
        const searchGap = async (
          searchStart: number,
          searchEnd: number,
          sState: AddressState,
          eState: AddressState,
          depth = 0,
        ): Promise<void> => {
          if (signal?.aborted) return;

          if (searchEnd - searchStart <= 1) {
            const nonceChanged = sState.nonce !== eState.nonce;
            const balanceChanged = sState.balance !== eState.balance;

            if ((nonceChanged || balanceChanged) && !processedBlocks.has(searchEnd)) {
              processedBlocks.add(searchEnd);
              const searchForInternal = balanceChanged && !nonceChanged;
              const blockTxs = await this.fetchBlockTransactions(
                searchEnd,
                normalizedAddress,
                searchForInternal,
                signal,
              );
              if (blockTxs.length > 0) {
                allTransactions.push(...blockTxs);
                onTransactionsFound?.(blockTxs);
              }
            }
            return;
          }

          const blockRange = searchEnd - searchStart;
          const segmentCount = this.getOptimalSegmentCount(sState, eState, blockRange);
          if (segmentCount === 0) return;

          if (segmentCount <= 2) {
            const midBlock = Math.floor((searchStart + searchEnd) / 2);
            const midState = await this.getState(normalizedAddress, midBlock);

            const rightChanged =
              midState.nonce !== eState.nonce || midState.balance !== eState.balance;
            const leftChanged =
              sState.nonce !== midState.nonce || sState.balance !== midState.balance;

            if (rightChanged) {
              await searchGap(midBlock, searchEnd, midState, eState, depth + 1);
            }
            if (leftChanged) {
              await searchGap(searchStart, midBlock, sState, midState, depth + 1);
            }
            return;
          }

          const boundaries = this.calculateBoundaries(searchStart, searchEnd, segmentCount);
          const internalBlocks = boundaries.slice(1, -1);
          const stateMap = await this.getStatesInBatches(normalizedAddress, internalBlocks);
          stateMap.set(searchStart, sState);
          stateMap.set(searchEnd, eState);

          for (let i = segmentCount - 1; i >= 0; i--) {
            if (signal?.aborted) break;
            const segStart = boundaries[i];
            const segEnd = boundaries[i + 1];
            if (segStart === undefined || segEnd === undefined) continue;

            const segStartState = stateMap.get(segStart);
            const segEndState = stateMap.get(segEnd);
            if (!segStartState || !segEndState) continue;

            const hasChanges =
              segStartState.nonce !== segEndState.nonce ||
              segStartState.balance !== segEndState.balance;

            if (hasChanges) {
              await searchGap(segStart, segEnd, segStartState, segEndState, depth + 1);
            }
          }
        };

        const narrowedStartState = await this.getState(normalizedAddress, narrowedFrom);
        const narrowedEndState = await this.getState(normalizedAddress, narrowedTo);
        await searchGap(narrowedFrom, narrowedTo, narrowedStartState, narrowedEndState);
      } catch (err) {
        logger.warn(`Gap search failed for blocks ${gap.from}-${gap.to}:`, err);
      }
    }

    // Sort all collected transactions by block number descending (newest first)
    allTransactions.sort((a, b) => {
      const blockA = hexToNumber(a.blockNumber || "0x0");
      const blockB = hexToNumber(b.blockNumber || "0x0");
      return blockB - blockA;
    });

    // Apply limit
    const limitedTxs = limit > 0 ? allTransactions.slice(0, limit) : allTransactions;

    const sentCount = limitedTxs.filter((t) => t.type === "sent").length;
    const receivedCount = limitedTxs.filter((t) => t.type === "received").length;
    const internalCount = limitedTxs.filter((t) => t.type === "internal").length;
    const elapsedMs = Math.round(performance.now() - searchStartTime);

    const foundBlocks = new Set(
      limitedTxs.map((tx) => hexToNumber(tx.blockNumber || "0x0")).filter((b) => b > 0),
    );

    return {
      blocks: Array.from(foundBlocks).sort((a, b) => b - a),
      transactions: limitedTxs,
      stats: {
        totalBlocks: foundBlocks.size,
        totalTxs: limitedTxs.length,
        sentCount,
        receivedCount,
        internalCount,
        rpcCalls: this.nonceCache.size + this.balanceCache.size,
        elapsedMs,
      },
    };
  }

  async searchAddressActivity(
    address: string,
    options: {
      limit?: number;
      toBlock?: number; // Search up to this block (exclusive) - for "load more" functionality
      fromBlock?: number; // Stop searching at this block (inclusive) - for "search recent" functionality
      onProgress?: ProgressCallback;
      onTransactionsFound?: TransactionFoundCallback;
      signal?: AbortSignal;
    } = {},
  ): Promise<SearchResult> {
    const { limit = 100, toBlock, fromBlock, onProgress, onTransactionsFound, signal } = options;
    const normalizedAddress = address.toLowerCase();
    const searchStartTime = performance.now();

    // Clear cache for fresh search (unless continuing from previous search)
    if (!toBlock) {
      this.clearCache();
    }

    // Get latest block number or use provided toBlock
    let endBlock: number;
    if (toBlock !== undefined) {
      endBlock = toBlock - 1; // Exclusive - don't include the toBlock itself
    } else {
      const blockNumberResult = await this.rpcLimited(() => this.client.blockNumber());
      endBlock = hexToNumber(extractData(blockNumberResult.data) || "0x0");
    }

    // Get initial and final states
    // If fromBlock is provided, use it as the lower bound instead of block 0
    const startBlock = fromBlock !== undefined ? fromBlock : 0;
    const initialState = await this.getState(normalizedAddress, startBlock);
    const finalState = await this.getState(normalizedAddress, endBlock);

    // Try nonce-based lookup for sent transactions (Ethereum mainnet only)
    if (this.nonceLookup && finalState.nonce > initialState.nonce) {
      try {
        const result = await this.searchWithNonceLookup(
          normalizedAddress,
          endBlock,
          initialState,
          finalState,
          { limit, onProgress, onTransactionsFound, signal },
        );
        if (result) return result;
      } catch (err) {
        logger.warn("Nonce lookup failed, falling back to binary search:", err);
      }
    }

    // No activity if states are identical and nonce is 0
    if (
      initialState.nonce === finalState.nonce &&
      initialState.balance === finalState.balance &&
      finalState.nonce === 0
    ) {
      const elapsedMs = Math.round(performance.now() - searchStartTime);
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
      // Check if search was aborted
      if (signal?.aborted) return;

      // Check limit - stop if we have enough transactions (0 means no limit)
      if (limit > 0 && allTransactions.length >= limit) {
        return;
      }

      // Report progress with current search range
      onProgress?.({
        phase: "searching",
        current: allTransactions.length,
        total: limit > 0 ? limit : 0,
        message: `Scanning blocks ${searchStartBlock.toLocaleString()} - ${searchEndBlock.toLocaleString()}`,
        blockRange: { from: searchStartBlock, to: searchEndBlock },
      });

      // Base case: adjacent blocks
      if (searchEndBlock - searchStartBlock <= 1) {
        const nonceChanged = searchStartState.nonce !== searchEndState.nonce;
        const balanceChanged = searchStartState.balance !== searchEndState.balance;

        if ((nonceChanged || balanceChanged) && !processedBlocks.has(searchEndBlock)) {
          foundBlocks.add(searchEndBlock);
          processedBlocks.add(searchEndBlock);

          // Immediately fetch transactions from this block
          // If only balance changed (not nonce), search for internal transactions
          if (signal?.aborted) return;
          onProgress?.({
            phase: "fetching",
            current: allTransactions.length,
            total: limit > 0 ? limit : 0,
            message: `Fetching block ${searchEndBlock.toLocaleString()}`,
            blockRange: { from: searchEndBlock, to: searchEndBlock },
          });
          const searchForInternal = balanceChanged && !nonceChanged;
          const blockTxs = await this.fetchBlockTransactions(
            searchEndBlock,
            normalizedAddress,
            searchForInternal,
            signal,
          );

          if (blockTxs.length > 0) {
            allTransactions.push(...blockTxs);
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
        const midState = await this.getState(normalizedAddress, midBlock);

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
      // Calculate boundaries and fetch internal boundary states in batches
      const boundaries = this.calculateBoundaries(searchStartBlock, searchEndBlock, segmentCount);
      const internalBlocks = boundaries.slice(1, -1); // Exclude start and end (already known)
      const stateMap = await this.getStatesInBatches(normalizedAddress, internalBlocks);

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
          logger.warn("[Search] Missing state for segment", i, "- skipping");
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
        if (signal?.aborted) break;
        if (limit > 0 && allTransactions.length >= limit) break;

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
    const blockNumberResult = await this.rpcLimited(() => this.client.blockNumber());
    const nonceResult = await this.rpcLimited(() =>
      this.client.getTransactionCount(address, "latest"),
    );

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
