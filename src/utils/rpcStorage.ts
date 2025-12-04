import { getAllNetworks } from "../config/networks";
import type { RpcUrlsContextType } from "../types";

const STORAGE_KEY = "OPENSCAN_RPC_URLS_V1";

/**
 * Get default RPC endpoints from loaded network metadata
 * Returns RPC URLs for all networks that have been loaded from metadata
 */
export function getDefaultRpcEndpoints(): RpcUrlsContextType {
  const networks = getAllNetworks();
  const endpoints: RpcUrlsContextType = {};

  for (const network of networks) {
    if (network.rpc?.public && network.rpc.public.length > 0) {
      endpoints[network.networkId] = network.rpc.public;
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
 */
export function loadRpcUrlsFromStorage(): RpcUrlsContextType | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    if (!isValidRpcMap(parsed)) return null;
    // keys are strings from JSON -> convert to numbers
    const result: RpcUrlsContextType = {};
    for (const k of Object.keys(parsed)) {
      const n = Number(k);
      if (Number.isNaN(n)) continue;
      const val = parsed[k];
      if (!val) continue;
      result[n] = val;
    }
    return result;
  } catch (err) {
    console.warn("Failed to parse RPC urls from storage", err);
    return null;
  }
}

/**
 * Save RPC urls to localStorage. Keys should be numeric network ids.
 */
export function saveRpcUrlsToStorage(map: RpcUrlsContextType): void {
  try {
    // convert keys to strings for JSON
    const serialized: Record<string, string[]> = {};
    for (const k of Object.keys(map)) {
      const n = Number(k);
      const val = map[n];
      if (!val) continue;
      serialized[String(n)] = val;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (err) {
    console.warn("Failed to save RPC urls to storage", err);
  }
}

/**
 * Return the effective rpc urls by merging defaults with any stored overrides.
 * Stored values override default for a networkId; missing networks fall back to defaults.
 * Defaults are fetched from loaded network metadata.
 */
export function getEffectiveRpcUrls(): RpcUrlsContextType {
  const defaults = getDefaultRpcEndpoints();
  const stored = loadRpcUrlsFromStorage();
  if (!stored) return defaults;
  // merge copy
  const merged: RpcUrlsContextType = { ...defaults };
  for (const k of Object.keys(stored)) {
    const n = Number(k);
    if (Number.isNaN(n)) continue;
    const val = stored[n];
    if (!val || !Array.isArray(val) || val.length === 0) continue;
    merged[n] = val;
  }
  return merged;
}

export { STORAGE_KEY };
