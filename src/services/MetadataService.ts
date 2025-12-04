/**
 * Service for fetching metadata from the openscan-explorer/explorer-metadata repository
 */

const METADATA_BASE_URL =
  "https://raw.githubusercontent.com/openscan-explorer/explorer-metadata/main/dist";

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
    const response = await fetch(`${METADATA_BASE_URL}/networks.json`);

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

/**
 * Supporter type from the metadata repository
 */
export type SupporterType = "network" | "app" | "organization" | "token";

/**
 * Supporter information from the metadata repository
 */
export interface Supporter {
  id: string;
  type: SupporterType;
  chainId?: number;
  name: string;
  startedAt: string;
  currentTier: 1 | 2 | 3;
  tierName: string;
  expiresAt: string;
  logo?: string;
  color?: string;
}

/**
 * Response from supporters.json
 */
export interface SupportersResponse {
  updatedAt: string;
  count: number;
  supporters: Array<{
    id: string;
    type: SupporterType;
    chainId?: number;
    name: string;
    startedAt: string;
    currentTier: 1 | 2 | 3;
    expiresAt: string;
  }>;
}

// Cache for supporters data
let supportersCache: SupportersResponse | null = null;
let supportersCacheTime: number = 0;

/**
 * Check if a supporter subscription is active
 */
export function isSupporterActive(expiresAt: string): boolean {
  const expires = new Date(expiresAt);
  return expires > new Date();
}

/**
 * Fetch all supporters from the metadata repository
 */
export async function fetchSupporters(): Promise<Supporter[]> {
  const now = Date.now();

  // Return cached data if still valid
  if (supportersCache && now - supportersCacheTime < CACHE_DURATION) {
    return processSupporters(supportersCache);
  }

  try {
    const response = await fetch(`${METADATA_BASE_URL}/supporters.json`);

    if (!response.ok) {
      throw new Error(`Failed to fetch supporters: ${response.statusText}`);
    }

    const data: SupportersResponse = await response.json();

    // Update cache
    supportersCache = data;
    supportersCacheTime = now;

    return processSupporters(data);
  } catch (error) {
    console.error("Error fetching supporters:", error);

    // Return cached data if available, even if stale
    if (supportersCache) {
      return processSupporters(supportersCache);
    }

    return [];
  }
}

/**
 * Process supporters response and enrich with additional data
 */
async function processSupporters(data: SupportersResponse): Promise<Supporter[]> {
  // Get networks data for logo and color information
  let networksMap: Map<number, NetworkMetadata> = new Map();
  try {
    const { networks } = await fetchNetworks();
    networksMap = new Map(networks.map((n) => [n.chainId, n]));
  } catch {
    // Continue without network data
  }

  const supporters: Supporter[] = data.supporters
    .filter((s) => isSupporterActive(s.expiresAt))
    .map((s) => {
      const network = s.chainId ? networksMap.get(s.chainId) : undefined;
      return {
        id: s.id,
        type: s.type,
        chainId: s.chainId,
        name: s.name,
        startedAt: s.startedAt,
        currentTier: s.currentTier,
        tierName: getSubscriptionTierName(s.currentTier),
        expiresAt: s.expiresAt,
        logo: network?.logo ? getNetworkLogoUrl(network.logo) : undefined,
        color: network?.color,
      };
    })
    // Sort by tier (higher tier first), then by name
    .sort((a, b) => {
      if (b.currentTier !== a.currentTier) {
        return b.currentTier - a.currentTier;
      }
      return a.name.localeCompare(b.name);
    });

  return supporters;
}

/**
 * Clear the supporters cache
 */
export function clearSupportersCache(): void {
  supportersCache = null;
  supportersCacheTime = 0;
}
