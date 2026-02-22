import type { MetadataRpcEndpoint } from "../services/MetadataService";
import type { RpcUrlsContextType } from "../types";
import { logger } from "./logger";

const STORAGE_KEY = "OPENSCAN_RPC_URLS_V3"; // Version bump for networkId-based keys
const METADATA_RPC_STORAGE_KEY = "OPENSCAN_METADATA_RPCS";
const METADATA_RPC_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface MetadataRpcCache {
  timestamp: number;
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
    const cache: MetadataRpcCache = { timestamp: Date.now(), rpcs };
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
export function getEffectiveRpcUrls(): RpcUrlsContextType {
  const defaults = getDefaultRpcEndpoints();
  const stored = loadRpcUrlsFromStorage();
  if (!stored) return defaults;

  // Merge: stored values override defaults
  const merged: RpcUrlsContextType = { ...defaults };
  for (const k of Object.keys(stored)) {
    const val = stored[k];
    if (!val || !Array.isArray(val) || val.length === 0) continue;
    merged[k] = val;
  }
  return merged;
}

export { STORAGE_KEY };
