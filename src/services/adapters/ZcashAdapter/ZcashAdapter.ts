import type { ZcashClient } from "@openscan/network-connectors";
import { MAX_INPUT_LOOKUPS, RATE_LIMIT_RETRY_DELAYS_MS } from "../../../config/zcashConstants";
import type {
  DataWithMetadata,
  ZcashAddress,
  ZcashBlock,
  ZcashBlockWithTransactions,
  ZcashMempoolEntry,
  ZcashNetworkStats,
  ZcashRpcSection,
  ZcashTransaction,
} from "../../../types";
import { logger } from "../../../utils/logger";
import {
  classifyRpcErrors,
  detectZcashAddressType,
  type ZcashRpcErrorKind,
} from "../../../utils/zcashUtils";
import {
  applyResolvedInputs,
  transformBlock,
  transformBlockSummary,
  transformMempoolEntries,
  transformNetworkStats,
  transformTransaction,
  type ZcashRawBlock,
  type ZcashRawBlockchainInfo,
  type ZcashRawBlockSummary,
  type ZcashRawMempoolEntry,
  type ZcashRawTransaction,
} from "./utils";

/** The part of the connector's StrategyResult the adapter reads */
interface RpcResult<T> {
  success: boolean;
  data?: T;
  errors?: Array<{ error?: string }>;
  metadata?: unknown;
}

/**
 * Thrown when a Zcash RPC call fails on every configured endpoint
 */
export class ZcashRpcError extends Error {
  readonly method: string;
  readonly kind: ZcashRpcErrorKind;
  readonly messages: string[];

  constructor(method: string, kind: ZcashRpcErrorKind, messages: string[]) {
    super(`${method} failed: ${messages.length > 0 ? messages.join("; ") : "no response"}`);
    this.name = "ZcashRpcError";
    this.method = method;
    this.kind = kind;
    this.messages = messages;
  }
}

export interface ZcashAdapterOptions {
  /** Wait between rate-limit retries (injectable for tests) */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function mapSection<T, U>(section: ZcashRpcSection<T>, map: (data: T) => U): ZcashRpcSection<U> {
  return section.data === undefined
    ? { availability: section.availability }
    : { availability: section.availability, data: map(section.data) };
}

/**
 * Zcash blockchain adapter (Zebra RPC)
 *
 * Hosted gateways allow only a few requests per minute, so methods spend as few calls as
 * possible: heights go straight to getblock as decimal strings (no getblockhash round trip),
 * and block data comes from a single getblock call.
 */
export class ZcashAdapter {
  readonly networkId: string;
  private client: ZcashClient;
  private sleep: (ms: number) => Promise<void>;

  constructor(networkId: string, client: ZcashClient, options: ZcashAdapterOptions = {}) {
    this.networkId = networkId;
    this.client = client;
    this.sleep = options.sleep ?? defaultSleep;
  }

  /**
   * Check if this is a Zcash network
   */
  isZcash(): boolean {
    return true;
  }

  /**
   * Get the network ID (CAIP-2 format)
   */
  getNetworkId(): string {
    return this.networkId;
  }

  /**
   * Run an RPC call, retrying rate-limited failures with backoff.
   * Throws ZcashRpcError when every endpoint fails, rather than returning empty data.
   */
  private async call<T>(
    method: string,
    request: () => Promise<RpcResult<T>>,
  ): Promise<DataWithMetadata<T>> {
    for (let attempt = 0; ; attempt++) {
      const result = await request();
      if (result.success) {
        return {
          data: result.data as T,
          metadata: result.metadata as DataWithMetadata<T>["metadata"],
        };
      }

      const messages = (result.errors ?? []).flatMap((response) =>
        response.error ? [response.error] : [],
      );
      const kind = classifyRpcErrors(messages);
      const delay = RATE_LIMIT_RETRY_DELAYS_MS[attempt];
      if (kind !== "rateLimited" || delay === undefined) {
        throw new ZcashRpcError(method, kind, messages);
      }

      logger.warn(`Zcash ${method} was rate limited, retrying in ${delay / 1000}s`);
      await this.sleep(delay);
    }
  }

  /**
   * Run an optional RPC call for one section of a page. Methods the endpoint doesn't expose
   * are reported as "unsupported" so the page can degrade instead of failing.
   */
  private async section<T>(
    method: string,
    request: () => Promise<RpcResult<T>>,
  ): Promise<ZcashRpcSection<T>> {
    try {
      const { data } = await this.call(method, request);
      return { availability: "ok", data };
    } catch (error) {
      if (error instanceof ZcashRpcError && error.kind === "unsupported") {
        return { availability: "unsupported" };
      }
      logger.warn(`Zcash ${method} failed:`, error);
      return { availability: "error" };
    }
  }

  /**
   * Get the latest block height (1 call)
   */
  async getLatestBlockNumber(): Promise<number> {
    const { data } = await this.call("getblockcount", () => this.client.getBlockCount());
    return data;
  }

  /**
   * Get chain, value pool and mempool statistics (2 calls)
   */
  async getNetworkStats(): Promise<DataWithMetadata<ZcashNetworkStats>> {
    const [info, mempool] = await Promise.all([
      this.call<ZcashRawBlockchainInfo>("getblockchaininfo", () => this.client.getBlockchainInfo()),
      this.call("getmempoolinfo", () => this.client.getMempoolInfo()),
    ]);

    return { data: transformNetworkStats(info.data, mempool.data), metadata: info.metadata };
  }

  /**
   * Get a block and its transactions by hash or height (1 call)
   */
  async getBlock(
    hashOrHeight: string | number,
  ): Promise<DataWithMetadata<ZcashBlockWithTransactions>> {
    const result = await this.call<ZcashRawBlock>("getblock", () =>
      this.client.getBlock(String(hashOrHeight), 2),
    );
    return { data: transformBlock(result.data), metadata: result.metadata };
  }

  /**
   * Get lightweight block summaries (1 call per block). Requests run one at a time so they
   * don't burst past hosted rate limits; blocks that still fail are skipped.
   */
  async getBlockSummaries(heights: number[]): Promise<ZcashBlock[]> {
    const blocks: ZcashBlock[] = [];

    for (const height of heights) {
      try {
        const { data } = await this.call<ZcashRawBlockSummary>("getblock", () =>
          this.client.getBlock(String(height), 1),
        );
        blocks.push(transformBlockSummary(data));
      } catch (error) {
        logger.warn(`Failed to fetch Zcash block ${height}:`, error);
      }
    }

    return blocks.sort((a, b) => b.height - a.height);
  }

  /**
   * Get all transactions of a block (1 call)
   */
  async getBlockTransactions(height: number): Promise<ZcashTransaction[]> {
    const { data } = await this.getBlock(height);
    return data.transactions;
  }

  /**
   * Get a confirmed or mempool transaction (1 call)
   */
  async getTransaction(txid: string): Promise<DataWithMetadata<ZcashTransaction>> {
    const result = await this.call<ZcashRawTransaction>("getrawtransaction", () =>
      this.client.getRawTransaction(txid, 1),
    );
    return { data: transformTransaction(result.data), metadata: result.metadata };
  }

  /**
   * Fill in transparent input values and addresses by fetching the transactions they spend.
   * Zebra omits them from verbose transactions, so this costs one call per previous
   * transaction (capped) and is meant to run on demand.
   */
  async resolveTransparentInputs(
    tx: ZcashTransaction,
    options: { max?: number; onProgress?: (resolved: number, total: number) => void } = {},
  ): Promise<{ transaction: ZcashTransaction; resolved: number; total: number }> {
    const { max = MAX_INPUT_LOOKUPS, onProgress } = options;
    const previousTxids = [...new Set(tx.vin.flatMap((input) => (input.txid ? [input.txid] : [])))];
    const previous = new Map<string, ZcashTransaction>();

    for (const previousTxid of previousTxids.slice(0, max)) {
      const { data } = await this.getTransaction(previousTxid);
      previous.set(previousTxid, data);
      onProgress?.(previous.size, previousTxids.length);
    }

    return {
      transaction: applyResolvedInputs(tx, previous),
      resolved: previous.size,
      total: previousTxids.length,
    };
  }

  /**
   * Get pending transactions, highest fee rate first (1 call)
   */
  async getMempoolEntries(): Promise<DataWithMetadata<ZcashMempoolEntry[]>> {
    const result = await this.call<Record<string, ZcashRawMempoolEntry>>("getrawmempool", () =>
      this.client.getRawMempool(true),
    );
    return { data: transformMempoolEntries(result.data), metadata: result.metadata };
  }

  /**
   * Get address data. Balance, UTXOs and history come from Zebra's address index, which hosted
   * gateways block, so each section reports its own availability.
   */
  async getAddress(address: string): Promise<ZcashAddress> {
    const type = detectZcashAddressType(address);
    const result: ZcashAddress = { address, type };

    if (type === "unified") {
      result.receivers = await this.section("z_listunifiedreceivers", () =>
        this.client.zListUnifiedReceivers(address),
      );
      result.transparentAddress = result.receivers.data?.p2pkh ?? result.receivers.data?.p2sh;
    } else if (type === "p2pkh" || type === "p2sh") {
      result.transparentAddress = address;
    }

    if (!result.transparentAddress) {
      return result;
    }

    const request = { addresses: [result.transparentAddress] };
    const [balance, utxos, txids] = await Promise.all([
      this.section("getaddressbalance", () => this.client.getAddressBalance(request)),
      this.section("getaddressutxos", () => this.client.getAddressUtxos(request)),
      this.section("getaddresstxids", () => this.client.getAddressTxIds(request)),
    ]);

    result.balance = mapSection(balance, (data) => ({
      balanceZat: data.balance,
      receivedZat: data.received,
    }));
    result.utxos = mapSection(utxos, (data) =>
      data.map((utxo) => ({
        txid: utxo.txid,
        outputIndex: utxo.outputIndex,
        valueZat: utxo.satoshis,
        height: utxo.height,
      })),
    );
    result.txids = txids;

    return result;
  }
}
