// src/hooks/useDataService.ts
import { useContext, useMemo } from "react";
import { AppContext } from "../context/AppContext";
import { useSettings } from "../context/SettingsContext";
import { DataService } from "../services/DataService";

/**
 * Hook to get a DataService for a specific network
 * Automatically applies the RPC strategy from user settings
 * @param networkId - The network ID
 * @returns DataService instance
 */
export function useDataService(networkId: number) {
  const { rpcUrls } = useContext(AppContext);
  const { settings } = useSettings();

  console.log(
    "useDataService called with networkId:",
    networkId,
    "strategy:",
    settings.rpcStrategy,
  );

  const dataService = useMemo(() => {
    console.log(
      "useMemo creating new DataService for networkId:",
      networkId,
      "with strategy:",
      settings.rpcStrategy,
    );
    return new DataService(networkId, rpcUrls, settings.rpcStrategy);
  }, [networkId, rpcUrls, settings.rpcStrategy]);

  console.log("useDataService returning dataService for networkId:", networkId);
  return dataService;
}
