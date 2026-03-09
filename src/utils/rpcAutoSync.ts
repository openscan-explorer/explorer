import { testRpcEndpoint } from "../components/pages/rpcs/useRpcLatencyTest";
import type { RpcTestResult } from "../components/pages/rpcs/useRpcLatencyTest";
import type { MetadataRpcEndpoint } from "../services/MetadataService";
import type { NetworkConfig, RpcUrlsContextType } from "../types";
import { getMetadataEndpointMap } from "./rpcStorage";

export function getPrivacyTier(url: string, metadata: Map<string, MetadataRpcEndpoint>): number {
  const ep = metadata.get(url);
  if (!ep) return 1;
  if (ep.tracking !== "none") return 2;
  if (ep.isOpenSource) return 0;
  return 1;
}

export function sortRpcsByQuality(
  urls: string[],
  results: Map<string, RpcTestResult>,
  metadata: Map<string, MetadataRpcEndpoint>,
): string[] {
  return [...urls].sort((a, b) => {
    const rA = results.get(a);
    const rB = results.get(b);
    const aOnline = rA?.status === "online" && rA.latency != null;
    const bOnline = rB?.status === "online" && rB.latency != null;
    if (!aOnline && !bOnline) return 0;
    if (!aOnline) return 1;
    if (!bOnline) return -1;
    const tierA = getPrivacyTier(a, metadata);
    const tierB = getPrivacyTier(b, metadata);
    if (tierA !== tierB) return tierA - tierB;
    return (rA.latency as number) - (rB.latency as number);
  });
}

function buildMetadataUrlMap(): Map<string, MetadataRpcEndpoint> {
  const endpointMap = getMetadataEndpointMap();
  const urlMap = new Map<string, MetadataRpcEndpoint>();
  for (const endpoints of Object.values(endpointMap)) {
    for (const ep of endpoints) {
      urlMap.set(ep.url, ep);
    }
  }
  return urlMap;
}

export async function autoSyncRpcs(
  rpcUrls: RpcUrlsContextType,
  networks: NetworkConfig[],
): Promise<RpcUrlsContextType> {
  const metadataUrlMap = buildMetadataUrlMap();
  const updated = { ...rpcUrls };

  await Promise.allSettled(
    Object.entries(rpcUrls)
      .filter(([, urls]) => urls.length >= 2)
      .map(async ([networkId, urls]) => {
        const network = networks.find((n) => n.networkId === networkId);
        if (!network) return;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5_000);
        try {
          const results = await Promise.all(
            urls.map((url) => testRpcEndpoint(url, controller.signal, network.type)),
          );
          const resultsMap = new Map(results.map((r) => [r.url, r]));
          updated[networkId] = sortRpcsByQuality(urls, resultsMap, metadataUrlMap);
        } finally {
          clearTimeout(timeout);
        }
      }),
  );

  return updated;
}
