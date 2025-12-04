/**
 * Service for fetching metadata from the openscan-explorer/explorer-metadata repository
 */

const METADATA_BASE_URL =
  "https://raw.githubusercontent.com/openscan-explorer/explorer-metadata/main";

export interface NetworkLink {
  name: string;
  url: string;
  description?: string;
}

export interface NetworkSubscription {
  tier: 1 | 2 | 3; // 1: Backer, 2: Partner, 3: Ally
  expiresAt: string; // YYYY-MM-DD format
}

export interface NetworkExplorer {
  subdomain?: string;
  features?: string[];
  priority?: number;
}

export interface NetworkMetadata {
  chainId: number;
  name: string;
  shortName: string;
  description?: string;
  currency: string;
  color?: string;
  isTestnet?: boolean;
  subscription?: NetworkSubscription;
  logo?: string;
  profile?: string;
  explorer?: NetworkExplorer;
  rpc?: {
    public: string[];
  };
  links?: NetworkLink[];
}

export interface NetworksResponse {
  updatedAt: string;
  networks: NetworkMetadata[];
}

// Cache for fetched data
let networksCache: NetworksResponse | null = null;
let networksCacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch network configurations from the metadata repository
 */
export async function fetchNetworks(): Promise<NetworksResponse> {
  const now = Date.now();

  // Return cached data if still valid
  if (networksCache && now - networksCacheTime < CACHE_DURATION) {
    return networksCache;
  }

  try {
    const response = await fetch(`${METADATA_BASE_URL}/data/networks.json`);

    if (!response.ok) {
      throw new Error(`Failed to fetch networks: ${response.statusText}`);
    }

    const data: NetworksResponse = await response.json();

    // Update cache
    networksCache = data;
    networksCacheTime = now;

    return data;
  } catch (error) {
    console.error("Error fetching networks from metadata:", error);

    // Return cached data if available, even if stale
    if (networksCache) {
      return networksCache;
    }

    throw error;
  }
}

/**
 * Get the logo URL for a network
 */
export function getNetworkLogoUrl(logoPath: string): string {
  if (logoPath.startsWith("http")) {
    return logoPath;
  }
  return `${METADATA_BASE_URL}/${logoPath}`;
}

/**
 * Clear the networks cache (useful for testing or forced refresh)
 */
export function clearNetworksCache(): void {
  networksCache = null;
  networksCacheTime = 0;
}

/**
 * Fetch network profile markdown content
 */
export async function fetchNetworkProfile(profilePath: string): Promise<string | null> {
  if (!profilePath) {
    return null;
  }

  try {
    const url = profilePath.startsWith("http")
      ? profilePath
      : `${METADATA_BASE_URL}/${profilePath}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Failed to fetch network profile: ${response.statusText}`);
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error("Error fetching network profile:", error);
    return null;
  }
}

/**
 * Check if a network subscription is active
 */
export function isSubscriptionActive(subscription?: NetworkSubscription): boolean {
  if (!subscription) {
    return false;
  }

  const expiresAt = new Date(subscription.expiresAt);
  return expiresAt > new Date();
}

/**
 * Get subscription tier name
 */
export function getSubscriptionTierName(tier: 1 | 2 | 3): string {
  switch (tier) {
    case 1:
      return "Backer";
    case 2:
      return "Partner";
    case 3:
      return "Ally";
    default:
      return "Unknown";
  }
}
