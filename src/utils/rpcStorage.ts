import { RPC_ENDPOINTS } from '../config/rpcConfig';
import { RpcUrlsContextType } from '../types';

const STORAGE_KEY = 'OPENSCAN_RPC_URLS_V1';

type RpcMap = Record<number, string[]>;

function isValidRpcMap(obj: any): obj is RpcMap {
  if (!obj || typeof obj !== 'object') return false;
  for (const k of Object.keys(obj)) {
    const val = obj[k];
    if (!Array.isArray(val) || !val.every(v => typeof v === 'string')) return false;
  }
  return true;
}

/**
 * Load RPC urls from localStorage. Returns null if nothing found or invalid.
 */
export function loadRpcUrlsFromStorage(): RpcMap | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    if (!isValidRpcMap(parsed)) return null;
    // keys are strings from JSON -> convert to numbers
    const result: RpcMap = {};
    for (const k of Object.keys(parsed)) {
      const n = Number(k);
      if (Number.isNaN(n)) continue;
      const val = parsed[k];
      if (!val) continue;
      result[n] = val;
    }
    return result;
  } catch (err) {
    console.warn('Failed to parse RPC urls from storage', err);
    return null;
  }
}

/**
 * Save RPC urls to localStorage. Keys should be numeric chain ids.
 */
export function saveRpcUrlsToStorage(map: RpcMap): void {
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
    console.warn('Failed to save RPC urls to storage', err);
  }
}

/**
 * Return the effective rpc urls by merging defaults with any stored overrides.
 * Stored values override default for a chainId; missing chains fall back to defaults.
 */
export function getEffectiveRpcUrls(): RpcUrlsContextType {
  const defaults: RpcMap = RPC_ENDPOINTS as unknown as RpcMap;
  const stored = loadRpcUrlsFromStorage();
  if (!stored) return defaults as RpcUrlsContextType;
  // merge copy
  const merged: RpcMap = { ...defaults };
  for (const k of Object.keys(stored)) {
    const n = Number(k);
    if (Number.isNaN(n)) continue;
    const val = stored[n];
    if (!val || !Array.isArray(val) || val.length === 0) continue;
    merged[n] = val;
  }
  return merged as RpcUrlsContextType;
}

export { STORAGE_KEY };
