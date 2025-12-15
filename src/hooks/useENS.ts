// src/hooks/useENS.ts
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "../context";
import { ENSService } from "../services/ENS/ENSService";
import type { DecodedContenthash, ENSRecords, ENSReverseResult } from "../types";

interface UseENSResult {
  ensName: string | null;
  reverseResult: ENSReverseResult | null;
  records: ENSRecords | null;
  decodedContenthash: DecodedContenthash | null;
  loading: boolean;
  error: string | null;
  isMainnet: boolean;
  refetch: () => void;
}

/**
 * Hook to fetch ENS data for an address
 * @param address - The Ethereum address to look up
 * @param chainId - The current chain ID (ENS only works on mainnet)
 * @param initialEnsName - Optional ENS name if already known (e.g., from navigation state)
 */
export function useENS(
  address: string | undefined,
  chainId: number,
  initialEnsName?: string,
): UseENSResult {
  const { rpcUrls } = useContext(AppContext);
  const [ensName, setEnsName] = useState<string | null>(initialEnsName || null);
  const [reverseResult, setReverseResult] = useState<ENSReverseResult | null>(null);
  const [records, setRecords] = useState<ENSRecords | null>(null);
  const [decodedContenthash, setDecodedContenthash] = useState<DecodedContenthash | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_fetchTrigger, setFetchTrigger] = useState(0);

  // Check if we're on mainnet (ENS only works on Ethereum mainnet)
  const isMainnet = chainId === 1;

  // Always use mainnet RPC for ENS resolution
  const mainnetRpcUrls = rpcUrls[1];

  // Memoize ENSService instance to avoid recreating on every render
  const ensService = useMemo(() => {
    if (!mainnetRpcUrls || mainnetRpcUrls.length === 0) {
      return null;
    }
    return new ENSService(mainnetRpcUrls);
  }, [mainnetRpcUrls]);

  const refetch = useCallback(() => {
    setFetchTrigger((prev) => prev + 1);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: _fetchTrigger is intentionally included to enable refetch()
  useEffect(() => {
    if (!address) {
      setEnsName(null);
      setReverseResult(null);
      setRecords(null);
      setDecodedContenthash(null);
      return;
    }

    if (!ensService) {
      setError("No Ethereum mainnet RPC configured for ENS resolution");
      return;
    }

    const fetchENSData = async () => {
      setLoading(true);
      setError(null);

      try {
        // If we have an initial ENS name, use it
        // Otherwise, do a reverse lookup
        let name: string | null = initialEnsName || null;

        if (!name) {
          // Reverse resolve: address -> ENS name
          const reverse = await ensService.reverseResolve(address);
          setReverseResult(reverse);
          name = reverse.ensName;
        } else {
          // If we have the name, verify it with forward resolution
          const resolvedAddr = await ensService.resolve(name);
          const verified = resolvedAddr?.toLowerCase() === address.toLowerCase();
          setReverseResult({ ensName: name, verified });
        }

        setEnsName(name);

        // If we found an ENS name, fetch the full records
        if (name) {
          const ensRecords = await ensService.getRecords(name);
          setRecords(ensRecords);

          // Decode contenthash if present
          if (ensRecords.contenthash) {
            const decoded = ensService.decodeContenthash(ensRecords.contenthash);
            setDecodedContenthash(decoded);
          }
        }
      } catch (err) {
        console.error("Error fetching ENS data:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchENSData();
  }, [address, ensService, initialEnsName, _fetchTrigger]);

  return {
    ensName,
    reverseResult,
    records,
    decodedContenthash,
    loading,
    error,
    isMainnet,
    refetch,
  };
}

/**
 * Hook to resolve an ENS name to an address
 * @param ensName - The ENS name to resolve
 */
export function useENSResolve(ensName: string | undefined): {
  address: string | null;
  loading: boolean;
  error: string | null;
} {
  const { rpcUrls } = useContext(AppContext);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mainnetRpcUrls = rpcUrls[1];

  // Memoize ENSService instance
  const ensService = useMemo(() => {
    if (!mainnetRpcUrls || mainnetRpcUrls.length === 0) {
      return null;
    }
    return new ENSService(mainnetRpcUrls);
  }, [mainnetRpcUrls]);

  useEffect(() => {
    if (!ensName || !ENSService.isENSName(ensName)) {
      setAddress(null);
      return;
    }

    if (!ensService) {
      setError("No Ethereum mainnet RPC configured");
      return;
    }

    const fetchAddress = async () => {
      setLoading(true);
      setError(null);

      try {
        const resolved = await ensService.resolve(ensName);
        setAddress(resolved);

        if (!resolved) {
          setError(`Could not resolve ENS name: ${ensName}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchAddress();
  }, [ensName, ensService]);

  return { address, loading, error };
}

export default useENS;
