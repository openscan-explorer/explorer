import type { AIAnalysisResult } from "../../../types";
import { logger } from "../../../utils/logger";

const CACHE_PREFIX = "openscan_ai_";
const CACHE_VERSION = 1;
const MAX_CACHE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

interface CachedAnalysis {
  result: AIAnalysisResult;
  contextHash: string;
  version: number;
  storedAt: number;
}

/**
 * Fast string hash (djb2 algorithm).
 * Used to hash serialized context objects for cache invalidation.
 */
export function hashContext(context: Record<string, unknown>): string {
  const str = JSON.stringify(context, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

/**
 * Build a cache key from analysis type, network ID, and identifier.
 */
export function buildCacheKey(type: string, networkId: string, identifier: string): string {
  return `${CACHE_PREFIX}${type}_${networkId}_${identifier}`;
}

/**
 * Get a cached analysis result if it exists and the context hash matches.
 * Returns null if cache miss, hash mismatch, or version mismatch.
 */
export function getCachedAnalysis(key: string, contextHash: string): AIAnalysisResult | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const cached: CachedAnalysis = JSON.parse(raw);
    if (cached.version !== CACHE_VERSION) {
      localStorage.removeItem(key);
      return null;
    }

    if (cached.contextHash !== contextHash) {
      return null;
    }

    return { ...cached.result, cached: true };
  } catch {
    logger.warn("Failed to read AI cache entry:", key);
    return null;
  }
}

/**
 * Store an analysis result in the cache.
 * Evicts oldest entries if total AI cache exceeds size limit.
 */
export function setCachedAnalysis(
  key: string,
  contextHash: string,
  result: AIAnalysisResult,
): void {
  try {
    const entry: CachedAnalysis = {
      result,
      contextHash,
      version: CACHE_VERSION,
      storedAt: Date.now(),
    };

    evictIfNeeded();
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    logger.warn("Failed to write AI cache entry:", key);
  }
}

/**
 * Clear all AI analysis cache entries from localStorage.
 */
export function clearAICache(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
  logger.info(`Cleared ${keysToRemove.length} AI cache entries`);
}

/**
 * Get the total size of AI cache entries in bytes.
 */
export function getAICacheSize(): number {
  let totalSize = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += key.length + value.length;
      }
    }
  }
  return totalSize;
}

/**
 * Evict oldest AI cache entries if total cache size exceeds limit.
 */
function evictIfNeeded(): void {
  if (getAICacheSize() <= MAX_CACHE_SIZE_BYTES) return;

  const entries: Array<{ key: string; storedAt: number }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(CACHE_PREFIX)) continue;

    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const cached: CachedAnalysis = JSON.parse(raw);
        entries.push({ key, storedAt: cached.storedAt });
      }
    } catch {
      // Remove invalid entries
      if (key) localStorage.removeItem(key);
    }
  }

  // Sort oldest first
  entries.sort((a, b) => a.storedAt - b.storedAt);

  // Remove oldest entries until under the size limit
  for (const entry of entries) {
    if (getAICacheSize() <= MAX_CACHE_SIZE_BYTES) break;
    localStorage.removeItem(entry.key);
    logger.debug("Evicted AI cache entry:", entry.key);
  }
}
