import type { Chain } from "wagmi/chains";
import { arbitrum, base, hardhat, mainnet, optimism, polygon, sepolia } from "wagmi/chains";
import jsonConfig from "./config.json";

// OpenScan DAO address (openscan.eth)
export const OPENSCAN_DAO_ADDRESS = "openscan.eth";

export interface Network {
  networkId: number;
  name: string;
  currency: string;
}

export interface Config {
  networks: Network[];
}

/**
 * Get the configuration with the contracts and networks
 */
export function getConfig(): Config {
  // Map chainId from config.json to networkId internally
  return {
    networks: jsonConfig.networks.map((n) => ({
      networkId: n.chainId,
      name: n.name,
      currency: n.currency,
    })),
  };
}

/**
 * Get network configuration by network ID
 * @param networkId - Network ID
 * @returns Network configuration or null if not found
 */
export function getNetworkConfig(networkId: number): Network | null {
  const config = getConfig();
  return config.networks.find((n) => n.networkId === networkId) || null;
}

/**
 * Get all supported networks
 * @returns Array of all supported networks
 */
export function getAllNetworksFromConfig(): Network[] {
  const config = getConfig();
  return config.networks;
}

/**
 * Get supported wagmi chains based on the configuration
 * Maps network IDs from config to wagmi chain objects
 * @returns Array of wagmi Chain objects
 */
export function getSupportedChains(): Chain[] {
  const config = getConfig();
  const chainMap: Record<number, Chain> = {
    1: mainnet,
    137: polygon,
    10: optimism,
    42161: arbitrum,
    8453: base,
    11155111: sepolia,
    31337: hardhat,
  };

  return config.networks
    .map((network) => chainMap[network.networkId])
    .filter((chain): chain is Chain => chain !== undefined);
}
