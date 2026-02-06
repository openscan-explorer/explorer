/**
 * Network configuration for OpenScan
 * Networks are loaded from a local JSON file
 */

import { getNetworkLogoUrl } from "../services/MetadataService";
import type { NetworkConfig, NetworkType } from "../types";
import { logger } from "../utils/logger";
import {
  resolveNetwork,
  extractChainIdFromNetworkId,
  getChainIdFromNetwork,
} from "../utils/networkResolver";
import networksData from "./networks.json";

export type { NetworkConfig };

interface NetworkMetadata {
  type: NetworkType;
  networkId: string; // CAIP-2 format
  slug?: string;
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
 */
function metadataToNetworkConfig(network: NetworkMetadata): NetworkConfig {
  return {
    type: network.type,
    networkId: network.networkId,
    slug: network.slug,
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

logger.debug(
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
 * REACT_APP_OPENSCAN_NETWORKS can be a comma-separated list of chain IDs, slugs, or network IDs
 * If not set, all networks are enabled
 */
export function getEnabledNetworks(): NetworkConfig[] {
  const allNetworks = getAllNetworks();
  const envNetworks = process.env.REACT_APP_OPENSCAN_NETWORKS;
  const localhostChainId = 31337;

  // REACT_APP_ENVIRONMENT is set by webpack DefinePlugin based on NODE_ENV
  const isDevelopment = process.env.REACT_APP_ENVIRONMENT === "development";

  // Check if localhost is explicitly enabled in REACT_APP_OPENSCAN_NETWORKS
  const isLocalhostExplicitlyEnabled = envNetworks
    ?.split(",")
    .map((id) => id.trim())
    .some((id) => id === "31337" || id === "localhost");

  // Filter out localhost in production/staging (only show in development or if explicitly enabled)
  const filterLocalhost = (networks: NetworkConfig[]) => {
    if (isDevelopment || isLocalhostExplicitlyEnabled) {
      return networks;
    }
    return networks.filter((n) => getChainIdFromNetwork(n) !== localhostChainId);
  };

  if (!envNetworks || envNetworks.trim() === "") {
    return filterLocalhost(allNetworks);
  }

  // Parse comma-separated identifiers (can be chainId, slug, or networkId)
  const enabledIdentifiers = envNetworks.split(",").map((id) => id.trim());

  if (enabledIdentifiers.length === 0) {
    return filterLocalhost(allNetworks);
  }

  // Filter networks by enabled identifiers, maintaining order from env var
  const enabledNetworks: NetworkConfig[] = [];
  for (const identifier of enabledIdentifiers) {
    const network = resolveNetwork(identifier, allNetworks);
    if (network && !enabledNetworks.some((n) => n.networkId === network.networkId)) {
      enabledNetworks.push(network);
    }
  }

  return filterLocalhost(enabledNetworks.length > 0 ? enabledNetworks : allNetworks);
}

/**
 * Get enabled network IDs as an array (CAIP-2 format strings)
 */
export function getEnabledNetworkIds(): string[] {
  return getEnabledNetworks().map((n) => n.networkId);
}

/**
 * Get enabled chain IDs for EVM networks only
 */
export function getEnabledChainIds(): number[] {
  return getEnabledNetworks()
    .map((n) => getChainIdFromNetwork(n))
    .filter((chainId): chainId is number => chainId !== undefined);
}

/**
 * Check if a network is enabled (accepts chainId, slug, or networkId)
 */
export function isNetworkEnabled(identifier: string | number): boolean {
  const network = resolveNetwork(String(identifier), getAllNetworks());
  if (!network) return false;
  return getEnabledNetworkIds().includes(network.networkId);
}

/**
 * Get network config by identifier (chainId, slug, or networkId)
 */
export function getNetworkById(identifier: string | number): NetworkConfig | undefined {
  return resolveNetwork(String(identifier), getAllNetworks());
}

/**
 * Get network config by slug
 */
export function getNetworkBySlug(slug: string): NetworkConfig | undefined {
  return getAllNetworks().find((n) => n.slug?.toLowerCase() === slug.toLowerCase());
}

/**
 * Get network config by chainId (EVM networks only)
 */
export function getNetworkByChainId(chainId: number): NetworkConfig | undefined {
  return getAllNetworks().find((n) => extractChainIdFromNetworkId(n.networkId) === chainId);
}

/**
 * Get the full URL for a network logo (accepts chainId, slug, or networkId)
 */
export function getNetworkLogoUrlById(identifier: string | number): string | undefined {
  const network = getNetworkById(identifier);
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
