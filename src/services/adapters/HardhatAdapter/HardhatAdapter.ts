import { type BlockNumberOrTag, NetworkAdapter, type TraceResult } from "../NetworkAdapter";
import type { Block, Transaction, Address, NetworkStats, DataWithMetadata } from "../../../types";
import type { CallNode, PrestateTrace } from "../NetworkAdapter";
import {
  buildCallTreeFromStructLogs,
  buildPrestateFromStructLogs,
} from "../../../utils/structLogConverter";
import { logger } from "../../../utils/logger";
import {
  transformRPCBlockToBlock,
  transformRPCTransactionToTransaction,
  createAddressFromBalance,
  hexToNumber,
} from "../EVMAdapter/utils";

import { normalizeBlockNumber } from "../shared/normalizeBlockNumber";
import { mergeMetadata } from "../shared/mergeMetadata";
import type { EthereumClient, HardhatClient } from "@openscan/network-connectors";

/**
 * Hardhat local development network adapter
 * Chain ID: 31337
 * Uses HardhatClient which supports standard Ethereum methods
 * plus Hardhat-specific methods (hardhat_*, evm_*, debug_*, trace_*)
 */
export class HardhatAdapter extends NetworkAdapter {
  private client: HardhatClient;

  constructor(client: HardhatClient) {
    super(31337);
    this.client = client;
    this.initTxSearch(client as unknown as EthereumClient);
  }

  protected getClient(): EthereumClient {
    return this.client as unknown as EthereumClient;
  }

  /**
   * Get the typed HardhatClient for Hardhat-specific operations
   */
  getHardhatClient(): HardhatClient {
    return this.client;
  }

  async getBlock(blockNumber: BlockNumberOrTag): Promise<DataWithMetadata<Block>> {
    const normalizedBlockNumber = normalizeBlockNumber(blockNumber);
    const result = await this.client.getBlockByNumber(normalizedBlockNumber);

    const blockData = result.data;
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

    const blockData = result.data;
    if (!blockData) {
      throw new Error(`Block ${blockNumber} not found`);
    }

    const block = transformRPCBlockToBlock(blockData);

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

    const txData = txResult.data;
    if (!txData) {
      throw new Error(`Transaction ${txHash} not found`);
    }

    const receiptData = receiptResult.data;
    const transaction = transformRPCTransactionToTransaction(txData, receiptData);

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
    return true;
  }

  async getTransactionTrace(txHash: string): Promise<TraceResult | null> {
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
    try {
      const result = await this.client.traceTransaction(txHash);
      return result.data;
    } catch (error) {
      logger.error("Error getting call trace:", error);
      return null;
    }
  }

  async getBlockTrace(blockHash: string): Promise<TraceResult[] | null> {
    try {
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
      // Hardhat v3 does not support callTracer — use default struct log tracer
      // and convert the opcode trace into a call tree.
      const [traceResult, txResult] = await Promise.all([
        this.client.debugTraceTransaction(txHash, {}),
        this.client.getTransactionByHash(txHash),
      ]);

      const trace = traceResult.data as TraceResult | undefined;
      const txData = txResult.data;
      if (!trace?.structLogs || !txData) return null;

      return buildCallTreeFromStructLogs(trace, {
        from: txData.from ?? "",
        to: txData.to ?? "",
        value: txData.value ?? "0x0",
        gas: txData.gas ?? "0x0",
        input: txData.input ?? "0x",
      });
    } catch (error) {
      logger.error("Error getting analyser call trace:", error);
      return null;
    }
  }

  async getAnalyserPrestateTrace(txHash: string): Promise<PrestateTrace | null> {
    try {
      // Hardhat v3 does not support prestateTracer — use default struct log tracer
      // and extract storage changes from SLOAD/SSTORE operations.
      const [traceResult, txResult] = await Promise.all([
        this.client.debugTraceTransaction(txHash, {}),
        this.client.getTransactionByHash(txHash),
      ]);

      const trace = traceResult.data as TraceResult | undefined;
      const txData = txResult.data;
      if (!trace?.structLogs || !txData) return null;

      return buildPrestateFromStructLogs(trace, {
        from: txData.from ?? "",
        to: txData.to ?? "",
        value: txData.value ?? "0x0",
        gas: txData.gas ?? "0x0",
        input: txData.input ?? "0x",
      });
    } catch (error) {
      logger.error("Error getting analyser prestate trace:", error);
      return null;
    }
  }
}
