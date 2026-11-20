import type { ZcashClient } from "@openscan/network-connectors";
import {
  getZcashNetworkKind,
  MAX_INPUT_LOOKUPS,
  RATE_LIMIT_RETRY_DELAYS_MS,
} from "../../../config/zcashConstants";
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
  isRpcErrorAnswer,
  normalizeZcashAddress,
  type ZcashRpcErrorKind,
} from "../../../utils/zcashUtils";
import {
  applyResolvedInputs,
  mapMetadata,
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

  /**
   * An endpoint gave a definitive JSON-RPC answer (e.g. "not found"), rather than being rate
   * limited or unreachable
   */
  get answered(): boolean {
    return this.kind === "failed" && this.messages.some(isRpcErrorAnswer);
  }
}

/**
 * Per-call options. Aborting stops retry waits and any call not yet sent; a request already in
 * flight still completes (the connector can't cancel it), but its result is discarded.
 */
export interface ZcashCallOptions {
  signal?: AbortSignal;
}

/**
 * State shared by every adapter for one network and endpoint list. A new DataService (and
 * adapter) is created per page, so anything worth keeping across pages lives here.
 */
export interface ZcashSession {
  /** Methods the endpoints reported as unsupported, so pages stop probing them */
  unsupportedMethods: Set<string>;
  /** Latest getblockchaininfo request, reused briefly by the navbar and the dashboard */
  chainInfo?: { at: number; request: Promise<DataWithMetadata<ZcashRawBlockchainInfo>> };
}

export interface ZcashAdapterOptions {
  /** Wait between rate-limit retries (injectable for tests) */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  /** Shared session state (see getZcashSession); a private one by default */
  session?: ZcashSession;
}

// How long a getblockchaininfo result is shared (blocks arrive every ~75s)
const CHAIN_INFO_TTL_MS = 30_000;

export interface ZcashBlockSummaries {
  /** Newest first */
  blocks: ZcashBlock[];
  /** Heights that couldn't be fetched, so pages can show them instead of leaving gaps */
  failedHeights: number[];
}

export interface ZcashInputResolution {
  transaction: ZcashTransaction;
  /** Previous transactions whose outputs are known (including ones resolved earlier) */
  resolved: number;
  /** Distinct previous transactions the inputs spend */
  total: number;
  /** More previous transactions than the lookup cap: nothing was fetched */
  exceedsCap: boolean;
  /** Set when a lookup failed; inputs resolved before it are kept, so a retry resumes */
  error?: unknown;
}

const defaultSleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });

const sessions = new Map<string, ZcashSession>();

/**
 * The session state for one network and endpoint list, shared by every page's adapter
 */
export function getZcashSession(networkId: string, rpcUrls: string[]): ZcashSession {
  const key = `${networkId}|${rpcUrls.join(",")}`;
  let session = sessions.get(key);
  if (!session) {
    session = { unsupportedMethods: new Set() };
    sessions.set(key, session);
  }
  return session;
}

/**
 * Wait for a shared request without letting one caller's abort cancel it for the others
 */
function untilAborted<T>(request: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return request;
  signal.throwIfAborted();
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    request.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

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
 * block data comes from a single getblock call, and methods a gateway rejects are remembered.
 */
export class ZcashAdapter {
  readonly networkId: string;
  private client: ZcashClient;
  private sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
  private session: ZcashSession;

  constructor(networkId: string, client: ZcashClient, options: ZcashAdapterOptions = {}) {
    this.networkId = networkId;
    this.client = client;
    this.sleep = options.sleep ?? defaultSleep;
    this.session = options.session ?? { unsupportedMethods: new Set() };
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
   * Throws ZcashRpcError when every endpoint fails, rather than returning empty data, and the
   * signal's reason when aborted.
   */
  private async call<T>(
    method: string,
    request: () => Promise<RpcResult<T>>,
    signal?: AbortSignal,
  ): Promise<DataWithMetadata<T>> {
    if (this.session.unsupportedMethods.has(method)) {
      throw new ZcashRpcError(method, "unsupported", [
        `${method} is not supported by the configured endpoints`,
      ]);
    }

    for (let attempt = 0; ; attempt++) {
      signal?.throwIfAborted();
      const result = await request();
      signal?.throwIfAborted();
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
      if (kind === "unsupported") this.session.unsupportedMethods.add(method);

      const delay = RATE_LIMIT_RETRY_DELAYS_MS[attempt];
      if (kind !== "rateLimited" || delay === undefined) {
        throw new ZcashRpcError(method, kind, messages);
      }

      logger.warn(`Zcash ${method} was rate limited, retrying in ${delay / 1000}s`);
      await this.sleep(delay, signal);
    }
  }

  /**
   * Run an optional RPC call for one section of a page. Methods the endpoint doesn't expose
   * are reported as "unsupported" so the page can degrade instead of failing.
   */
  private async section<T>(
    method: string,
    request: () => Promise<RpcResult<T>>,
    signal?: AbortSignal,
  ): Promise<ZcashRpcSection<T>> {
    try {
      const { data } = await this.call(method, request, signal);
      return { availability: "ok", data };
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error instanceof ZcashRpcError && error.kind === "unsupported") {
        return { availability: "unsupported" };
      }
      logger.warn(`Zcash ${method} failed:`, error);
      return { availability: "error" };
    }
  }

  /**
   * getblockchaininfo, shared for a few seconds between every caller on this network (the
   * navbar polls the height while the dashboard reads the same response for its stats)
   */
  private getChainInfo(signal?: AbortSignal): Promise<DataWithMetadata<ZcashRawBlockchainInfo>> {
    const cached = this.session.chainInfo;
    if (cached && Date.now() - cached.at < CHAIN_INFO_TTL_MS) {
      return untilAborted(cached.request, signal);
    }

    // Not tied to the caller's signal: other callers may be waiting on the same request
    const request = this.call<ZcashRawBlockchainInfo>("getblockchaininfo", () =>
      this.client.getBlockchainInfo(),
    );
    const entry = { at: Date.now(), request };
    this.session.chainInfo = entry;
    request.catch(() => {
      if (this.session.chainInfo === entry) this.session.chainInfo = undefined;
    });
    return untilAborted(request, signal);
  }

  /**
   * Get the latest block height (1 call, shared with getNetworkStats)
   */
  async getLatestBlockNumber(options: ZcashCallOptions = {}): Promise<number> {
    const { data } = await this.getChainInfo(options.signal);
    return data.blocks;
  }

  /**
   * Get chain, value pool and mempool statistics (2 calls)
   */
  async getNetworkStats(
    options: ZcashCallOptions = {},
  ): Promise<DataWithMetadata<ZcashNetworkStats>> {
    const [info, mempool] = await Promise.all([
      this.getChainInfo(options.signal),
      this.call("getmempoolinfo", () => this.client.getMempoolInfo(), options.signal),
    ]);

    return {
      data: transformNetworkStats(info.data, mempool.data),
      metadata: mapMetadata(info.metadata, (raw: ZcashRawBlockchainInfo) =>
        transformNetworkStats(raw, mempool.data),
      ),
    };
  }

  /**
   * Get a block and its transactions by hash or height (1 call)
   */
  async getBlock(
    hashOrHeight: string | number,
    options: ZcashCallOptions = {},
  ): Promise<DataWithMetadata<ZcashBlockWithTransactions>> {
    const result = await this.call<ZcashRawBlock>(
      "getblock",
      () => this.client.getBlock(String(hashOrHeight), 2),
      options.signal,
    );
    return {
      data: transformBlock(result.data),
      metadata: mapMetadata(result.metadata, transformBlock),
    };
  }

  /**
   * Get lightweight block summaries (1 call per block). Requests run one at a time so they
   * don't burst past hosted rate limits. Failed heights are reported, not dropped; once a call
   * stays rate limited after its retries, the remaining heights are reported without trying.
   */
  async getBlockSummaries(
    heights: number[],
    options: ZcashCallOptions & {
      /** Called as each block arrives, so pages can render rows progressively */
      onBlock?: (block: ZcashBlock) => void;
    } = {},
  ): Promise<ZcashBlockSummaries> {
    const blocks: ZcashBlock[] = [];
    const failedHeights: number[] = [];

    for (const [index, height] of heights.entries()) {
      try {
        const { data } = await this.call<ZcashRawBlockSummary>(
          "getblock",
          () => this.client.getBlock(String(height), 1),
          options.signal,
        );
        const block = transformBlockSummary(data);
        blocks.push(block);
        options.onBlock?.(block);
      } catch (error) {
        if (options.signal?.aborted) throw error;
        logger.warn(`Failed to fetch Zcash block ${height}:`, error);
        if (error instanceof ZcashRpcError && error.kind === "rateLimited") {
          failedHeights.push(...heights.slice(index));
          break;
        }
        failedHeights.push(height);
      }
    }

    return { blocks: blocks.sort((a, b) => b.height - a.height), failedHeights };
  }

  /**
   * Get a confirmed or mempool transaction (1 call)
   */
  async getTransaction(
    txid: string,
    options: ZcashCallOptions = {},
  ): Promise<DataWithMetadata<ZcashTransaction>> {
    const result = await this.call<ZcashRawTransaction>(
      "getrawtransaction",
      () => this.client.getRawTransaction(txid, 1),
      options.signal,
    );
    return {
      data: transformTransaction(result.data),
      metadata: mapMetadata(result.metadata, transformTransaction),
    };
  }

  /**
   * Fill in transparent input values and addresses by fetching the transactions they spend.
   * Zebra omits them from verbose transactions, so this costs one call per previous
   * transaction and is meant to run on demand.
   *
   * - Over the cap, nothing is fetched: the fee couldn't be computed anyway.
   * - Inputs that already carry a value are skipped, so passing a partly resolved transaction
   *   resumes where a failed run stopped.
   */
  async resolveTransparentInputs(
    tx: ZcashTransaction,
    options: ZcashCallOptions & {
      max?: number;
      onProgress?: (resolved: number, total: number) => void;
    } = {},
  ): Promise<ZcashInputResolution> {
    const { max = MAX_INPUT_LOOKUPS, onProgress, signal } = options;
    const distinct = (txids: Array<string | undefined>) =>
      [...new Set(txids)].filter((txid): txid is string => txid !== undefined);

    const previousTxids = distinct(tx.vin.map((input) => input.txid));
    const pending = distinct(
      tx.vin.map((input) => (input.valueZat === undefined ? input.txid : undefined)),
    );
    const total = previousTxids.length;
    let resolved = total - pending.length;

    if (total > max) {
      return { transaction: tx, resolved, total, exceedsCap: true };
    }

    const previous = new Map<string, ZcashTransaction>();
    let error: unknown;
    for (const previousTxid of pending) {
      try {
        const { data } = await this.getTransaction(previousTxid, { signal });
        previous.set(previousTxid, data);
        resolved++;
        onProgress?.(resolved, total);
      } catch (caught) {
        if (signal?.aborted) throw caught;
        error = caught;
        break;
      }
    }

    return {
      transaction: applyResolvedInputs(tx, previous),
      resolved,
      total,
      exceedsCap: false,
      error,
    };
  }

  /**
   * Get pending transactions, highest fee rate first (1 call)
   */
  async getMempoolEntries(
    options: ZcashCallOptions = {},
  ): Promise<DataWithMetadata<ZcashMempoolEntry[]>> {
    const result = await this.call<Record<string, ZcashRawMempoolEntry>>(
      "getrawmempool",
      () => this.client.getRawMempool(true),
      options.signal,
    );
    return {
      data: transformMempoolEntries(result.data),
      metadata: mapMetadata(result.metadata, transformMempoolEntries),
    };
  }

  /**
   * Get address data. Balance, UTXOs and history come from Zebra's address index, which hosted
   * gateways block, so each section reports its own availability. The balance is asked first:
   * the three methods share the index, so when it's unavailable the others aren't requested.
   */
  async getAddress(address: string, options: ZcashCallOptions = {}): Promise<ZcashAddress> {
    const { signal } = options;
    const normalized = normalizeZcashAddress(address);
    const type = detectZcashAddressType(normalized, getZcashNetworkKind(this.networkId));
    const result: ZcashAddress = { address: normalized, type };

    if (type === "unified") {
      result.receivers = await this.section(
        "z_listunifiedreceivers",
        () => this.client.zListUnifiedReceivers(normalized),
        signal,
      );
      result.transparentAddress = result.receivers.data?.p2pkh ?? result.receivers.data?.p2sh;
    } else if (type === "p2pkh" || type === "p2sh") {
      result.transparentAddress = normalized;
    }

    if (!result.transparentAddress) {
      return result;
    }

    const request = { addresses: [result.transparentAddress] };
    const balance = await this.section(
      "getaddressbalance",
      () => this.client.getAddressBalance(request),
      signal,
    );
    result.balance = mapSection(balance, (data) => ({
      balanceZat: data.balance,
      receivedZat: data.received,
    }));

    if (balance.availability !== "ok") {
      result.utxos = { availability: balance.availability };
      result.txids = { availability: balance.availability };
      return result;
    }

    const [utxos, txids] = await Promise.all([
      this.section("getaddressutxos", () => this.client.getAddressUtxos(request), signal),
      this.section("getaddresstxids", () => this.client.getAddressTxIds(request), signal),
    ]);
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
