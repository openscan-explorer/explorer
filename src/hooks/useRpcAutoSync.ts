import { useContext, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { logger } from "../utils/logger";
import { autoSyncRpcs } from "../utils/rpcAutoSync";
import { saveRpcUrlsToStorage } from "../utils/rpcStorage";

const ROUTE_SETTLE_MS = 1500;
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY = "openScan_lastRpcSyncTime";

function isSyncNeeded(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return true;

  const elapsed = Date.now() - Number(stored);
  return elapsed >= SYNC_INTERVAL_MS;
}

function saveSyncTimestamp(): void {
  localStorage.setItem(STORAGE_KEY, String(Date.now()));
}

export function useRpcAutoSync(): void {
  const { rpcUrls, networksLoading, networks } = useContext(AppContext);
  const location = useLocation();
  const syncedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: location.key is intentional — resets the debounce timer on every navigation event
  useEffect(() => {
    if (networksLoading) return;
    if (!isSyncNeeded()) return;
    if (Object.keys(rpcUrls).length === 0) return;
    if (syncedRef.current) return;

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      if (syncedRef.current) return;
      syncedRef.current = true;

      autoSyncRpcs(rpcUrls, networks)
        .then((sorted) => {
          saveRpcUrlsToStorage(sorted);
          saveSyncTimestamp();
          logger.info("Auto-sync RPCs completed, sorted order saved for next load");
        })
        .catch(() => {
          logger.warn("Auto-sync RPCs failed");
        });
    }, ROUTE_SETTLE_MS);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [location.key, networksLoading, rpcUrls, networks]);
}
