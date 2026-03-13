import { type BlockNumberOrTag, NetworkAdapter, type TraceResult } from "../NetworkAdapter";
import type { CallNode, PrestateTrace } from "../NetworkAdapter";
import { normalizeGethCallTrace } from "../../../utils/callTreeUtils";
import type { Block, Transaction, Address, NetworkStats, DataWithMetadata } from "../../../types";
import { logger } from "../../../utils/logger";
import {
  transformBaseBlockToBlock,
  transformBaseTransactionToTransaction,
  createAddressFromBalance,
  hexToNumber,
} from "./utils";

import { normalizeBlockNumber } from "../shared/normalizeBlockNumber";
import { mergeMetadata } from "../shared/mergeMetadata";
import type { BaseClient, EthereumClient } from "@openscan/network-connectors";

/**
 * Base blockchain adapter
 * Extends base NetworkAdapter with Base-specific L1 fee handling (OP Stack)
 * Chain ID: 8453
 */
export class BaseAdapter extends NetworkAdapter {
  private client: BaseClient;

  constructor(networkId: 8453, client: BaseClient) {
    super(networkId);
    this.client = client;
    this.initTxSearch(client as unknown as EthereumClient);
  }

  protected getClient(): EthereumClient {
    return this.client as unknown as EthereumClient;
  }

  async getBlock(blockNumber: BlockNumberOrTag): Promise<DataWithMetadata<Block>> {
    const normalizedBlockNumber = normalizeBlockNumber(blockNumber);
    const result = await this.client.getBlockByNumber(normalizedBlockNumber);

    const blockData = result.data;
    if (!blockData) {
      throw new Error(`Block ${blockNumber} not found`);
    }

    const block = transformBaseBlockToBlock(blockData);

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

    const blockData = result.data;
    if (!blockData) {
      throw new Error(`Block ${blockNumber} not found`);
    }

    const block = transformBaseBlockToBlock(blockData);

    // Extract transaction details
    const transactionDetails: Transaction[] = [];
    if (Array.isArray(blockData.transactions)) {
      for (const tx of blockData.transactions) {
        if (typeof tx !== "string") {
          transactionDetails.push(transformBaseTransactionToTransaction(tx));
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

    const txData = txResult.data;
    if (!txData) {
      throw new Error(`Transaction ${txHash} not found`);
    }

    const receiptData = receiptResult.data;
    const transaction = transformBaseTransactionToTransaction(txData, receiptData);

    // Get timestamp and baseFeePerGas from block if available
    if (txData.blockNumber) {
      try {
        const blockResult = await this.getBlock(txData.blockNumber);

        if (blockResult.data) {
          transaction.timestamp = blockResult.data.timestamp;
          transaction.blockBaseFeePerGas = blockResult.data.baseFeePerGas;
        }
      } catch (error) {
        logger.warn("Failed to fetch block for transaction timestamp:", error);
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

    const balance = balanceResult.data || "0x0";
    const code = codeResult.data || "0x";
    const txCount = txCountResult.data || "0x0";

    const addressData = createAddressFromBalance(address, balance, code, txCount);

    return {
      data: addressData,
      metadata: balanceResult.metadata as DataWithMetadata<Address>["metadata"],
    };
  }

  async getLatestBlockNumber(): Promise<number> {
    const result = await this.client.blockNumber();
    const blockNumber = result.data || "0x0";
    return hexToNumber(blockNumber);
  }

  async getNetworkStats(): Promise<DataWithMetadata<NetworkStats>> {
    const [gasPriceResult, syncingResult, blockNumberResult, versionResult] = await Promise.all([
      this.client.gasPrice(),
      this.client.syncing(),
      this.client.blockNumber(),
      this.client.clientVersion(),
    ]);

    const gasPrice = gasPriceResult.data || "0x0";
    const syncing = syncingResult.data;
    const blockNumber = blockNumberResult.data || "0x0";
    const clientVersion = versionResult.data || "unknown";

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
    maxTransactions?: number,
  ): Promise<DataWithMetadata<Array<Transaction & { blockNumber: string }>>> {
    const transactions: Array<Transaction & { blockNumber: string }> = [];
    const metadataList: Array<DataWithMetadata<Block>["metadata"]> = [];

    for (let i = 0; i < blockCount; i++) {
      if (maxTransactions && transactions.length >= maxTransactions) break;

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
        logger.error(`Error fetching block ${blockNum}:`, error);
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
      logger.warn("Trace methods are only available on localhost networks");
      return null;
    }

    try {
      const result = await this.client.debugTraceTransaction(txHash, {});
      return result.data;
    } catch (error) {
      logger.error("Error getting transaction trace:", error);
      return null;
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Generic trace result
  async getCallTrace(txHash: string): Promise<any> {
    if (!this.isLocalHost) {
      logger.warn("Trace methods are only available on localhost networks");
      return null;
    }

    try {
      const result = await this.client.traceTransaction(txHash);
      return result.data;
    } catch (error) {
      logger.error("Error getting call trace:", error);
      return null;
    }
  }

  async getBlockTrace(blockHash: string): Promise<TraceResult[] | null> {
    if (!this.isLocalHost) {
      logger.warn("Trace methods are only available on localhost networks");
      return null;
    }

    try {
      // Convert block hash to block number first
      const blockResult = await this.client.getBlockByHash(blockHash, false);
      const blockData = blockResult.data;
      if (!blockData) return null;

      const blockNumber = hexToNumber(blockData.number);
      const result = await this.client.traceBlock(blockNumber);
      return result.data;
    } catch (error) {
      logger.error("Error getting block trace:", error);
      return null;
    }
  }
  async getAnalyserCallTrace(txHash: string): Promise<CallNode | null> {
    try {
      const result = await this.client.debugTraceTransaction(txHash, { tracer: "callTracer" });
      return result.data ? normalizeGethCallTrace(result.data) : null;
    } catch (error) {
      logger.error("Error getting analyser call trace:", error);
      return null;
    }
  }

  async getAnalyserPrestateTrace(txHash: string): Promise<PrestateTrace | null> {
    try {
      const result = await this.client.debugTraceTransaction(txHash, {
        tracer: "prestateTracer",
        tracerConfig: { diffMode: true },
      });
      return (result.data as PrestateTrace) ?? null;
    } catch (error) {
      logger.error("Error getting analyser prestate trace:", error);
      return null;
    }
  }
}
