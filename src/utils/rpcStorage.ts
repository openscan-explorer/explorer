import { getAllNetworks } from "../config/networks";
import type { RpcUrlsContextType } from "../types";
import { getNetworkRpcKey } from "./networkResolver";

const STORAGE_KEY = "OPENSCAN_RPC_URLS_V3"; // Version bump for networkId-based keys

/**
 * Get default RPC endpoints from loaded network metadata
 * Returns RPC URLs for all networks, keyed by networkId (CAIP-2 format)
 */
export function getDefaultRpcEndpoints(): RpcUrlsContextType {
  const networks = getAllNetworks();
  const endpoints: RpcUrlsContextType = {};

  for (const network of networks) {
    if (network.rpc?.public && network.rpc.public.length > 0) {
      const key = getNetworkRpcKey(network);
      endpoints[key] = network.rpc.public;
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
    console.warn("Failed to parse RPC urls from storage", err);
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
    console.warn("Failed to save RPC urls to storage", err);
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
