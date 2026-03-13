import { useCallback, useRef } from "react";
import { useSettings } from "../context/SettingsContext";
import { buildPersistentCacheKey, getCachedData, setCachedData } from "../utils/persistentCache";

/**
 * Hook that provides persistent cache operations.
 * All operations are no-ops when super user mode is disabled.
 * Callbacks have stable identity so they don't trigger re-fetches
 * when isSuperUser changes.
 *
 * Usage:
 *   const { getCached, setCached } = usePersistentCache();
 *   const cached = getCached<Block>("eip155:1", "block", "0x123");
 *   if (!cached) { fetch and then setCached(...) }
 */
export function usePersistentCache() {
  const { isSuperUser, settings } = useSettings();
  const maxSizeBytes = (settings.persistentCacheSizeMB ?? 10) * 1024 * 1024;

  // Use refs so callbacks stay stable across isSuperUser toggles
  const isSuperUserRef = useRef(isSuperUser);
  isSuperUserRef.current = isSuperUser;
  const maxSizeBytesRef = useRef(maxSizeBytes);
  maxSizeBytesRef.current = maxSizeBytes;

  const getCached = useCallback(
    <T>(networkId: string, type: string, identifier: string): T | null => {
      if (!isSuperUserRef.current) return null;
      const key = buildPersistentCacheKey(networkId, type, identifier);
      return getCachedData<T>(key);
    },
    [],
  );

  const setCached = useCallback(
    <T>(networkId: string, type: string, identifier: string, data: T): void => {
      if (!isSuperUserRef.current) return;
      const key = buildPersistentCacheKey(networkId, type, identifier);
      setCachedData(key, data, maxSizeBytesRef.current);
    },
    [],
  );

  return { getCached, setCached };
}
