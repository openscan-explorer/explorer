import { type SupportedChainId, ClientFactory, BitcoinClient } from "@openscan/network-connectors";

import { AdapterFactory } from "./adapters/adaptersFactory";
import type { NetworkAdapter } from "./adapters/NetworkAdapter";
import type { BitcoinAdapter } from "./adapters/BitcoinAdapter/BitcoinAdapter";
import type { SolanaAdapter } from "./adapters/SolanaAdapter/SolanaAdapter";
import type { ISolanaClient } from "./adapters/SolanaAdapter/SolanaClientTypes";
import type { NetworkConfig, RpcUrlsContextType } from "../types";
import { getRPCUrls } from "../config/rpcConfig";
import { getNetworkRpcKey, getChainIdFromNetwork } from "../utils/networkResolver";

/**
 * DataService supports EVM, Bitcoin, and Solana networks
 * The adapter type varies based on network type
 */
export class DataService {
  /**
   * The network adapter - use this directly for EVM networks
   * For Bitcoin networks, use getBitcoinAdapter() instead
   * For Solana networks, use getSolanaAdapter() instead
   */
  networkAdapter: NetworkAdapter;
  private bitcoinAdapter?: BitcoinAdapter;
  private solanaAdapter?: SolanaAdapter;
  readonly networkType: "evm" | "bitcoin" | "solana";

  constructor(
    network: NetworkConfig,
    rpcUrlsMap: RpcUrlsContextType,
    strategy: "fallback" | "parallel" | "race" = "fallback",
  ) {
    this.networkType = network.type;
    const rpcKey = getNetworkRpcKey(network);
    const rpcUrls = getRPCUrls(rpcKey, rpcUrlsMap);

    if (network.type === "bitcoin") {
      // Create Bitcoin client and adapter
      const bitcoinClient = new BitcoinClient({
        rpcUrls,
        type: strategy,
      });
      this.bitcoinAdapter = AdapterFactory.createBitcoinAdapter(network.networkId, bitcoinClient);
      // Create a placeholder adapter that throws for EVM methods
      // This maintains type compatibility while ensuring Bitcoin networks use the right methods
      this.networkAdapter = null as unknown as NetworkAdapter;
    } else if (network.type === "solana") {
      // Create Solana client and adapter
      // TODO: Once @openscan/network-connectors publishes Solana support, use ClientFactory:
      // const solanaClient = ClientFactory.createTypedClient(network.networkId, { rpcUrls, type: strategy });
      // For now, create a minimal JSON-RPC client that implements ISolanaClient
      const solanaClient = createSolanaJsonRpcClient(rpcUrls);
      this.solanaAdapter = AdapterFactory.createSolanaAdapter(network.networkId, solanaClient);
      this.networkAdapter = null as unknown as NetworkAdapter;
    } else {
      // Create EVM client and adapter
      const chainId = getChainIdFromNetwork(network) as SupportedChainId;
      const networkClient = ClientFactory.createTypedClient<typeof chainId>(chainId, {
        rpcUrls,
        type: strategy,
      });
      this.networkAdapter = AdapterFactory.createAdapter(chainId, networkClient);
    }
  }

  /**
   * Check if this is an EVM network service
   */
  isEVM(): boolean {
    return this.networkType === "evm";
  }

  /**
   * Check if this is a Bitcoin network service
   */
  isBitcoin(): boolean {
    return this.networkType === "bitcoin";
  }

  /**
   * Check if this is a Solana network service
   */
  isSolana(): boolean {
    return this.networkType === "solana";
  }

  /**
   * Get the adapter as an EVM adapter (throws if not EVM)
   */
  getEVMAdapter(): NetworkAdapter {
    if (!this.isEVM()) {
      throw new Error("Cannot get EVM adapter for non-EVM network");
    }
    return this.networkAdapter;
  }

  /**
   * Get the adapter as a Bitcoin adapter (throws if not Bitcoin)
   */
  getBitcoinAdapter(): BitcoinAdapter {
    if (!this.isBitcoin() || !this.bitcoinAdapter) {
      throw new Error("Cannot get Bitcoin adapter for non-Bitcoin network");
    }
    return this.bitcoinAdapter;
  }

  /**
   * Get the adapter as a Solana adapter (throws if not Solana)
   */
  getSolanaAdapter(): SolanaAdapter {
    if (!this.isSolana() || !this.solanaAdapter) {
      throw new Error("Cannot get Solana adapter for non-Solana network");
    }
    return this.solanaAdapter;
  }
}

/**
 * Temporary Solana client factory until @openscan/network-connectors publishes Solana support.
 * Creates a minimal JSON-RPC client that implements ISolanaClient.
 */
function createSolanaJsonRpcClient(rpcUrls: string[]): ISolanaClient {
  const rpcUrl = rpcUrls[0] ?? "";

  async function rpcCall<T>(
    method: string,
    params: unknown[] = [],
  ): Promise<{ data: T; metadata?: undefined }> {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      }),
    });
    const json = await response.json();
    if (json.error) {
      throw new Error(json.error.message || `RPC error: ${method}`);
    }
    return { data: json.result as T };
  }

  const client: ISolanaClient = {
    getAccountInfo: (pubkey, config) =>
      rpcCall("getAccountInfo", config ? [pubkey, config] : [pubkey]),
    getBalance: (pubkey, config) => rpcCall("getBalance", config ? [pubkey, config] : [pubkey]),
    getBlock: (slot, config) => rpcCall("getBlock", config ? [slot, config] : [slot]),
    getBlockHeight: (commitment) => rpcCall("getBlockHeight", commitment ? [{ commitment }] : []),
    getBlocks: (startSlot, endSlot, commitment) => {
      // biome-ignore lint/suspicious/noExplicitAny: params built conditionally
      const params: any[] = [startSlot];
      if (endSlot !== undefined) params.push(endSlot);
      if (commitment) params.push({ commitment });
      return rpcCall("getBlocks", params);
    },
    getBlocksWithLimit: (startSlot, limit, commitment) => {
      // biome-ignore lint/suspicious/noExplicitAny: params built conditionally
      const params: any[] = [startSlot, limit];
      if (commitment) params.push({ commitment });
      return rpcCall("getBlocksWithLimit", params);
    },
    getBlockTime: (slot) => rpcCall("getBlockTime", [slot]),
    getSlot: (commitment) => rpcCall("getSlot", commitment ? [{ commitment }] : []),
    getTransaction: (signature, config) =>
      rpcCall("getTransaction", config ? [signature, config] : [signature]),
    getSignaturesForAddress: (address, config) =>
      rpcCall("getSignaturesForAddress", config ? [address, config] : [address]),
    getTokenAccountsByOwner: (owner, filter, config) =>
      rpcCall("getTokenAccountsByOwner", config ? [owner, filter, config] : [owner, filter]),
    getTokenSupply: (mint, commitment) =>
      rpcCall("getTokenSupply", commitment ? [mint, { commitment }] : [mint]),
    getTokenLargestAccounts: (mint, commitment) =>
      rpcCall("getTokenLargestAccounts", commitment ? [mint, { commitment }] : [mint]),
    getEpochInfo: (commitment) => rpcCall("getEpochInfo", commitment ? [{ commitment }] : []),
    getVoteAccounts: (config) => rpcCall("getVoteAccounts", config ? [config] : []),
    getVersion: () => rpcCall("getVersion"),
    getSlotLeader: (commitment) => rpcCall("getSlotLeader", commitment ? [{ commitment }] : []),
    getLeaderSchedule: (slot, config) => {
      // biome-ignore lint/suspicious/noExplicitAny: params built conditionally
      const params: any[] = [];
      if (slot !== undefined && slot !== null) params.push(slot);
      else params.push(null);
      if (config) params.push(config);
      return rpcCall("getLeaderSchedule", params);
    },
    getTransactionCount: (commitment) =>
      rpcCall("getTransactionCount", commitment ? [{ commitment }] : []),
    getRecentPerformanceSamples: (limit) =>
      rpcCall("getRecentPerformanceSamples", limit !== undefined ? [limit] : []),
    getRecentPrioritizationFees: (addresses) =>
      rpcCall("getRecentPrioritizationFees", addresses ? [addresses] : []),
  };

  return client;
}
