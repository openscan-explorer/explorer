// Subdomain routing configuration
// Maps subdomains to redirect paths within the app

export interface SubdomainConfig {
  /** The subdomain to match (e.g., "ethereum" matches ethereum.localhost or ethereum.openscan.io) */
  subdomain: string;
  /** The path to redirect to within the app */
  redirect: string;
  /** Whether this subdomain routing is enabled */
  enabled: boolean;
}

// Weenus test token address on Sepolia
const WEENUS_SEPOLIA_ADDRESS = "0x7E0987E5b3a30e3f2828572Bb659A548460a3003";

// Check if we're in development mode
const isDevelopment = process.env.REACT_APP_ENVIRONMENT === "development";

export const subdomainConfig: SubdomainConfig[] = [
  // Network subdomains
  { subdomain: "ethereum", redirect: "/1", enabled: true },
  { subdomain: "localhost", redirect: "/31337", enabled: isDevelopment },

  // Profile subdomains
  { subdomain: "openscan-app", redirect: "/profile/app/openscan", enabled: true },
  { subdomain: "openscan-org", redirect: "/profile/organization/openscan", enabled: true },

  // Token subdomains
  { subdomain: "weenus", redirect: `/11155111/address/${WEENUS_SEPOLIA_ADDRESS}`, enabled: true },
];

/**
 * Get subdomain config by subdomain name
 */
export function getSubdomainConfig(subdomain: string): SubdomainConfig | undefined {
  return subdomainConfig.find((config) => config.subdomain === subdomain && config.enabled);
}

/**
 * Get subdomain config by redirect path
 * Used to find if a path has an associated subdomain
 */
export function getSubdomainByRedirect(redirectPath: string): SubdomainConfig | undefined {
  return subdomainConfig.find((config) => config.redirect === redirectPath && config.enabled);
}

/**
 * Get subdomain config for a network ID
 * Returns the subdomain if the network has one configured
 */
export function getSubdomainForNetwork(networkId: number): SubdomainConfig | undefined {
  return subdomainConfig.find((config) => config.redirect === `/${networkId}` && config.enabled);
}
