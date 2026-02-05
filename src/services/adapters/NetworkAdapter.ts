import type { SupportedChainId, EthereumClient } from "@openscan/network-connectors";
import type {
  Block,
  Transaction,
  Address,
  NetworkStats,
  DataWithMetadata,
  AddressTransactionsResult,
  GasPrices,
} from "../../types";
import { extractData } from "./shared/extractData";
import { AddressTransactionSearch } from "../AddressTransactionSearch";

export type BlockTag = "latest" | "earliest" | "pending" | "finalized" | "safe";
export type BlockNumberOrTag = number | string | BlockTag;

export interface TraceLog {
  pc: number;
  op: string;
  gas: number;
  gasCost: number;
  depth: number;
  stack: string[];
  memory?: string[];
  storage?: Record<string, string>;
}

export interface TraceResult {
  gas: number;
  failed: boolean;
  returnValue: string;
  structLogs: TraceLog[];
}

export interface TraceCallConfig {
  tracer?: string;
  timeout?: string;
  tracerConfig?: {
    onlyTopCall?: boolean;
    withLog?: boolean;
  };
}
/**
 * Base interface for blockchain-specific services
 * All chain implementations must conform to this unified API
 */
export abstract class NetworkAdapter {
  networkId: number;
  isLocalHost: boolean;
  protected txSearch: AddressTransactionSearch | null = null;

  constructor(networkId: SupportedChainId | 31337 | 11155111 | 97) {
    this.networkId = networkId;
    this.isLocalHost = networkId === 31337;
  }

  /**
   * Get the Ethereum client for RPC calls
   * Each adapter must implement this to provide its client
   */
  protected abstract getClient(): EthereumClient;

  /**
   * Initialize the transaction search service
   * Call this in subclass constructors to enable binary search tx discovery
   */
  protected initTxSearch(client: EthereumClient): void {
    this.txSearch = new AddressTransactionSearch(client);
  }

  /**
   * Get block by number or tag
   * @param blockNumber - Block number (as number or hex string) or block tag
   * @returns Block data with optional metadata
   */
  abstract getBlock(blockNumber: number | BlockNumberOrTag): Promise<DataWithMetadata<Block>>;

  /**
   * Get block with full transaction details
   * @param blockNumber - Block number (as number or hex string) or block tag
   * @returns Block with embedded transaction objects
   */
  abstract getBlockWithTransactions(
    blockNumber: number | BlockNumberOrTag,
  ): Promise<Block & { transactionDetails: Transaction[] }>;

  /**
   * Get transaction by hash
   * @param txHash - Transaction hash
   * @returns Transaction data with receipt
   */
  abstract getTransaction(txHash: string): Promise<DataWithMetadata<Transaction>>;

  /**
   * Get address information
   * @param address - Address to query
   * @returns Address balance, code, and transaction count
   */
  abstract getAddress(address: string): Promise<DataWithMetadata<Address>>;

  /**
   * Get transactions for an address using binary search on nonce/balance changes
   * @param address - Address to query
   * @param fromBlock - Starting block (optional)
   * @param toBlock - Ending block (optional)
   * @param limit - Maximum number of transactions to return
   * @param onTransactionsFound - Callback for streaming results
   * @returns List of transactions
   */
  async getAddressTransactions(
    address: string,
    fromBlock?: number | "earliest",
    toBlock?: number | "latest",
    limit = 100,
    onTransactionsFound?: (txs: Transaction[]) => void,
    signal?: AbortSignal,
  ): Promise<AddressTransactionsResult> {
    if (!this.txSearch) {
      return {
        transactions: [],
        source: "none",
        isComplete: false,
        message: "Transaction search not initialized for this network",
      };
    }

    try {
      const result = await this.txSearch.searchAddressActivity(address, {
        limit,
        toBlock: typeof toBlock === "number" ? toBlock : undefined,
        fromBlock: typeof fromBlock === "number" ? fromBlock : undefined,
        onTransactionsFound: onTransactionsFound
          ? (txs) => {
              const cleanTxs = txs.map(({ type: _type, ...tx }) => tx as Transaction);
              onTransactionsFound(cleanTxs);
            }
          : undefined,
        signal,
      });

      if (result.transactions.length === 0) {
        return {
          transactions: [],
          transactionDetails: [],
          source: "none",
          isComplete: true,
          message: "No transactions found for this address",
        };
      }

      const txHashes = result.transactions.map((tx) => tx.hash);
      const txDetails = result.transactions.map(({ type: _type, ...tx }) => tx as Transaction);

      return {
        transactions: txHashes,
        transactionDetails: txDetails,
        source: "binary_search",
        isComplete: result.stats.totalTxs < limit || limit === 0,
        message:
          limit > 0 && result.stats.totalTxs >= limit
            ? `Showing ${limit} transactions (more may exist)`
            : undefined,
      };
    } catch (error) {
      console.error("Error searching address transactions:", error);

      return {
        transactions: [],
        transactionDetails: [],
        source: "none",
        isComplete: false,
        message:
          error instanceof Error
            ? `Search failed: ${error.message}`
            : "Address transaction lookup failed",
      };
    }
  }

  /**
   * Find the smallest recent block range with address activity.
   * Uses exponential search from the chain tip.
   * Used for fast initial search on address page load.
   */
  async findRecentActivityRange(
    address: string,
    initialRange?: number,
    signal?: AbortSignal,
  ): Promise<{ fromBlock: number; toBlock: number } | null> {
    if (!this.txSearch) return null;
    return this.txSearch.findRecentActivityRange(address, initialRange, signal);
  }

  /**
   * Get the latest block number
   * @returns Latest block number
   */
  abstract getLatestBlockNumber(): Promise<number>;

  /**
   * Get network statistics
   * @returns Gas price, sync status, block number, etc.
   */
  abstract getNetworkStats(): Promise<DataWithMetadata<NetworkStats>>;

  /**
   * Get gas prices with tiers (Low/Average/High) using eth_feeHistory
   * @returns Gas price tiers and base fee
   */
  async getGasPrices(): Promise<DataWithMetadata<GasPrices>> {
    const client = this.getClient();

    // Fetch fee history for last 20 blocks with 25th, 50th, 75th percentiles
    const feeHistoryResult = await client.feeHistory("0x14", "latest", [25, 50, 75]);
    const feeHistory = extractData<{
      baseFeePerGas: string[];
      gasUsedRatio: number[];
      oldestBlock: string;
      reward?: string[][];
    }>(feeHistoryResult.data);

    if (!feeHistory || !feeHistory.reward || feeHistory.reward.length === 0) {
      // Fallback to simple gas price if feeHistory not available
      const gasPriceResult = await client.gasPrice();
      const gasPrice = extractData<string>(gasPriceResult.data) || "0x0";
      const blockNumResult = await client.blockNumber();
      const blockNum = extractData<string>(blockNumResult.data) || "0x0";

      return {
        data: {
          low: gasPrice,
          average: gasPrice,
          high: gasPrice,
          baseFee: gasPrice,
          lastBlock: blockNum,
        },
        metadata: gasPriceResult.metadata as DataWithMetadata<GasPrices>["metadata"],
      };
    }

    // Calculate average priority fees across all blocks for each percentile
    const rewards = feeHistory.reward;
    let lowSum = BigInt(0);
    let avgSum = BigInt(0);
    let highSum = BigInt(0);
    let count = 0;

    for (const blockRewards of rewards) {
      if (blockRewards && blockRewards.length >= 3) {
        lowSum += BigInt(blockRewards[0] || "0x0");
        avgSum += BigInt(blockRewards[1] || "0x0");
        highSum += BigInt(blockRewards[2] || "0x0");
        count++;
      }
    }

    // Get the latest base fee (last element in baseFeePerGas array)
    const baseFees = feeHistory.baseFeePerGas;
    const latestBaseFee = baseFees[baseFees.length - 1] || "0x0";

    // Calculate averages
    const lowPriorityFee = count > 0 ? lowSum / BigInt(count) : BigInt(0);
    const avgPriorityFee = count > 0 ? avgSum / BigInt(count) : BigInt(0);
    const highPriorityFee = count > 0 ? highSum / BigInt(count) : BigInt(0);

    // Total gas price = base fee + priority fee
    const baseFeeNum = BigInt(latestBaseFee);
    const low = baseFeeNum + lowPriorityFee;
    const average = baseFeeNum + avgPriorityFee;
    const high = baseFeeNum + highPriorityFee;

    // Calculate last block number
    const oldestBlock = BigInt(feeHistory.oldestBlock);
    const lastBlock = oldestBlock + BigInt(baseFees.length - 1);

    return {
      data: {
        low: `0x${low.toString(16)}`,
        average: `0x${average.toString(16)}`,
        high: `0x${high.toString(16)}`,
        baseFee: latestBaseFee,
        lastBlock: `0x${lastBlock.toString(16)}`,
      },
      metadata: feeHistoryResult.metadata as DataWithMetadata<GasPrices>["metadata"],
    };
  }

  /**
   * Get latest N blocks
   * @param count - Number of blocks to retrieve
   * @returns Array of blocks
   */
  abstract getLatestBlocks(count?: number): Promise<Block[]>;

  /**
   * Get transactions from latest blocks
   * @param blockCount - Number of blocks to scan
   * @returns Array of transactions with block numbers
   */
  abstract getTransactionsFromLatestBlocks(
    blockCount?: number,
  ): Promise<Array<Transaction & { blockNumber: string }>>;

  /**
   * Get transactions from a range of blocks
   * @param fromBlock - Starting block number
   * @param blockCount - Number of blocks to scan
   * @returns Array of transactions with block numbers and metadata
   */
  abstract getTransactionsFromBlockRange(
    fromBlock: number,
    blockCount?: number,
  ): Promise<DataWithMetadata<Array<Transaction & { blockNumber: string }>>>;

  /**
   * Get chain ID
   * @returns Chain ID
   */
  abstract getChainId(): number;

  /**
   * Check if trace methods are available
   * @returns true if trace methods are supported
   */
  abstract isTraceAvailable(): boolean;

  /**
   * Get transaction trace (debug mode)
   * @param txHash - Transaction hash
   * @returns Trace result or null
   */
  abstract getTransactionTrace(txHash: string): Promise<TraceResult | null>;

  /**
   * Get call trace (debug mode)
   * @param txHash - Transaction hash
   * @returns Trace result or null
   */
  // biome-ignore lint/suspicious/noExplicitAny: Generic trace result type
  abstract getCallTrace(txHash: string): Promise<any>;

  /**
   * Get block trace (debug mode)
   * @param blockHash - Block hash
   * @returns Array of trace results or null
   */
  abstract getBlockTrace(blockHash: string): Promise<TraceResult[] | null>;
}
