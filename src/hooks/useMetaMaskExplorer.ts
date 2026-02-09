import { useCallback, useMemo } from "react";
import type { NetworkMetadata } from "../services/MetadataService";
import { extractChainIdFromNetworkId } from "../utils/networkResolver";

// Networks that cannot use wallet_addEthereumChain
// Chain ID 1 (Mainnet): MetaMask blocks this for security reasons
// Chain ID 31337 (Localhost): Local development networks don't need this
export const UNSUPPORTED_NETWORKS: number[] = [];

export interface SetExplorerResult {
  success: boolean;
  error?: string;
}

export interface UseMetaMaskExplorerReturn {
  isMetaMaskAvailable: boolean;
  isSupported: (networkId: number) => boolean;
  setAsDefaultExplorer: (network: NetworkMetadata, rpcUrls: string[]) => Promise<SetExplorerResult>;
}

/**
 * Get chainId from network metadata
 */
function getChainId(network: NetworkMetadata): number | undefined {
  return network.chainId ?? extractChainIdFromNetworkId(network.networkId);
}

/**
 * Build the chain parameters required by wallet_addEthereumChain (EIP-3085)
 */
function buildChainParams(network: NetworkMetadata, rpcUrls: string[], explorerUrl: string) {
  const chainId = getChainId(network);
  if (!chainId) throw new Error("Cannot build chain params without chainId");
  return {
    chainId: `0x${chainId.toString(16)}`,
    chainName: network.name,
    nativeCurrency: {
      name: network.currency,
      symbol: network.currency,
      decimals: 18,
    },
    rpcUrls: rpcUrls,
    blockExplorerUrls: [explorerUrl],
  };
}

/**
 * Hook for integrating with MetaMask to set OpenScan as the default block explorer
 *
 * Uses EIP-3085 wallet_addEthereumChain to configure the explorer URL in MetaMask.
 * When successful, MetaMask's "View on block explorer" links will open OpenScan.
 */
export function useMetaMaskExplorer(): UseMetaMaskExplorerReturn {
  // Check if MetaMask is available
  const isMetaMaskAvailable = useMemo(() => {
    return typeof window !== "undefined" && !!window.ethereum?.isMetaMask;
  }, []);

  // Check if a network is supported for wallet_addEthereumChain
  const isSupported = useCallback((networkId: number): boolean => {
    return !UNSUPPORTED_NETWORKS.includes(networkId);
  }, []);

  // Set OpenScan as the default explorer for a network in MetaMask
  const setAsDefaultExplorer = useCallback(
    async (network: NetworkMetadata, rpcUrls: string[]): Promise<SetExplorerResult> => {
      // Check if MetaMask is available
      if (!window.ethereum?.isMetaMask) {
        return { success: false, error: "MetaMask not detected" };
      }

      // Get chainId from network
      const chainId = getChainId(network);
      if (!chainId) {
        return { success: false, error: "Network does not have a valid chainId" };
      }

      // Check if network is supported
      if (!isSupported(chainId)) {
        return { success: false, error: "Network not supported for this operation" };
      }

      // Check if RPC URLs are configured
      if (!rpcUrls || rpcUrls.length === 0) {
        return { success: false, error: "No RPC URLs configured for this network" };
      }

      // Build the explorer URL using the OpenScan ENS domain
      const explorerUrl = `https://openscan.eth.link/#/${chainId}/`;

      // Build chain parameters
      const chainParams = buildChainParams(network, rpcUrls, explorerUrl);

      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [chainParams],
        });
        return { success: true };
      } catch (error) {
        // Handle specific error codes
        const err = error as { code?: number; message?: string };

        // User rejected the request
        if (err.code === 4001) {
          return { success: false, error: "Request rejected by user" };
        }

        // Other errors
        return {
          success: false,
          error: err.message || "Failed to configure MetaMask",
        };
      }
    },
    [isSupported],
  );

  return {
    isMetaMaskAvailable,
    isSupported,
    setAsDefaultExplorer,
  };
}
