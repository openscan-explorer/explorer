// src/hooks/useDataService.ts
import { useContext, useMemo } from "react";
import { AppContext } from "../context/AppContext";
import { useSettings } from "../context/SettingsContext";
import { DataService } from "../services/DataService";
import type { SupportedChainId } from "@openscan/network-connectors";
import type { RpcUrlsContextType } from "../types";

/**
 * Hook to get a DataService for a specific network
 * Automatically applies the RPC strategy from user settings
 * @param networkId - The network ID
 * @returns DataService instance
 */
export function useDataService(networkId: number) {
  const { rpcUrls } = useContext(AppContext);
  const { settings } = useSettings();

  const dataService = useMemo(() => {
    // Apply max parallel requests limit when using parallel strategy
    let limitedRpcUrls = rpcUrls;

    if (
      settings.rpcStrategy === "parallel" &&
      settings.maxParallelRequests &&
      settings.maxParallelRequests > 0
    ) {
      // Limit the RPC URLs to the first N endpoints for each network
      limitedRpcUrls = Object.keys(rpcUrls).reduce((acc, key) => {
        const chainId = Number(key);
        const urls = rpcUrls[chainId];
        if (urls) {
          acc[chainId] = urls.slice(0, settings.maxParallelRequests);
        }
        return acc;
      }, {} as RpcUrlsContextType);
    }

    return new DataService(networkId as SupportedChainId, limitedRpcUrls, settings.rpcStrategy);
  }, [networkId, rpcUrls, settings.rpcStrategy, settings.maxParallelRequests]);

  return dataService;
}
