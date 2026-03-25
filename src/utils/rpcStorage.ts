import { OPENSCAN_WORKER_URL } from "../config/workerConfig";
import { type MetadataRpcEndpoint, METADATA_VERSION } from "../services/MetadataService";
import type { RpcUrlsContextType } from "../types";
import { logger } from "./logger";

const STORAGE_KEY = "OPENSCAN_RPC_URLS_V3"; // Version bump for networkId-based keys
const METADATA_RPC_STORAGE_KEY = "OPENSCAN_METADATA_RPCS";
const METADATA_RPC_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Hardcoded fallback defaults for networks that are never in the metadata service.
 * Includes localhost, worker-proxied BTC, and worker-proxied EVM endpoints.
 * Metadata service RPCs and user-configured RPCs take priority via getEffectiveRpcUrls().
 */
const BUILTIN_RPC_DEFAULTS: RpcUrlsContextType = {
  "eip155:31337": ["http://localhost:8545"],
  "bip122:000000000019d6689c085ae165831e93": [
    `${OPENSCAN_WORKER_URL}/btc/alchemy`,
    `${OPENSCAN_WORKER_URL}/btc/drpc`,
    `${OPENSCAN_WORKER_URL}/btc/ankr`,
    `${OPENSCAN_WORKER_URL}/btc/onfinality/bip122:000000000019d6689c085ae165831e93`,
  ],
  "bip122:00000000da84f2bafbbc53dee25a72ae": [
    `${OPENSCAN_WORKER_URL}/btc/onfinality/bip122:00000000da84f2bafbbc53dee25a72ae`,
  ],
  "eip155:1": [
    `${OPENSCAN_WORKER_URL}/evm/alchemy/eip155:1`,
    `${OPENSCAN_WORKER_URL}/evm/infura/eip155:1`,
    `${OPENSCAN_WORKER_URL}/evm/drpc/eip155:1`,
    `${OPENSCAN_WORKER_URL}/evm/ankr/eip155:1`,
  ],
  "eip155:42161": [
    `${OPENSCAN_WORKER_URL}/evm/alchemy/eip155:42161`,
    `${OPENSCAN_WORKER_URL}/evm/infura/eip155:42161`,
    `${OPENSCAN_WORKER_URL}/evm/drpc/eip155:42161`,
    `${OPENSCAN_WORKER_URL}/evm/ankr/eip155:42161`,
  ],
  "eip155:10": [
    `${OPENSCAN_WORKER_URL}/evm/alchemy/eip155:10`,
    `${OPENSCAN_WORKER_URL}/evm/infura/eip155:10`,
    `${OPENSCAN_WORKER_URL}/evm/drpc/eip155:10`,
    `${OPENSCAN_WORKER_URL}/evm/ankr/eip155:10`,
  ],
  "eip155:8453": [
    `${OPENSCAN_WORKER_URL}/evm/alchemy/eip155:8453`,
    `${OPENSCAN_WORKER_URL}/evm/infura/eip155:8453`,
    `${OPENSCAN_WORKER_URL}/evm/drpc/eip155:8453`,
    `${OPENSCAN_WORKER_URL}/evm/ankr/eip155:8453`,
  ],
  "eip155:137": [
    `${OPENSCAN_WORKER_URL}/evm/alchemy/eip155:137`,
    `${OPENSCAN_WORKER_URL}/evm/infura/eip155:137`,
    `${OPENSCAN_WORKER_URL}/evm/drpc/eip155:137`,
    `${OPENSCAN_WORKER_URL}/evm/ankr/eip155:137`,
  ],
  "eip155:56": [
    `${OPENSCAN_WORKER_URL}/evm/alchemy/eip155:56`,
    `${OPENSCAN_WORKER_URL}/evm/drpc/eip155:56`,
    `${OPENSCAN_WORKER_URL}/evm/ankr/eip155:56`,
  ],
  "eip155:43114": [
    `${OPENSCAN_WORKER_URL}/evm/alchemy/eip155:43114`,
    `${OPENSCAN_WORKER_URL}/evm/infura/eip155:43114`,
    `${OPENSCAN_WORKER_URL}/evm/drpc/eip155:43114`,
    `${OPENSCAN_WORKER_URL}/evm/ankr/eip155:43114`,
  ],
};

interface MetadataRpcCache {
  timestamp: number;
  version?: string;
  rpcs: Record<string, MetadataRpcEndpoint[]>;
}

/**
 * Load metadata RPC cache from localStorage
 */
export function loadMetadataRpcsFromStorage(): MetadataRpcCache | null {
  try {
    const raw = localStorage.getItem(METADATA_RPC_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MetadataRpcCache;
    if (!parsed || typeof parsed.timestamp !== "number" || !parsed.rpcs) return null;
    return parsed;
  } catch (err) {
    logger.warn("Failed to parse metadata RPCs from storage", err);
    return null;
  }
}

/**
 * Save metadata RPC endpoints to localStorage
 */
export function saveMetadataRpcsToStorage(rpcs: Record<string, MetadataRpcEndpoint[]>): void {
  try {
    const cache: MetadataRpcCache = { timestamp: Date.now(), version: METADATA_VERSION, rpcs };
    localStorage.setItem(METADATA_RPC_STORAGE_KEY, JSON.stringify(cache));
  } catch (err) {
    logger.warn("Failed to save metadata RPCs to storage", err);
  }
}

/**
 * Check if the metadata RPC cache is fresh (within TTL)
 */
export function isMetadataRpcCacheFresh(): boolean {
  const cache = loadMetadataRpcsFromStorage();
  if (!cache) return false;
  if (cache.version !== METADATA_VERSION) return false;
  return Date.now() - cache.timestamp < METADATA_RPC_TTL;
}

/**
 * Clear the metadata RPC cache from localStorage
 */
export function clearMetadataRpcCache(): void {
  localStorage.removeItem(METADATA_RPC_STORAGE_KEY);
}

/**
 * Get the full endpoint map from cached metadata RPCs
 * For use in Settings page to look up tracking/openSource per URL
 */
export function getMetadataEndpointMap(): Record<string, MetadataRpcEndpoint[]> {
  const cache = loadMetadataRpcsFromStorage();
  return cache?.rpcs ?? {};
}

/**
 * Get default RPC endpoints from the metadata RPC cache
 * Returns RPC URLs for all cached networks, keyed by networkId (CAIP-2 format)
 * If no cache exists yet, returns empty {} (the app will fetch and populate on startup)
 */
export function getDefaultRpcEndpoints(): RpcUrlsContextType {
  const cache = loadMetadataRpcsFromStorage();
  if (!cache) return {};

  const endpoints: RpcUrlsContextType = {};
  for (const [networkId, epList] of Object.entries(cache.rpcs)) {
    const urls = epList.map((ep) => ep.url);
    if (urls.length > 0) {
      endpoints[networkId] = urls;
    }
  }
  return endpoints;
}

// biome-ignore lint/suspicious/noExplicitAny: <TODO>
function isValidRpcMap(obj: any): obj is RpcUrlsContextType {
  if (!obj || typeof obj !== "object") return false;
  for (const k of Object.keys(obj)) {
    const val = obj[k];
    if (!Array.isArray(val) || !val.every((v) => typeof v === "string")) return false;
  }
  return true;
}

/**
 * Load RPC urls from localStorage. Returns null if nothing found or invalid.
 * Keys are networkId strings (CAIP-2 format)
 */
export function loadRpcUrlsFromStorage(): RpcUrlsContextType | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    if (!isValidRpcMap(parsed)) return null;
    return parsed;
  } catch (err) {
    logger.warn("Failed to parse RPC urls from storage", err);
    return null;
  }
}

/**
 * Save RPC urls to localStorage.
 * Keys are networkId strings (CAIP-2 format)
 */
export function saveRpcUrlsToStorage(map: RpcUrlsContextType): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    logger.warn("Failed to save RPC urls to storage", err);
  }
}

/**
 * Return the effective rpc urls by merging defaults with any stored overrides.
 * Stored values override default for a network; missing networks fall back to defaults.
 * Keys are networkId strings (CAIP-2 format)
 */
/**
 * Check whether a URL points to the OpenScan worker proxy.
 */
export function isWorkerProxyUrl(url: string): boolean {
  return OPENSCAN_WORKER_URL.length > 0 && url.startsWith(OPENSCAN_WORKER_URL);
}

export function getEffectiveRpcUrls(options?: {
  excludeWorkerProxy?: boolean;
}): RpcUrlsContextType {
  // Merge metadata and builtin worker URLs per-network (concatenate arrays, deduplicate)
  const metadataDefaults = getDefaultRpcEndpoints();
  const allNetworkIds = new Set([
    ...Object.keys(metadataDefaults),
    ...Object.keys(BUILTIN_RPC_DEFAULTS),
  ]);
  const defaults: RpcUrlsContextType = {};
  for (const networkId of allNetworkIds) {
    const metadataUrls = metadataDefaults[networkId] ?? [];
    const builtinUrls = BUILTIN_RPC_DEFAULTS[networkId] ?? [];
    defaults[networkId] = [...new Set([...metadataUrls, ...builtinUrls])];
  }
  const stored = loadRpcUrlsFromStorage();

  const merged: RpcUrlsContextType = { ...defaults };
  if (stored) {
    for (const k of Object.keys(stored)) {
      const val = stored[k];
      if (!val || !Array.isArray(val) || val.length === 0) continue;
      // Merge stored URLs with defaults so builtin worker URLs are always present
      const defaultUrls = defaults[k] ?? [];
      merged[k] = [...new Set([...val, ...defaultUrls])];
    }
  }

  if (options?.excludeWorkerProxy) {
    const filtered: RpcUrlsContextType = {};
    for (const [networkId, urls] of Object.entries(merged)) {
      filtered[networkId] = urls.filter((url) => !isWorkerProxyUrl(url));
    }
    return filtered;
  }

  return merged;
}

export { STORAGE_KEY };
