import {
  type SupportedChainId,
  type SupportedSolanaChainId,
  type SupportedZcashChainId,
  ArbitrumClient,
  BaseClient,
  BitcoinClient,
  ClientFactory,
  EthereumClient,
  OptimismClient,
  PolygonClient,
} from "@openscan/network-connectors";

import { AdapterFactory } from "./adapters/adaptersFactory";
import type { NetworkAdapter } from "./adapters/NetworkAdapter";
import type { BitcoinAdapter } from "./adapters/BitcoinAdapter/BitcoinAdapter";
import type { SolanaAdapter } from "./adapters/SolanaAdapter/SolanaAdapter";
import type { ZcashAdapter } from "./adapters/ZcashAdapter/ZcashAdapter";
import type { NetworkConfig, NetworkType, RpcUrlsContextType } from "../types";
import { getRPCUrls } from "../config/rpcConfig";
import { getNetworkRpcKey, getChainIdFromNetwork } from "../utils/networkResolver";

type EVMClientConfig = {
  rpcUrls: string[];
  type: "fallback" | "parallel" | "race";
};

type EVMTestnetClient =
  | ArbitrumClient
  | OptimismClient
  | BaseClient
  | PolygonClient
  | EthereumClient;

// EVM testnets not yet registered in @openscan/network-connectors ClientFactory.
// Mapped to their L1 family's client since they share the same JSON-RPC surface.
const EVM_TESTNET_CLIENTS: Record<number, (config: EVMClientConfig) => EVMTestnetClient> = {
  421614: (config) => new ArbitrumClient(config),
  11155420: (config) => new OptimismClient(config),
  84532: (config) => new BaseClient(config),
  80002: (config) => new PolygonClient(config),
  43113: (config) => new EthereumClient(config),
};

/**
 * DataService supports EVM, Bitcoin, Zcash, and Solana networks
 * The adapter type varies based on network type
 */
export class DataService {
  /**
   * The network adapter - use this directly for EVM networks
   * For Bitcoin networks, use getBitcoinAdapter() instead
   * For Zcash networks, use getZcashAdapter() instead
   * For Solana networks, use getSolanaAdapter() instead
   */
  networkAdapter: NetworkAdapter;
  private bitcoinAdapter?: BitcoinAdapter;
  private zcashAdapter?: ZcashAdapter;
  private solanaAdapter?: SolanaAdapter;
  readonly networkType: NetworkType;

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
      this.networkAdapter = null as unknown as NetworkAdapter;
    } else if (network.type === "zcash") {
      // Zcash shares the bip122 namespace with Bitcoin; ClientFactory routes by registry membership
      const zcashChainId = network.networkId as SupportedZcashChainId;
      const zcashClient = ClientFactory.createTypedClient<typeof zcashChainId>(zcashChainId, {
        rpcUrls,
        type: strategy,
      });
      this.zcashAdapter = AdapterFactory.createZcashAdapter(network.networkId, zcashClient);
      this.networkAdapter = null as unknown as NetworkAdapter;
    } else if (network.type === "solana") {
      // Create Solana client and adapter via ClientFactory
      const solanaChainId = network.networkId as SupportedSolanaChainId;
      const solanaClient = ClientFactory.createTypedClient<typeof solanaChainId>(solanaChainId, {
        rpcUrls,
        type: strategy,
      });
      this.solanaAdapter = AdapterFactory.createSolanaAdapter(network.networkId, solanaClient);
      this.networkAdapter = null as unknown as NetworkAdapter;
    } else {
      // Create EVM client and adapter
      const chainId = getChainIdFromNetwork(network) as SupportedChainId;
      const clientConfig = { rpcUrls, type: strategy };
      const networkClient =
        EVM_TESTNET_CLIENTS[chainId as number]?.(clientConfig) ??
        ClientFactory.createTypedClient<typeof chainId>(chainId, clientConfig);
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
   * Check if this is a Zcash network service
   */
  isZcash(): boolean {
    return this.networkType === "zcash";
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
   * Get the adapter as a Zcash adapter (throws if not Zcash)
   */
  getZcashAdapter(): ZcashAdapter {
    if (!this.isZcash() || !this.zcashAdapter) {
      throw new Error("Cannot get Zcash adapter for non-Zcash network");
    }
    return this.zcashAdapter;
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
