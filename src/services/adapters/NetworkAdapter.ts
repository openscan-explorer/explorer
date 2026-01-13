import type { SupportedChainId } from "@openscan/network-connectors";
import type {
  Block,
  Transaction,
  Address,
  NetworkStats,
  DataWithMetadata,
  AddressTransactionsResult,
} from "../../types";

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

  constructor(networkId: SupportedChainId | 31337 | 11155111 | 97) {
    this.networkId = networkId;
    this.isLocalHost = networkId === 31337;
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
   * Get transactions for an address
   * @param address - Address to query
   * @param fromBlock - Starting block (optional)
   * @param toBlock - Ending block (optional)
   * @param limit - Maximum number of transactions to return
   * @returns List of transactions
   */
  abstract getAddressTransactions(
    address: string,
    fromBlock?: number | "earliest",
    toBlock?: number | "latest",
    limit?: number,
  ): Promise<AddressTransactionsResult>;

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
