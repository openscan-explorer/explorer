/**
 * Beacon Chain API configuration for EIP-4844 blob data retrieval.
 */

/** Default public Beacon API endpoints per network (CAIP-2 format) */
export const DEFAULT_BEACON_URLS: Record<string, string> = {
  "eip155:1": "https://ethereum-beacon-api.publicnode.com",
  "eip155:11155111": "https://ethereum-sepolia-beacon-api.publicnode.com",
};

/** Beacon chain genesis timestamps in seconds since Unix epoch */
const BEACON_GENESIS_TIMES: Record<string, number> = {
  "eip155:1": 1606824023,
  "eip155:11155111": 1655733600,
};

const SECONDS_PER_SLOT = 12;

/**
 * Compute the beacon slot number from an execution layer block timestamp.
 * Returns null if the network's beacon genesis time is unknown.
 */
export function computeSlotFromTimestamp(networkId: string, blockTimestamp: number): number | null {
  const genesis = BEACON_GENESIS_TIMES[networkId];
  if (genesis === undefined || blockTimestamp < genesis) return null;
  return Math.floor((blockTimestamp - genesis) / SECONDS_PER_SLOT);
}

/**
 * Get the effective Beacon API URL for a network.
 * User-configured URLs override defaults.
 */
export function getBeaconUrl(
  networkId: string,
  userBeaconUrls?: Record<string, string>,
): string | null {
  return userBeaconUrls?.[networkId] || DEFAULT_BEACON_URLS[networkId] || null;
}

/** Networks that support beacon blob queries */
export const BEACON_SUPPORTED_NETWORKS: Record<string, string> = {
  "eip155:1": "Ethereum",
  "eip155:11155111": "Sepolia",
};
