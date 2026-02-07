import { type SupportedChainId, ClientFactory, BitcoinClient } from "@openscan/network-connectors";

import { AdapterFactory } from "./adapters/adaptersFactory";
import type { NetworkAdapter } from "./adapters/NetworkAdapter";
import type { BitcoinAdapter } from "./adapters/BitcoinAdapter/BitcoinAdapter";
import type { NetworkConfig, RpcUrlsContextType } from "../types";
import { getRPCUrls } from "../config/rpcConfig";
import { getNetworkRpcKey, getChainIdFromNetwork } from "../utils/networkResolver";

/**
 * DataService supports both EVM and Bitcoin networks
 * The adapter type varies based on network type
 */
export class DataService {
  /**
   * The network adapter - use this directly for EVM networks
   * For Bitcoin networks, use getBitcoinAdapter() instead
   */
  networkAdapter: NetworkAdapter;
  private bitcoinAdapter?: BitcoinAdapter;
  readonly networkType: "evm" | "bitcoin";

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
}
