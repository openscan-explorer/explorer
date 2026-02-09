// src/hooks/useDataService.ts
import { useContext, useMemo } from "react";
import { AppContext } from "../context/AppContext";
import { useSettings } from "../context/SettingsContext";
import { DataService } from "../services/DataService";
import type { NetworkConfig, RpcUrlsContextType } from "../types";
import { resolveNetwork } from "../utils/networkResolver";
import { getAllNetworks } from "../config/networks";

/**
 * Hook to get a DataService for a specific network
 * Automatically applies the RPC strategy from user settings
 *
 * @param networkIdOrConfig - Network identifier (chainId, slug, networkId) or NetworkConfig
 * @returns DataService instance or null if network not found
 */
export function useDataService(networkIdOrConfig: string | number | NetworkConfig) {
  const { rpcUrls } = useContext(AppContext);
  const { settings } = useSettings();

  const dataService = useMemo(() => {
    // Resolve network config if needed
    let network: NetworkConfig | undefined;
    if (typeof networkIdOrConfig === "object") {
      network = networkIdOrConfig;
    } else {
      network = resolveNetwork(String(networkIdOrConfig), getAllNetworks());
    }

    if (!network) {
      return null;
    }

    // Apply max parallel requests limit when using parallel strategy
    let limitedRpcUrls = rpcUrls;

    if (
      (settings.rpcStrategy === "parallel" || settings.rpcStrategy === "race") &&
      settings.maxParallelRequests &&
      settings.maxParallelRequests > 0
    ) {
      // Limit the RPC URLs to the first N endpoints for each network
      limitedRpcUrls = Object.keys(rpcUrls).reduce((acc, key) => {
        const networkKey = Number.isNaN(Number(key)) ? key : Number(key);
        const urls = rpcUrls[networkKey];
        if (urls) {
          acc[networkKey] = urls.slice(0, settings.maxParallelRequests);
        }
        return acc;
      }, {} as RpcUrlsContextType);
    }

    return new DataService(network, limitedRpcUrls, settings.rpcStrategy);
  }, [networkIdOrConfig, rpcUrls, settings.rpcStrategy, settings.maxParallelRequests]);

  return dataService;
}
