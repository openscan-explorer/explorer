import type { BitcoinClient } from "@openscan/network-connectors";
import type { BitcoinBlock, BitcoinNetworkStats, DataWithMetadata } from "../../../types";
import { extractData } from "../shared/extractData";

/**
 * Bitcoin blockchain adapter (Phase 1 - Dashboard only)
 *
 * Supported methods:
 * - getLatestBlockNumber() - Get current block height
 * - getNetworkStats() - Get blockchain info and mempool stats
 * - getLatestBlocks(count) - Get recent blocks
 *
 * Unsupported methods in Phase 1:
 * - getBlock(), getTransaction(), getAddress() - Not implemented
 */
export class BitcoinAdapter {
  readonly networkId: string;
  private client: BitcoinClient;

  constructor(networkId: string, client: BitcoinClient) {
    this.networkId = networkId;
    this.client = client;
  }

  /**
   * Get the latest block number (block height)
   */
  async getLatestBlockNumber(): Promise<number> {
    const result = await this.client.getBlockCount();
    const blockCount = extractData<number>(result.data);
    return blockCount ?? 0;
  }

  /**
   * Get network statistics including blockchain info and mempool stats
   */
  async getNetworkStats(): Promise<DataWithMetadata<BitcoinNetworkStats>> {
    const [blockchainInfoResult, mempoolInfoResult] = await Promise.all([
      this.client.getBlockchainInfo(),
      this.client.getMempoolInfo(),
    ]);

    const blockchainInfo = extractData<{
      chain: string;
      blocks: number;
      bestblockhash: string;
      difficulty: number;
    }>(blockchainInfoResult.data);

    const mempoolInfo = extractData<{
      size: number;
      bytes: number;
    }>(mempoolInfoResult.data);

    const stats: BitcoinNetworkStats = {
      blockHeight: blockchainInfo?.blocks ?? 0,
      difficulty: blockchainInfo?.difficulty ?? 0,
      mempoolSize: mempoolInfo?.size ?? 0,
      mempoolBytes: mempoolInfo?.bytes ?? 0,
      chain: blockchainInfo?.chain ?? "main",
      bestBlockHash: blockchainInfo?.bestblockhash ?? "",
    };

    return {
      data: stats,
      metadata: blockchainInfoResult.metadata as DataWithMetadata<BitcoinNetworkStats>["metadata"],
    };
  }

  /**
   * Get the latest N blocks
   */
  async getLatestBlocks(count = 10): Promise<BitcoinBlock[]> {
    const blockHeight = await this.getLatestBlockNumber();
    const blocks: BitcoinBlock[] = [];

    for (let i = 0; i < count && blockHeight - i >= 0; i++) {
      const height = blockHeight - i;

      try {
        // First get block hash by height
        const hashResult = await this.client.getBlockHash(height);
        const blockHash = extractData<string>(hashResult.data);

        if (!blockHash) continue;

        // Then get block details
        const blockResult = await this.client.getBlock(blockHash, 1);
        const blockData = extractData<{
          hash: string;
          height: number;
          time: number;
          nTx: number;
          size: number;
          weight: number;
          merkleroot: string;
          previousblockhash?: string;
          version: number;
          bits: string;
          nonce: number;
        }>(blockResult.data);

        if (blockData) {
          blocks.push({
            hash: blockData.hash,
            height: blockData.height,
            time: blockData.time,
            nTx: blockData.nTx,
            size: blockData.size,
            weight: blockData.weight,
            merkleRoot: blockData.merkleroot,
            previousBlockHash: blockData.previousblockhash,
            version: blockData.version,
            bits: blockData.bits,
            nonce: blockData.nonce,
          });
        }
      } catch (error) {
        console.error(`Error fetching Bitcoin block ${height}:`, error);
      }
    }

    return blocks;
  }

  /**
   * Check if this is a Bitcoin network
   */
  isBitcoin(): boolean {
    return true;
  }

  /**
   * Get the network ID (CAIP-2 format)
   */
  getNetworkId(): string {
    return this.networkId;
  }

  // ==================== UNSUPPORTED METHODS (Phase 1) ====================

  /**
   * Get block by hash - Not implemented in Phase 1
   */
  async getBlock(_blockHash: string): Promise<never> {
    throw new Error("Bitcoin block details page not implemented in Phase 1");
  }

  /**
   * Get transaction - Not implemented in Phase 1
   */
  async getTransaction(_txHash: string): Promise<never> {
    throw new Error("Bitcoin transaction details not implemented in Phase 1");
  }

  /**
   * Get address - Not implemented in Phase 1
   */
  async getAddress(_address: string): Promise<never> {
    throw new Error("Bitcoin address lookup not implemented in Phase 1");
  }
}
