import { type BlockNumberOrTag, NetworkAdapter } from "../NetworkAdapter";
import type {
  Block,
  Transaction,
  Address,
  NetworkStats,
  DataWithMetadata,
  AddressTransactionsResult,
} from "../../../types";
import type { TraceResult } from "../NetworkAdapter";
import {
  transformRPCBlockToBlock,
  transformRPCTransactionToTransaction,
  createAddressFromBalance,
  hexToNumber,
} from "./utils";
import { extractData } from "../shared/extractData";
import { normalizeBlockNumber } from "../shared/normalizeBlockNumber";
import { mergeMetadata } from "../shared/mergeMetadata";
import type { EthereumClient, SupportedChainId } from "@openscan/network-connectors";
import { AddressTransactionSearch } from "../../AddressTransactionSearch";

/**
 * EVM-compatible blockchain service
 * Supports Ethereum, Arbitrum, Optimism, Base, BSC, Polygon
 */
export class EVMAdapter extends NetworkAdapter {
  private client: EthereumClient;
  private txSearch: AddressTransactionSearch;

  constructor(networkId: SupportedChainId | 11155111 | 97 | 31337, client: EthereumClient) {
    super(networkId);
    this.client = client;
    this.txSearch = new AddressTransactionSearch(client);
  }
  async getBlock(blockNumber: BlockNumberOrTag): Promise<DataWithMetadata<Block>> {
    const normalizedBlockNumber = normalizeBlockNumber(blockNumber);
    const result = await this.client.getBlockByNumber(normalizedBlockNumber);

    const blockData = extractData<typeof result.data>(result.data);
    if (!blockData) {
      throw new Error(`Block ${blockNumber} not found`);
    }

    const block = transformRPCBlockToBlock(blockData);

    return {
      data: block,
      metadata: result.metadata as DataWithMetadata<Block>["metadata"],
    };
  }

  async getBlockWithTransactions(
    blockNumber: BlockNumberOrTag,
  ): Promise<Block & { transactionDetails: Transaction[] }> {
    const normalizedBlockNumber = normalizeBlockNumber(blockNumber);
    const result = await this.client.getBlockByNumber(normalizedBlockNumber, true);

    const blockData = extractData<typeof result.data>(result.data);
    if (!blockData) {
      throw new Error(`Block ${blockNumber} not found`);
    }

    const block = transformRPCBlockToBlock(blockData);

    // Extract transaction details
    const transactionDetails: Transaction[] = [];
    if (Array.isArray(blockData.transactions)) {
      for (const tx of blockData.transactions) {
        if (typeof tx !== "string") {
          transactionDetails.push(transformRPCTransactionToTransaction(tx));
        }
      }
    }

    return {
      ...block,
      transactionDetails,
    };
  }

  async getTransaction(txHash: string): Promise<DataWithMetadata<Transaction>> {
    const [txResult, receiptResult] = await Promise.all([
      this.client.getTransactionByHash(txHash),
      this.client.getTransactionReceipt(txHash),
    ]);

    const txData = extractData<typeof txResult.data>(txResult.data);
    if (!txData) {
      throw new Error(`Transaction ${txHash} not found`);
    }

    const receiptData = extractData<typeof receiptResult.data>(receiptResult.data);
    const transaction = transformRPCTransactionToTransaction(txData, receiptData);

    // Get timestamp and baseFeePerGas from block if available
    if (txData.blockNumber) {
      try {
        const blockResult = await this.getBlock(txData.blockNumber);

        if (blockResult.data) {
          transaction.timestamp = blockResult.data.timestamp;
          transaction.blockBaseFeePerGas = blockResult.data.baseFeePerGas;
        }
      } catch (error) {
        console.warn("Failed to fetch block for transaction timestamp:", error);
      }
    }

    return {
      data: transaction,
      metadata: txResult.metadata as DataWithMetadata<Transaction>["metadata"],
    };
  }

  async getAddress(address: string): Promise<DataWithMetadata<Address>> {
    const [balanceResult, codeResult, txCountResult] = await Promise.all([
      this.client.getBalance(address, "latest"),
      this.client.getCode(address, "latest"),
      this.client.getTransactionCount(address, "latest"),
    ]);

    const balance = extractData<string>(balanceResult.data) || "0x0";
    const code = extractData<string>(codeResult.data) || "0x";
    const txCount = extractData<string>(txCountResult.data) || "0x0";

    const addressData = createAddressFromBalance(address, balance, code, txCount);

    return {
      data: addressData,
      metadata: balanceResult.metadata as DataWithMetadata<Address>["metadata"],
    };
  }

  async getAddressTransactions(
    address: string,
    _fromBlock?: number | "earliest",
    toBlock?: number | "latest",
    limit = 100,
    onTransactionsFound?: (txs: Transaction[]) => void,
  ): Promise<AddressTransactionsResult> {
    try {
      // Use binary search on nonce/balance to find important blocks
      // Pass the streaming callback to get transactions as they are found
      const result = await this.txSearch.searchAddressActivity(address, {
        limit,
        toBlock: typeof toBlock === "number" ? toBlock : undefined,
        onTransactionsFound: onTransactionsFound
          ? (txs) => {
              // Strip the 'type' property from transactions before passing to callback
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

      // Extract transaction hashes and clean transaction details
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

  async getLatestBlockNumber(): Promise<number> {
    const result = await this.client.blockNumber();
    const blockNumber = extractData<string>(result.data) || "0x0";
    return hexToNumber(blockNumber);
  }

  async getNetworkStats(): Promise<DataWithMetadata<NetworkStats>> {
    const [gasPriceResult, syncingResult, blockNumberResult, versionResult] = await Promise.all([
      this.client.gasPrice(),
      this.client.syncing(),
      this.client.blockNumber(),
      this.client.clientVersion(),
    ]);

    // Extract actual data from strategy results (handles both fallback and parallel modes)
    const gasPrice = extractData<string>(gasPriceResult.data) || "0x0";
    const syncing = extractData<boolean | object>(syncingResult.data);
    const blockNumber = extractData<string>(blockNumberResult.data) || "0x0";
    const clientVersion = extractData<string>(versionResult.data) || "unknown";

    const stats: NetworkStats = {
      currentGasPrice: gasPrice,
      isSyncing: typeof syncing === "boolean" ? syncing : true,
      currentBlockNumber: blockNumber,
      clientVersion: clientVersion,
      metadata: {},
    };

    return {
      data: stats,
      metadata: gasPriceResult.metadata as DataWithMetadata<NetworkStats>["metadata"],
    };
  }

  async getLatestBlocks(count = 10): Promise<Block[]> {
    const latestBlockNumber = await this.getLatestBlockNumber();
    const blocks: Block[] = [];

    const promises = [];
    for (let i = 0; i < count; i++) {
      const blockNum = latestBlockNumber - i;
      if (blockNum >= 0) {
        promises.push(this.getBlock(blockNum));
      }
    }

    const results = await Promise.all(promises);
    for (const result of results) {
      blocks.push(result.data);
    }

    return blocks;
  }

  async getTransactionsFromLatestBlocks(
    blockCount = 10,
  ): Promise<Array<Transaction & { blockNumber: string }>> {
    const latestBlockNumber = await this.getLatestBlockNumber();
    const result = await this.getTransactionsFromBlockRange(latestBlockNumber, blockCount);
    return result.data;
  }

  async getTransactionsFromBlockRange(
    fromBlock: number,
    blockCount = 10,
  ): Promise<DataWithMetadata<Array<Transaction & { blockNumber: string }>>> {
    const transactions: Array<Transaction & { blockNumber: string }> = [];
    const metadataList: Array<DataWithMetadata<Block>["metadata"]> = [];

    for (let i = 0; i < blockCount; i++) {
      const blockNum = fromBlock - i;
      if (blockNum < 0) break;

      try {
        const blockResult = await this.getBlock(blockNum);
        const blockWithTxs = await this.getBlockWithTransactions(blockNum);

        // Collect metadata from block fetch
        metadataList.push(blockResult.metadata);

        for (const tx of blockWithTxs.transactionDetails) {
          transactions.push({
            ...tx,
            blockNumber: blockWithTxs.number,
          });
        }
      } catch (error) {
        console.error(`Error fetching block ${blockNum}:`, error);
      }
    }

    // Merge metadata from all block fetches
    const mergedMetadata =
      mergeMetadata<Array<Transaction & { blockNumber: string }>>(metadataList);

    return {
      data: transactions,
      metadata: mergedMetadata,
    };
  }

  getChainId(): number {
    return this.networkId;
  }

  isTraceAvailable(): boolean {
    return this.isLocalHost;
  }

  async getTransactionTrace(txHash: string): Promise<TraceResult | null> {
    if (!this.isLocalHost) {
      console.warn("Trace methods are only available on localhost networks");
      return null;
    }

    try {
      const result = await this.client.debugTraceTransaction(txHash, {});
      return extractData<TraceResult | null>(result.data);
    } catch (error) {
      console.error("Error getting transaction trace:", error);
      return null;
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Generic trace result
  async getCallTrace(txHash: string): Promise<any> {
    if (!this.isLocalHost) {
      console.warn("Trace methods are only available on localhost networks");
      return null;
    }

    try {
      const result = await this.client.traceTransaction(txHash);
      // biome-ignore lint/suspicious/noExplicitAny: Generic trace result type
      return extractData<any>(result.data);
    } catch (error) {
      console.error("Error getting call trace:", error);
      return null;
    }
  }

  async getBlockTrace(blockHash: string): Promise<TraceResult[] | null> {
    if (!this.isLocalHost) {
      console.warn("Trace methods are only available on localhost networks");
      return null;
    }

    try {
      // Convert block hash to block number first
      const blockResult = await this.client.getBlockByHash(blockHash, false);
      const blockData = extractData<typeof blockResult.data>(blockResult.data);
      if (!blockData) return null;

      const blockNumber = hexToNumber(blockData.number);
      const result = await this.client.traceBlock(blockNumber);
      return extractData<TraceResult[] | null>(result.data);
    } catch (error) {
      console.error("Error getting block trace:", error);
      return null;
    }
  }
}
