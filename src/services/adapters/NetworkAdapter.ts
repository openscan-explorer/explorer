import type { SupportedChainId, EthereumClient } from "@openscan/network-connectors";
import type {
  Block,
  Transaction,
  Address,
  NetworkStats,
  DataWithMetadata,
  AddressTransactionsResult,
} from "../../types";
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
