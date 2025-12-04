// src/config/rpcConfig.ts
import type { RpcUrlsContextType } from "../types";

/**
 * Get RPC URLs for a given network ID (returns array for fallback support)
 * @param networkId - The network ID to get RPC URLs for
 * @param rpcUrlsMap - Optional RPC URLs map from context/storage. Falls back to RPC_ENDPOINTS if not provided
 */
export function getRPCUrls(networkId: number, rpcUrlsMap: RpcUrlsContextType): string[] {
  const effectiveMap = rpcUrlsMap;
  const urls = effectiveMap[networkId as keyof RpcUrlsContextType];
  if (!urls || urls.length === 0) {
    throw new Error(`No RPC endpoint configured for network ID ${networkId}`);
  }
  return urls;
}
