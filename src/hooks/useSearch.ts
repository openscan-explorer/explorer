import { useCallback, useContext, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppContext, useNetworks } from "../context";
import { ENSService } from "../services/ENS/ENSService";
import { resolveNetwork } from "../utils/networkResolver";

interface UseSearchResult {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isResolving: boolean;
  error: string | null;
  clearError: () => void;
  handleSearch: (e: React.FormEvent) => Promise<void>;
  networkId: string | undefined;
}

export function useSearch(): UseSearchResult {
  const [searchTerm, setSearchTerm] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { rpcUrls } = useContext(AppContext);
  const { networks } = useNetworks();
  const navigate = useNavigate();
  const location = useLocation();

  // Extract network slug from the pathname (e.g., /1/blocks -> "1", /btc/block/123 -> "btc")
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const networkSlug = pathSegments[0] || undefined;

  // Resolve network from slug (works for "1", "btc", etc.)
  const resolvedNetwork = useMemo(() => {
    if (!networkSlug) return undefined;
    return resolveNetwork(networkSlug, networks);
  }, [networkSlug, networks]);

  // Return the slug as networkId for backward compatibility
  const networkId = resolvedNetwork ? networkSlug : undefined;

  const mainnetRpcUrls = rpcUrls[1];

  // Memoize ENSService instance
  const ensService = useMemo(() => {
    if (!mainnetRpcUrls || mainnetRpcUrls.length === 0) {
      return null;
    }
    return new ENSService(mainnetRpcUrls);
  }, [mainnetRpcUrls]);

  const clearError = useCallback(() => setError(null), []);

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const term = searchTerm.trim();
      if (!term) return;

      setError(null);

      // Check if it's an ENS name
      if (ENSService.isENSName(term)) {
        setIsResolving(true);
        try {
          if (!ensService) {
            setError("No Ethereum mainnet RPC configured");
            return;
          }

          const resolvedAddress = await ensService.resolve(term);

          if (resolvedAddress) {
            const targetChainId = networkId || "1";
            navigate(`/${targetChainId}/address/${resolvedAddress}`, {
              state: { ensName: term },
            });
            setSearchTerm("");
          } else {
            setError(`Could not resolve ENS name: ${term}`);
          }
        } catch (err) {
          setError(`Error resolving ENS: ${err instanceof Error ? err.message : "Unknown error"}`);
        } finally {
          setIsResolving(false);
        }
        return;
      }

      // Determine what type of search this is
      const isEvmTransactionHash = /^0x[a-fA-F0-9]{64}$/.test(term);
      const isEvmAddress = /^0x[a-fA-F0-9]{40}$/.test(term);
      const isBitcoinTxid = /^[a-fA-F0-9]{64}$/.test(term);
      const isBitcoinAddress = /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/.test(term);
      const isBlockNumber = /^\d+$/.test(term);

      const isTransactionHash = isEvmTransactionHash || isBitcoinTxid;
      const isAddress = isEvmAddress || isBitcoinAddress;

      // If pattern doesn't match any valid type, show error immediately
      if (!isTransactionHash && !isAddress && !isBlockNumber) {
        setError("Invalid search. Enter an address, transaction hash, block number, or ENS name.");
        return;
      }

      // Valid pattern but need networkId to navigate
      if (!networkId) {
        setError("Please select a network first to search for this item.");
        return;
      }

      // Navigate to the appropriate page
      if (isTransactionHash) {
        navigate(`/${networkId}/tx/${term}`);
        setSearchTerm("");
      } else if (isAddress) {
        navigate(`/${networkId}/address/${term}`);
        setSearchTerm("");
      } else if (isBlockNumber) {
        navigate(`/${networkId}/block/${term}`);
        setSearchTerm("");
      }
    },
    [searchTerm, networkId, navigate, ensService],
  );

  return {
    searchTerm,
    setSearchTerm,
    isResolving,
    error,
    clearError,
    handleSearch,
    networkId,
  };
}
