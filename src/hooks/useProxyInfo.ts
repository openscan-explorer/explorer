import { useEffect, useState } from "react";
import { useDataService } from "./useDataService";
import { type ProxyInfo, detectProxy } from "../utils/proxyDetection";

export function useProxyInfo(
  address: string,
  networkId: string,
  bytecode: string,
): ProxyInfo | null {
  const dataService = useDataService(Number(networkId));
  const [proxyInfo, setProxyInfo] = useState<ProxyInfo | null>(null);

  useEffect(() => {
    if (!address || !networkId || !bytecode || bytecode === "0x") return;
    if (!dataService?.networkAdapter) return;

    detectProxy(address, dataService.networkAdapter, bytecode)
      .then(setProxyInfo)
      .catch(() => {
        // Keep the last known proxyInfo on failure (e.g. RPC error on re-fetch).
        // Resetting to null would disable the implementation contract fetch and
        // cause verified contract data to disappear from the UI.
      });
  }, [address, networkId, bytecode, dataService]);

  return proxyInfo;
}
