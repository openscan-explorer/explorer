import { useContext, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { useSettings } from "../context/SettingsContext";
import { logger } from "../utils/logger";
import { autoSyncRpcs } from "../utils/rpcAutoSync";
import { saveRpcUrlsToStorage } from "../utils/rpcStorage";

const ROUTE_SETTLE_MS = 1500;

export function useRpcAutoSync(): void {
  const { rpcUrls, networksLoading, networks } = useContext(AppContext);
  const { settings, updateSettings } = useSettings();
  const location = useLocation();
  const syncedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: location.key is intentional — resets the debounce timer on every navigation event
  useEffect(() => {
    if (networksLoading) return;
    if (settings.rpcsSynced) return;
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
          updateSettings({ rpcsSynced: true });
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
  }, [location.key, networksLoading, settings.rpcsSynced, rpcUrls, networks, updateSettings]);
}
