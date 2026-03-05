import { useContext, useEffect, useState } from "react";
import { AppContext } from "../context";
import { type ProxyInfo, detectProxy } from "../utils/proxyDetection";

export function useProxyInfo(
  address: string,
  networkId: string,
  bytecode: string,
): ProxyInfo | null {
  const { rpcUrls } = useContext(AppContext);
  const [proxyInfo, setProxyInfo] = useState<ProxyInfo | null>(null);

  useEffect(() => {
    if (!address || !networkId || !bytecode || bytecode === "0x") return;

    const rpcNetworkId = `eip155:${networkId}`;
    const urls = rpcUrls[rpcNetworkId];
    const rpcUrl = Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
    if (!rpcUrl) return;

    detectProxy(address, rpcUrl, bytecode)
      .then(setProxyInfo)
      .catch(() => setProxyInfo(null));
  }, [address, networkId, bytecode, rpcUrls]);

  return proxyInfo;
}
