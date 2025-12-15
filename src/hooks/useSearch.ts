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

      // Need networkId for non-ENS searches
      if (!networkId) return;

      // Check if it's a transaction hash (0x followed by 64 hex chars)
      if (/^0x[a-fA-F0-9]{64}$/.test(term)) {
        navigate(`/${networkId}/tx/${term}`);
        setSearchTerm("");
      }
      // Check if it's an address (0x followed by 40 hex chars)
      else if (/^0x[a-fA-F0-9]{40}$/.test(term)) {
        navigate(`/${networkId}/address/${term}`);
        setSearchTerm("");
      }
      // Check if it's a block number
      else if (/^\d+$/.test(term)) {
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
