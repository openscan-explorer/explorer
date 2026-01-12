import { useCallback, useContext, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppContext } from "../context";
import { ENSService } from "../services/ENS/ENSService";

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
  const navigate = useNavigate();
  const location = useLocation();

  // Extract networkId from the pathname (e.g., /1/blocks -> 1)
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const networkId =
    pathSegments[0] && !Number.isNaN(Number(pathSegments[0])) ? pathSegments[0] : undefined;

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
      const isTransactionHash = /^0x[a-fA-F0-9]{64}$/.test(term);
      const isAddress = /^0x[a-fA-F0-9]{40}$/.test(term);
      const isBlockNumber = /^\d+$/.test(term);

      // If pattern doesn't match any valid type, show error immediately
      if (!isTransactionHash && !isAddress && !isBlockNumber) {
        setError(
          "Invalid search. Enter an address (0x...), transaction hash, block number, or ENS name.",
        );
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
