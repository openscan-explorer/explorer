import { getSubdomainConfig, getSubdomainForNetwork } from "../config/subdomains";

/**
 * Extract subdomain from the current hostname
 * Handles both localhost subdomains (ethereum.localhost) and production (ethereum.openscan.io)
 */
export function getSubdomain(): string | null {
  const hostname = window.location.hostname;

  // Skip subdomain processing for Netlify preview/deploy URLs
  // These follow patterns like: pr-95--openscan.netlify.app, deploy-preview-123--site.netlify.app
  if (hostname.endsWith(".netlify.app")) {
    return null;
  }

  // Skip subdomain processing for GitHub Pages
  if (hostname.endsWith(".github.io")) {
    return null;
  }

  // Skip subdomain processing for ENS gateways (e.g., openscan.eth.link, openscan.eth.limo)
  if (hostname.endsWith(".eth.link") || hostname.endsWith(".eth.limo")) {
    return null;
  }

  // Handle localhost subdomains (e.g., ethereum.localhost)
  if (hostname.endsWith(".localhost")) {
    return hostname.replace(".localhost", "");
  }

  // Handle IP-based domains (e.g., ethereum.127.0.0.1.nip.io)
  if (hostname.includes(".nip.io") || hostname.includes(".sslip.io")) {
    const parts = hostname.split(".");
    if (parts.length > 4 && parts[0]) {
      return parts[0];
    }
    return null;
  }

  // Handle lvh.me domains (e.g., ethereum.lvh.me)
  if (hostname.endsWith(".lvh.me")) {
    const parts = hostname.split(".");
    if (parts.length > 2 && parts[0]) {
      return parts[0];
    }
    return null;
  }

  // Handle production subdomains (e.g., ethereum.openscan.io)
  // Skip if it's just the base domain (openscan.io) or www
  const parts = hostname.split(".");
  if (parts.length > 2 && parts[0]) {
    const subdomain = parts[0];
    // Skip common non-subdomain prefixes
    if (subdomain !== "www") {
      return subdomain;
    }
  }

  return null;
}

/**
 * Get the redirect path for the current subdomain, if any
 * Returns null if no subdomain or no matching config
 */
export function getSubdomainRedirect(): string | null {
  const subdomain = getSubdomain();
  if (!subdomain) {
    return null;
  }

  const config = getSubdomainConfig(subdomain);
  if (!config) {
    return null;
  }

  return config.redirect;
}

/**
 * Check if we're on a subdomain that should redirect
 */
export function hasSubdomainRedirect(): boolean {
  return getSubdomainRedirect() !== null;
}

/**
 * Get the subdomain URL for a network ID
 * Returns null if the network doesn't have a configured subdomain
 */
export function getNetworkSubdomainUrl(networkId: number): string | null {
  const config = getSubdomainForNetwork(networkId);
  if (!config) {
    return null;
  }

  const { protocol, port, hostname } = window.location;
  const portSuffix = port ? `:${port}` : "";

  // Handle localhost
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return `${protocol}//${config.subdomain}.localhost${portSuffix}/`;
  }

  // Handle lvh.me
  if (hostname === "lvh.me" || hostname.endsWith(".lvh.me")) {
    return `${protocol}//${config.subdomain}.lvh.me${portSuffix}/`;
  }

  // Handle nip.io / sslip.io
  if (hostname.includes(".nip.io")) {
    const baseParts = hostname.split(".");
    // Get the IP part (e.g., 127.0.0.1.nip.io)
    const ipAndDomain = baseParts.slice(-5).join(".");
    return `${protocol}//${config.subdomain}.${ipAndDomain}${portSuffix}/`;
  }

  if (hostname.includes(".sslip.io")) {
    const baseParts = hostname.split(".");
    const ipAndDomain = baseParts.slice(-5).join(".");
    return `${protocol}//${config.subdomain}.${ipAndDomain}${portSuffix}/`;
  }

  // Handle production domains (e.g., openscan.io -> ethereum.openscan.io)
  const parts = hostname.split(".");
  // Get the base domain (last 2 parts, e.g., openscan.io)
  const baseDomain = parts.length > 2 ? parts.slice(-2).join(".") : hostname;
  return `${protocol}//${config.subdomain}.${baseDomain}${portSuffix}/`;
}

/**
 * Get the base domain URL (without subdomain)
 * Returns null if already on base domain
 */
export function getBaseDomainUrl(): string | null {
  const hostname = window.location.hostname;
  const { protocol, port } = window.location;

  // Handle localhost subdomains (e.g., ethereum.localhost -> localhost)
  if (hostname.endsWith(".localhost")) {
    const portSuffix = port ? `:${port}` : "";
    return `${protocol}//localhost${portSuffix}/`;
  }

  // Handle IP-based domains (e.g., ethereum.127.0.0.1.nip.io)
  if (hostname.includes(".nip.io") || hostname.includes(".sslip.io")) {
    const parts = hostname.split(".");
    if (parts.length > 4) {
      // Remove first part (subdomain)
      const baseDomain = parts.slice(1).join(".");
      const portSuffix = port ? `:${port}` : "";
      return `${protocol}//${baseDomain}${portSuffix}/`;
    }
    return null;
  }

  // Handle lvh.me domains (e.g., ethereum.lvh.me -> lvh.me)
  if (hostname.endsWith(".lvh.me")) {
    const parts = hostname.split(".");
    if (parts.length > 2) {
      const portSuffix = port ? `:${port}` : "";
      return `${protocol}//lvh.me${portSuffix}/`;
    }
    return null;
  }

  // Handle production subdomains (e.g., ethereum.openscan.io -> openscan.io)
  const parts = hostname.split(".");
  if (parts.length > 2 && parts[0] && parts[0] !== "www") {
    const baseDomain = parts.slice(1).join(".");
    const portSuffix = port ? `:${port}` : "";
    return `${protocol}//${baseDomain}${portSuffix}/`;
  }

  return null;
}
