// src/config/rpcConfig.ts
import type { RpcUrlsContextType } from "../types";

/**
 * Get RPC URLs for a given network identifier (returns array for fallback support)
 *
 * @param networkId - The network ID (CAIP-2 format, e.g., "eip155:1")
 * @param rpcUrlsMap - RPC URLs map from context/storage
 */
export function getRPCUrls(networkId: string, rpcUrlsMap: RpcUrlsContextType): string[] {
  const urls = rpcUrlsMap[networkId];
  if (!urls || urls.length === 0) {
    throw new Error(`No RPC endpoint configured for network ${networkId}`);
  }
  return urls;
}
