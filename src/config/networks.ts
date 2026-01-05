/**
 * Network configuration for OpenScan
 * Networks are loaded from a local JSON file
 */

import { getNetworkLogoUrl } from "../services/MetadataService";
import type { NetworkConfig } from "../types";
import networksData from "./networks.json";

export type { NetworkConfig };

interface NetworkMetadata {
  chainId: number;
  name: string;
  shortName: string;
  description?: string;
  currency: string;
  color?: string;
  isTestnet?: boolean;
  subscription?: {
    tier: 1 | 2 | 3;
    expiresAt: string;
  };
  logo?: string;
  profile?: string;
  explorer?: {
    subdomain?: string;
    features?: string[];
    priority?: number;
  };
  rpc?: {
    public: string[];
  };
  links?: Array<{
    name: string;
    url: string;
    description?: string;
  }>;
}

/**
 * Convert metadata network to NetworkConfig
 * Maps chainId from metadata to networkId internally
 */
function metadataToNetworkConfig(network: NetworkMetadata): NetworkConfig {
  return {
    networkId: network.chainId,
    name: network.name,
    shortName: network.shortName,
    description: network.description,
    color: network.color,
    currency: network.currency,
    isTestnet: network.isTestnet,
    subscription: network.subscription,
    logo: network.logo,
    profile: network.profile,
    explorer: network.explorer,
    rpc: network.rpc,
    links: network.links,
  };
}

// Load networks from local JSON file
const loadedNetworks: NetworkConfig[] = (networksData.networks as NetworkMetadata[]).map(
  metadataToNetworkConfig,
);
const networksUpdatedAt: string = networksData.updatedAt;

console.log(
  `Loaded ${loadedNetworks.length} networks from local config (updated: ${networksUpdatedAt})`,
);

/**
 * Load networks - now synchronous since data is bundled
 * Kept async for backwards compatibility
 */
export async function loadNetworks(): Promise<NetworkConfig[]> {
  return loadedNetworks;
}

/**
 * Get all networks (sync version)
 */
export function getAllNetworks(): NetworkConfig[] {
  return loadedNetworks;
}

/**
 * Get the list of enabled networks based on environment variable
 * REACT_APP_OPENSCAN_NETWORKS can be a comma-separated list of network IDs
 * If not set, all networks are enabled
 */
export function getEnabledNetworks(): NetworkConfig[] {
  const allNetworks = getAllNetworks();
  const envNetworks = process.env.REACT_APP_OPENSCAN_NETWORKS;
  const localhostNetworkId = 31337;

  // REACT_APP_ENVIRONMENT is set by webpack DefinePlugin based on NODE_ENV
  const isDevelopment = process.env.REACT_APP_ENVIRONMENT === "development";

  // Check if localhost is explicitly enabled in REACT_APP_OPENSCAN_NETWORKS
  const isLocalhostExplicitlyEnabled = envNetworks
    ?.split(",")
    .map((id) => parseInt(id.trim(), 10))
    .includes(localhostNetworkId);

  // Filter out localhost in production/staging (only show in development or if explicitly enabled)
  const filterLocalhost = (networks: NetworkConfig[]) => {
    if (isDevelopment || isLocalhostExplicitlyEnabled) {
      return networks;
    }
    return networks.filter((n) => n.networkId !== localhostNetworkId);
  };

  if (!envNetworks || envNetworks.trim() === "") {
    return filterLocalhost(allNetworks);
  }

  // Parse comma-separated network IDs
  const enabledNetworkIds = envNetworks
    .split(",")
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !Number.isNaN(id));

  if (enabledNetworkIds.length === 0) {
    return filterLocalhost(allNetworks);
  }

  // Filter networks by enabled network IDs, maintaining order from env var
  const enabledNetworks: NetworkConfig[] = [];
  for (const networkId of enabledNetworkIds) {
    const network = allNetworks.find((n) => n.networkId === networkId);
    if (network) {
      enabledNetworks.push(network);
    }
  }

  return filterLocalhost(enabledNetworks.length > 0 ? enabledNetworks : allNetworks);
}

/**
 * Get enabled network IDs as an array
 */
export function getEnabledNetworkIds(): number[] {
  return getEnabledNetworks().map((n) => n.networkId);
}

/**
 * Check if a network ID is enabled
 */
export function isNetworkEnabled(networkId: number): boolean {
  return getEnabledNetworkIds().includes(networkId);
}

/**
 * Get network config by network ID
 */
export function getNetworkById(networkId: number): NetworkConfig | undefined {
  return getAllNetworks().find((n) => n.networkId === networkId);
}

/**
 * Get the full URL for a network logo
 */
export function getNetworkLogoUrlById(networkId: number): string | undefined {
  const network = getNetworkById(networkId);
  if (!network?.logo) return undefined;
  return getNetworkLogoUrl(network.logo);
}

/**
 * Get the timestamp when networks were last updated
 */
export function getNetworksUpdatedAt(): string | null {
  return networksUpdatedAt;
}

/**
 * Reload networks - now a no-op since data is bundled
 * Kept for backwards compatibility
 */
export async function reloadNetworks(): Promise<NetworkConfig[]> {
  return loadedNetworks;
}
