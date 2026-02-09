import type { BitcoinClient } from "@openscan/network-connectors";
import type {
  BitcoinAddress,
  BitcoinAddressType,
  BitcoinBlock,
  BitcoinNetworkStats,
  BitcoinTransaction,
  BitcoinUTXO,
  DataWithMetadata,
} from "../../../types";
import { logger } from "../../../utils/logger";
import { extractData } from "../shared/extractData";

/**
 * Bitcoin blockchain adapter
 *
 * Supported methods:
 * - getLatestBlockNumber() - Get current block height
 * - getNetworkStats() - Get blockchain info and mempool stats
 * - getLatestBlocks(count) - Get recent blocks
 * - getBlock(hashOrHeight) - Get block details
 * - getTransaction(txid) - Get transaction details
 * - getAddress(address) - Get address info with UTXOs
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
   * Get the latest N blocks (fetched in parallel for performance)
   */
  async getLatestBlocks(count = 10): Promise<BitcoinBlock[]> {
    const blockHeight = await this.getLatestBlockNumber();
    const heights: number[] = [];

    for (let i = 0; i < count && blockHeight - i >= 0; i++) {
      heights.push(blockHeight - i);
    }

    // Fetch all block hashes in parallel
    const hashResults = await Promise.all(
      heights.map((height) => this.client.getBlockHash(height).catch(() => null)),
    );

    const hashes = hashResults
      .map((result) => (result ? extractData<string>(result.data) : null))
      .filter((hash): hash is string => hash !== null);

    // Fetch all block details in parallel
    const blockResults = await Promise.all(
      hashes.map((hash) => this.client.getBlock(hash, 1).catch(() => null)),
    );

    const blocks: BitcoinBlock[] = [];

    for (const result of blockResults) {
      if (!result) continue;

      const blockData = extractData<{
        hash: string;
        height: number;
        time: number;
        nTx?: number;
        tx?: string[];
        size: number;
        weight: number;
        merkleroot: string;
        previousblockhash?: string;
        version: number;
        bits: string;
        nonce: number;
      }>(result.data);

      if (blockData) {
        blocks.push({
          hash: blockData.hash,
          height: blockData.height,
          time: blockData.time,
          nTx: blockData.nTx || blockData.tx?.length || 0,
          size: blockData.size,
          weight: blockData.weight,
          merkleRoot: blockData.merkleroot,
          previousBlockHash: blockData.previousblockhash,
          version: blockData.version,
          bits: blockData.bits,
          nonce: blockData.nonce,
        });
      }
    }

    // Sort by height descending (in case parallel responses came out of order)
    return blocks.sort((a, b) => b.height - a.height);
  }

  /**
   * Get the latest N block headers (lighter than full blocks, for dashboard)
   * Uses getBlockHeader which doesn't include size/weight or txids
   */
  async getLatestBlockHeaders(count = 10): Promise<BitcoinBlock[]> {
    const blockHeight = await this.getLatestBlockNumber();
    const heights: number[] = [];

    for (let i = 0; i < count && blockHeight - i >= 0; i++) {
      heights.push(blockHeight - i);
    }

    // Fetch all block hashes in parallel
    const hashResults = await Promise.all(
      heights.map((height) => this.client.getBlockHash(height).catch(() => null)),
    );

    const hashes = hashResults
      .map((result) => (result ? extractData<string>(result.data) : null))
      .filter((hash): hash is string => hash !== null);

    // Fetch all block headers in parallel (lighter than full blocks)
    const headerResults = await Promise.all(
      hashes.map((hash) => this.client.getBlockHeader(hash, true).catch(() => null)),
    );

    const blocks: BitcoinBlock[] = [];

    for (const result of headerResults) {
      if (!result) continue;

      const headerData = extractData<{
        hash: string;
        height: number;
        time: number;
        nTx?: number;
        merkleroot: string;
        previousblockhash?: string;
        version: number;
        bits: string;
        nonce: number;
      }>(result.data);

      if (headerData) {
        blocks.push({
          hash: headerData.hash,
          height: headerData.height,
          time: headerData.time,
          nTx: headerData.nTx || 0,
          size: 0, // Not available in header
          weight: 0, // Not available in header
          merkleRoot: headerData.merkleroot,
          previousBlockHash: headerData.previousblockhash,
          version: headerData.version,
          bits: headerData.bits,
          nonce: headerData.nonce,
        });
      }
    }

    // Sort by height descending (in case parallel responses came out of order)
    return blocks.sort((a, b) => b.height - a.height);
  }

  /**
   * Get the latest N confirmed transactions from recent blocks
   * Fetches blocks with verbosity 2 to get full transaction data
   */
  async getLatestTransactions(count = 100): Promise<BitcoinTransaction[]> {
    const blockHeight = await this.getLatestBlockNumber();
    const transactions: BitcoinTransaction[] = [];

    // Fetch blocks until we have enough transactions
    // Most blocks have 2000+ txs, so we usually only need 1 block
    let blocksToFetch = 1;
    let currentHeight = blockHeight;

    while (transactions.length < count && currentHeight >= 0 && blocksToFetch <= 5) {
      try {
        // Get block hash
        const hashResult = await this.client.getBlockHash(currentHeight);
        const blockHash = extractData<string>(hashResult.data);

        if (!blockHash) {
          currentHeight--;
          blocksToFetch++;
          continue;
        }

        // Get block with full transaction data (verbosity 2)
        const blockResult = await this.client.getBlock(blockHash, 2);
        // biome-ignore lint/suspicious/noExplicitAny: RPC response type varies
        const blockData = extractData<any>(blockResult.data);

        if (blockData?.tx) {
          // Transform and add transactions (newest first within block)
          for (const rawTx of blockData.tx) {
            if (transactions.length >= count) break;
            transactions.push(this.transformTransaction(rawTx));
          }
        }

        currentHeight--;
        blocksToFetch++;
      } catch (error) {
        logger.error(`Error fetching Bitcoin block ${currentHeight}:`, error);
        currentHeight--;
        blocksToFetch++;
      }
    }

    return transactions.slice(0, count);
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

  // ==================== DETAIL PAGE METHODS ====================

  /**
   * Detect Bitcoin address type from address string
   */
  private detectAddressType(address: string): BitcoinAddressType {
    // Mainnet prefixes
    if (address.startsWith("bc1p")) return "taproot";
    if (address.startsWith("bc1q")) return "segwit";
    if (address.startsWith("3")) return "p2sh";
    if (address.startsWith("1")) return "legacy";
    // Testnet prefixes
    if (address.startsWith("tb1p")) return "taproot";
    if (address.startsWith("tb1q")) return "segwit";
    if (address.startsWith("2")) return "p2sh";
    if (address.startsWith("m") || address.startsWith("n")) return "legacy";
    return "unknown";
  }

  /**
   * Transform raw RPC transaction to typed BitcoinTransaction
   */
  // biome-ignore lint/suspicious/noExplicitAny: RPC response type varies
  private transformTransaction(rawTx: any): BitcoinTransaction {
    // Use pre-set fee (from mempool entry) or calculate from inputs - outputs
    let fee: number | undefined = rawTx.fee;

    if (fee === undefined && rawTx.vin && rawTx.vout) {
      const inputSum = rawTx.vin.reduce((sum: number, input: { prevout?: { value: number } }) => {
        return sum + (input.prevout?.value || 0);
      }, 0);
      const outputSum = rawTx.vout.reduce((sum: number, output: { value: number }) => {
        return sum + output.value;
      }, 0);
      if (inputSum > 0) {
        fee = inputSum - outputSum;
      }
    }

    return {
      txid: rawTx.txid,
      hash: rawTx.hash || rawTx.txid,
      version: rawTx.version ?? 2,
      size: rawTx.size ?? rawTx.vsize ?? 0,
      vsize: rawTx.vsize ?? rawTx.size ?? 0,
      weight: rawTx.weight ?? 0,
      locktime: rawTx.locktime ?? 0,
      vin: rawTx.vin || [],
      vout: rawTx.vout || [],
      blockhash: rawTx.blockhash,
      confirmations: rawTx.confirmations ?? 0,
      blocktime: rawTx.blocktime,
      time: rawTx.time,
      fee,
    };
  }

  /**
   * Convert hex string to ASCII (browser-compatible)
   */
  private hexToAscii(hex: string): string {
    let result = "";
    for (let i = 0; i < hex.length; i += 2) {
      const byte = parseInt(hex.substring(i, i + 2), 16);
      result += String.fromCharCode(byte);
    }
    return result;
  }

  /**
   * Extract coinbase data: miner name, full message, and raw hex
   */
  private extractCoinbaseData(coinbaseTx: { vin: Array<{ coinbase?: string }> }): {
    miner?: string;
    message?: string;
    hex?: string;
  } {
    const coinbaseHex = coinbaseTx.vin[0]?.coinbase;
    if (!coinbaseHex) return {};

    let miner: string | undefined;
    let message: string | undefined;

    try {
      // Convert hex to ASCII (browser-compatible)
      const ascii = this.hexToAscii(coinbaseHex);

      // Extract readable ASCII characters for the message
      // Replace non-printable chars with spaces, then clean up
      const readable = ascii
        .replace(/[^\x20-\x7E]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (readable.length > 0) {
        message = readable;
      }

      // Common pool identifiers for miner detection
      const poolPatterns = [
        /Foundry/i,
        /AntPool/i,
        /F2Pool/i,
        /ViaBTC/i,
        /Binance/i,
        /Poolin/i,
        /SlushPool/i,
        /BTC\.com/i,
        /MARA Pool/i,
        /Luxor/i,
        /SBI Crypto/i,
        /SpiderPool/i,
        /btc\.top/i,
        /BTCC/i,
        /BitFury/i,
        /Braiins/i,
      ];

      for (const pattern of poolPatterns) {
        const match = ascii.match(pattern);
        if (match) {
          miner = match[0];
          break;
        }
      }
    } catch {
      // Ignore parsing errors
    }

    return { miner, message, hex: coinbaseHex };
  }

  /**
   * Get block by hash or height with full statistics
   * Uses verbosity 2 to get complete transaction data for stats calculation
   */
  async getBlock(blockHashOrHeight: string | number): Promise<DataWithMetadata<BitcoinBlock>> {
    let blockHash: string;

    // If numeric, get the hash first
    if (typeof blockHashOrHeight === "number" || /^\d+$/.test(String(blockHashOrHeight))) {
      const height =
        typeof blockHashOrHeight === "number" ? blockHashOrHeight : Number(blockHashOrHeight);
      const hashResult = await this.client.getBlockHash(height);
      const hash = extractData<string>(hashResult.data);
      if (!hash) {
        throw new Error(`Block at height ${blockHashOrHeight} not found`);
      }
      blockHash = hash;
    } else {
      blockHash = blockHashOrHeight;
    }

    // Fetch block with verbosity 2 and header in parallel
    // Header gives us reliable nTx count, verbosity 2 gives full tx data for stats
    const [blockResult, headerResult] = await Promise.all([
      this.client.getBlock(blockHash, 2),
      this.client.getBlockHeader(blockHash, true).catch(() => null),
    ]);

    // biome-ignore lint/suspicious/noExplicitAny: RPC response varies
    const blockData = extractData<any>(blockResult.data);
    const headerData = headerResult
      ? extractData<{ nTx?: number; size?: number; weight?: number }>(headerResult.data)
      : null;

    if (!blockData) {
      throw new Error(`Block ${blockHashOrHeight} not found`);
    }

    // Calculate statistics from transactions
    let totalFees = 0;
    let totalOutputValue = 0;
    let inputCount = 0;
    let outputCount = 0;
    const feeRates: number[] = [];
    let blockReward = 0;
    let miner: string | undefined;
    let coinbaseMessage: string | undefined;
    let coinbaseHex: string | undefined;

    // biome-ignore lint/suspicious/noExplicitAny: RPC response varies
    const transactions: any[] = blockData.tx || [];
    const txids: string[] = [];

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      txids.push(tx.txid);

      const txOutputSum = tx.vout.reduce(
        // biome-ignore lint/suspicious/noExplicitAny: RPC response varies
        (sum: number, out: any) => sum + (out.value || 0),
        0,
      );
      const txInputSum = tx.vin.reduce(
        // biome-ignore lint/suspicious/noExplicitAny: RPC response varies
        (sum: number, inp: any) => sum + (inp.prevout?.value || 0),
        0,
      );

      outputCount += tx.vout.length;
      inputCount += tx.vin.length;
      totalOutputValue += txOutputSum;

      if (i === 0) {
        // Coinbase transaction
        blockReward = txOutputSum;
        const coinbaseData = this.extractCoinbaseData(tx);
        miner = coinbaseData.miner;
        coinbaseMessage = coinbaseData.message;
        coinbaseHex = coinbaseData.hex;
      } else {
        // Regular transaction - calculate fee
        if (txInputSum > 0) {
          const fee = txInputSum - txOutputSum;
          totalFees += fee;
          // Fee rate in sat/vB
          if (tx.vsize > 0) {
            feeRates.push((fee * 100000000) / tx.vsize);
          }
        }
      }
    }

    // Calculate fee rate statistics
    let feeRateAvg: number | undefined;
    let feeRateMedian: number | undefined;
    if (feeRates.length > 0) {
      feeRateAvg = feeRates.reduce((a, b) => a + b, 0) / feeRates.length;
      const sorted = [...feeRates].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      feeRateMedian =
        sorted.length % 2 !== 0 ? sorted[mid] : ((sorted[mid - 1] || 0) + (sorted[mid] || 0)) / 2;
    }

    const block: BitcoinBlock = {
      hash: blockData.hash,
      height: blockData.height,
      time: blockData.time,
      nTx: headerData?.nTx || blockData.nTx || txids.length,
      size: headerData?.size || blockData.size,
      weight: headerData?.weight || blockData.weight,
      merkleRoot: blockData.merkleroot,
      previousBlockHash: blockData.previousblockhash,
      nextBlockHash: blockData.nextblockhash,
      version: blockData.version,
      bits: blockData.bits,
      nonce: blockData.nonce,
      txids,
      // Extended stats
      confirmations: blockData.confirmations,
      difficulty: blockData.difficulty,
      totalFees,
      totalOutputValue,
      inputCount,
      outputCount,
      blockReward,
      miner,
      coinbaseMessage,
      coinbaseHex,
      feeRateAvg,
      feeRateMedian,
    };

    return {
      data: block,
      metadata: blockResult.metadata as DataWithMetadata<BitcoinBlock>["metadata"],
    };
  }

  /**
   * Get transaction by txid
   * Tries multiple approaches to handle both confirmed and mempool transactions
   */
  async getTransaction(txid: string): Promise<DataWithMetadata<BitcoinTransaction>> {
    // biome-ignore lint/suspicious/noExplicitAny: RPC response type varies
    let txData: any = null;
    // biome-ignore lint/suspicious/noExplicitAny: Metadata type varies
    let metadata: any;

    // Try verbosity 2 first to get prevout data for fee calculation (confirmed txs)
    try {
      const txResult = await this.client.getRawTransaction(txid, 2);
      txData = extractData<unknown>(txResult.data);
      metadata = txResult.metadata;
    } catch {
      // Verbosity 2 failed
    }

    // Fallback to verbosity 1 (works for mempool txs on more nodes)
    if (!txData) {
      try {
        const txResult = await this.client.getRawTransaction(txid, 1);
        txData = extractData<unknown>(txResult.data);
        metadata = txResult.metadata;
      } catch {
        // Verbosity 1 also failed
      }
    }

    // Fallback to verbosity 0 (raw hex) + decode (some nodes only support this)
    if (!txData) {
      try {
        const rawResult = await this.client.getRawTransaction(txid, 0);
        const rawHex = extractData<string>(rawResult.data);
        if (rawHex && typeof rawHex === "string") {
          const decodeResult = await this.client.decodeRawTransaction(rawHex);
          txData = extractData<unknown>(decodeResult.data);
          metadata = rawResult.metadata;
        }
      } catch {
        // Raw hex approach also failed
      }
    }

    // If we have transaction data, check if it's a mempool tx and enrich with mempool entry
    if (txData) {
      // For mempool transactions (no blockhash), try to get fee data from mempool entry
      if (!txData.blockhash) {
        try {
          const mempoolResult = await this.client.getMempoolEntry(txid);
          const mempoolEntry = extractData<{
            vsize: number;
            weight: number;
            fees: { base: number };
            time: number;
            "bip125-replaceable": boolean;
          }>(mempoolResult.data);

          if (mempoolEntry) {
            // Enrich transaction with mempool data
            txData.vsize = txData.vsize || mempoolEntry.vsize;
            txData.weight = txData.weight || mempoolEntry.weight;
            txData.time = txData.time || mempoolEntry.time;
            // Fee from mempool entry is in BTC
            if (mempoolEntry.fees?.base !== undefined) {
              txData.fee = mempoolEntry.fees.base;
            }
          }
        } catch {
          // Mempool entry not available, continue with what we have
        }
      }

      return {
        data: this.transformTransaction(txData),
        metadata: metadata as DataWithMetadata<BitcoinTransaction>["metadata"],
      };
    }

    // Last resort: check if tx exists in mempool even if getRawTransaction failed
    try {
      const mempoolResult = await this.client.getMempoolEntry(txid);
      const mempoolEntry = extractData<{
        vsize: number;
        weight: number;
        fees: { base: number };
        time: number;
        wtxid: string;
        "bip125-replaceable": boolean;
      }>(mempoolResult.data);

      if (mempoolEntry) {
        // Transaction is in mempool but we couldn't get full data
        // Return minimal data from mempool entry
        const minimalTx: BitcoinTransaction = {
          txid,
          hash: mempoolEntry.wtxid || txid,
          version: 2,
          size: mempoolEntry.vsize, // Approximate
          vsize: mempoolEntry.vsize,
          weight: mempoolEntry.weight,
          locktime: 0,
          vin: [],
          vout: [],
          confirmations: 0,
          time: mempoolEntry.time,
          fee: mempoolEntry.fees?.base,
        };

        return {
          data: minimalTx,
          metadata: mempoolResult.metadata as DataWithMetadata<BitcoinTransaction>["metadata"],
        };
      }
    } catch {
      // Not in mempool either
    }

    // Last attempt: Check if output 0 exists in UTXO set (confirms tx exists even if we can't get details)
    try {
      const utxoResult = await this.client.getTxOut(txid, 0, true);
      const utxo = extractData<{
        bestblock: string;
        confirmations: number;
        value: number;
        scriptPubKey: { address?: string; type: string };
      } | null>(utxoResult.data);

      if (utxo) {
        // Transaction exists! Build minimal tx from UTXO data
        const minimalTx: BitcoinTransaction = {
          txid,
          hash: txid,
          version: 2,
          size: 0,
          vsize: 0,
          weight: 0,
          locktime: 0,
          vin: [],
          vout: [
            {
              value: utxo.value,
              n: 0,
              scriptPubKey: {
                address: utxo.scriptPubKey?.address,
                type: utxo.scriptPubKey?.type || "unknown",
                asm: "",
                hex: "",
              },
            },
          ],
          confirmations: utxo.confirmations,
        };

        return {
          data: minimalTx,
          metadata: utxoResult.metadata as DataWithMetadata<BitcoinTransaction>["metadata"],
        };
      }
    } catch {
      // getTxOut also failed
    }

    throw new Error(
      `Transaction ${txid} not found. Note: Public Bitcoin nodes may not support transaction lookups without txindex enabled.`,
    );
  }

  /**
   * Get address information including balance and UTXOs
   * Uses scanTxOutSet to query any address (doesn't require wallet)
   */
  async getAddress(address: string): Promise<DataWithMetadata<BitcoinAddress>> {
    const addressType = this.detectAddressType(address);

    try {
      // Use scanTxOutSet with addr() descriptor to query any address
      // This works without requiring the address to be in a wallet
      const scanResult = await this.client.scanTxOutSet("start", [`addr(${address})`]);
      // biome-ignore lint/suspicious/noExplicitAny: RPC response type varies
      const scanData = extractData<any>(scanResult.data);

      if (!scanData) {
        throw new Error("scanTxOutSet returned no data");
      }

      // Extract UTXOs from scan result
      const utxos: BitcoinUTXO[] = (scanData.unspents || []).map(
        // biome-ignore lint/suspicious/noExplicitAny: RPC response type varies
        (utxo: any): BitcoinUTXO => ({
          txid: utxo.txid,
          vout: utxo.vout,
          address: address,
          scriptPubKey: utxo.scriptPubKey,
          amount: utxo.amount,
          confirmations: utxo.height > 0 ? scanData.height - utxo.height + 1 : 0,
        }),
      );

      const addressData: BitcoinAddress = {
        address,
        type: addressType,
        balance: scanData.total_amount || 0,
        utxoCount: utxos.length,
        utxos,
        // Note: scanTxOutSet doesn't provide transaction history
        // totalReceived and txids would require a full indexer
      };

      return {
        data: addressData,
        metadata: scanResult.metadata as DataWithMetadata<BitcoinAddress>["metadata"],
      };
    } catch {
      // If scanTxOutSet fails, try listUnspent (wallet addresses only)
      try {
        const utxoResult = await this.client.listUnspent(0, 9999999, [address]);
        // biome-ignore lint/suspicious/noExplicitAny: RPC response type varies
        const utxos = extractData<any[]>(utxoResult.data) || [];

        // biome-ignore lint/suspicious/noExplicitAny: RPC response type varies
        const balance = utxos.reduce((sum: number, utxo: any) => sum + utxo.amount, 0);

        const addressData: BitcoinAddress = {
          address,
          type: addressType,
          balance,
          utxoCount: utxos.length,
          utxos: utxos.map(
            // biome-ignore lint/suspicious/noExplicitAny: RPC response type varies
            (utxo: any): BitcoinUTXO => ({
              txid: utxo.txid,
              vout: utxo.vout,
              address: utxo.address,
              scriptPubKey: utxo.scriptPubKey,
              amount: utxo.amount,
              confirmations: utxo.confirmations,
            }),
          ),
        };

        return {
          data: addressData,
          metadata: utxoResult.metadata as DataWithMetadata<BitcoinAddress>["metadata"],
        };
      } catch {
        // If both methods fail, return empty address info
        return {
          data: {
            address,
            type: addressType,
            balance: 0,
            utxoCount: 0,
            utxos: [],
          },
          metadata: undefined,
        };
      }
    }
  }

  /**
   * Get fee estimates for different confirmation targets
   * Returns fee rates in sat/vB for fast (1 block), medium (6 blocks), and slow (144 blocks)
   */
  async getFeeEstimates(): Promise<{
    fast: number | null;
    medium: number | null;
    slow: number | null;
  }> {
    try {
      // Fetch fee estimates for different confirmation targets in parallel
      const [fastResult, mediumResult, slowResult] = await Promise.all([
        this.client.estimateSmartFee(1, "economical").catch(() => null),
        this.client.estimateSmartFee(6, "economical").catch(() => null),
        this.client.estimateSmartFee(144, "economical").catch(() => null),
      ]);

      // Convert BTC/kvB to sat/vB (multiply by 100,000)
      // BTC/kvB * 100,000,000 satoshis/BTC / 1000 vB/kvB = sat/vB
      const convertToSatPerVb = (
        feeResult: { data?: { feerate?: number } } | null,
      ): number | null => {
        const feerate = feeResult?.data?.feerate;
        if (feerate === undefined || feerate === null || feerate <= 0) {
          return null;
        }
        return Math.round(feerate * 100000);
      };

      return {
        fast: convertToSatPerVb(fastResult),
        medium: convertToSatPerVb(mediumResult),
        slow: convertToSatPerVb(slowResult),
      };
    } catch {
      return { fast: null, medium: null, slow: null };
    }
  }

  /**
   * Get mempool summary (sorted entries without full tx details)
   * Returns total count and entries sorted by fee rate for pagination
   */
  async getMempoolSummary(): Promise<{
    total: number;
    entries: Array<{
      txid: string;
      vsize: number;
      weight: number;
      time: number;
      fee: number;
      feeRate: number;
    }>;
  }> {
    try {
      const mempoolResult = await this.client.getRawMempool(true);
      const mempoolData = extractData<
        Record<
          string,
          {
            vsize: number;
            weight: number;
            time: number;
            fees: { base: number; modified: number; ancestor: number; descendant: number };
            depends: string[];
            spentby: string[];
            "bip125-replaceable": boolean;
          }
        >
      >(mempoolResult.data);

      if (!mempoolData) {
        return { total: 0, entries: [] };
      }

      // Convert to array with txid and calculate fee rate
      const entries = Object.entries(mempoolData)
        .map(([txid, entry]) => ({
          txid,
          vsize: entry.vsize,
          weight: entry.weight,
          time: entry.time,
          fee: entry.fees.base,
          feeRate: entry.vsize > 0 ? (entry.fees.base * 100000000) / entry.vsize : 0,
        }))
        .sort((a, b) => b.feeRate - a.feeRate);

      return { total: entries.length, entries };
    } catch (error) {
      logger.error("Error fetching mempool summary:", error);
      return { total: 0, entries: [] };
    }
  }

  /**
   * Get mempool transactions with details (paginated)
   * Returns pending transactions sorted by fee rate (highest first)
   * @param page Page number (1-indexed)
   * @param pageSize Number of transactions per page (default 100)
   */
  async getMempoolTransactions(
    page = 1,
    pageSize = 100,
  ): Promise<{ transactions: BitcoinTransaction[]; total: number }> {
    try {
      // Get mempool summary first (fast - no individual tx fetches)
      const { total, entries } = await this.getMempoolSummary();

      if (total === 0) {
        return { transactions: [], total: 0 };
      }

      // Calculate pagination
      const startIndex = (page - 1) * pageSize;
      const pageEntries = entries.slice(startIndex, startIndex + pageSize);

      // Fetch full transaction details only for current page (in parallel for speed)
      const txPromises = pageEntries.map(async (entry) => {
        try {
          const txResult = await this.client.getRawTransaction(entry.txid, 1).catch(() => null);
          // biome-ignore lint/suspicious/noExplicitAny: RPC response varies
          const txData = txResult ? extractData<any>(txResult.data) : null;

          if (txData) {
            return {
              ...this.transformTransaction(txData),
              fee: entry.fee,
              time: entry.time,
            };
          }
          // Fallback to minimal entry from mempool data
          return {
            txid: entry.txid,
            hash: entry.txid,
            version: 2,
            size: entry.vsize,
            vsize: entry.vsize,
            weight: entry.weight,
            locktime: 0,
            vin: [],
            vout: [],
            confirmations: 0,
            time: entry.time,
            fee: entry.fee,
          };
        } catch {
          return null;
        }
      });

      const results = await Promise.all(txPromises);
      const transactions: BitcoinTransaction[] = [];
      for (const tx of results) {
        if (tx !== null) {
          transactions.push(tx);
        }
      }

      return { transactions, total };
    } catch (error) {
      logger.error("Error fetching mempool transactions:", error);
      return { transactions: [], total: 0 };
    }
  }
}
