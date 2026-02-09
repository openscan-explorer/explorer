/**
 * Network resolution utilities
 * Resolves URL parameters to network configurations using multiple strategies
 */

import type { NetworkConfig, NetworkType } from "../types";

/**
 * Extract chainId from a CAIP-2 networkId for EVM networks
 * Format: "eip155:<chainId>"
 * @param networkId - The CAIP-2 network ID
 * @returns The chainId or undefined if not an EVM network
 */
export function extractChainIdFromNetworkId(networkId: string): number | undefined {
  if (!networkId.startsWith("eip155:")) return undefined;
  const chainIdStr = networkId.slice(7); // Remove "eip155:" prefix
  const chainId = parseInt(chainIdStr, 10);
  return Number.isNaN(chainId) ? undefined : chainId;
}

/**
 * Resolve a URL parameter to a network configuration
 * Resolution order:
 * 1. Match by slug (e.g., "btc" → Bitcoin, "eth" → Ethereum)
 * 2. Match by chainId for EVM networks (e.g., "1" → Ethereum)
 * 3. Match by networkId (CAIP-2 format)
 *
 * @param urlParam - The URL parameter to resolve
 * @param networks - List of available networks
 * @returns The matching network or undefined
 */
export function resolveNetwork(
  urlParam: string,
  networks: NetworkConfig[],
): NetworkConfig | undefined {
  if (!urlParam) return undefined;

  const normalizedParam = urlParam.toLowerCase();

  // 1. Match by slug
  const bySlug = networks.find((n) => n.slug?.toLowerCase() === normalizedParam);
  if (bySlug) return bySlug;

  // 2. Match by chainId (for EVM networks, supports numeric strings)
  const numericParam = parseInt(urlParam, 10);
  if (!Number.isNaN(numericParam)) {
    const byChainId = networks.find(
      (n) => extractChainIdFromNetworkId(n.networkId) === numericParam,
    );
    if (byChainId) return byChainId;
  }

  // 3. Match by networkId (CAIP-2 format)
  const byNetworkId = networks.find((n) => n.networkId.toLowerCase() === normalizedParam);
  if (byNetworkId) return byNetworkId;

  return undefined;
}

/**
 * Check if a network is an EVM network
 */
export function isEVMNetwork(network: NetworkConfig): boolean {
  return network.type === "evm";
}

/**
 * Check if a network is a Bitcoin network
 */
export function isBitcoinNetwork(network: NetworkConfig): boolean {
  return network.type === "bitcoin";
}

/**
 * Get the URL path segment for a network
 * Uses slug if available, otherwise chainId for EVM or networkId
 */
export function getNetworkUrlPath(network: NetworkConfig): string {
  if (network.slug) return network.slug;
  const chainId = extractChainIdFromNetworkId(network.networkId);
  if (chainId !== undefined) return chainId.toString();
  return network.networkId;
}

/**
 * Get the network type from a network config
 */
export function getNetworkType(network: NetworkConfig): NetworkType {
  return network.type;
}

/**
 * Get the RPC key for a network (used in RpcUrlsContextType)
 * Returns the networkId (CAIP-2 format) for all networks
 */
export function getNetworkRpcKey(network: NetworkConfig): string {
  return network.networkId;
}

/**
 * Parse a network RPC key back to identify the network
 */
export function parseNetworkRpcKey(
  key: string | number,
  networks: NetworkConfig[],
): NetworkConfig | undefined {
  if (typeof key === "number") {
    return networks.find((n) => extractChainIdFromNetworkId(n.networkId) === key);
  }
  return networks.find((n) => n.networkId === key);
}

/**
 * Get the chainId from a network for EVM operations
 * Extracts from networkId (CAIP-2 format: "eip155:<chainId>")
 * Returns undefined for non-EVM networks
 */
export function getChainIdFromNetwork(network: NetworkConfig | undefined): number | undefined {
  if (!network) return undefined;
  return extractChainIdFromNetworkId(network.networkId);
}

/**
 * Check if a network is the localhost/hardhat network
 */
export function isLocalhostNetwork(network: NetworkConfig | undefined): boolean {
  return getChainIdFromNetwork(network) === 31337;
}
