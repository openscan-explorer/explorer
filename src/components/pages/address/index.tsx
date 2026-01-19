import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { AppContext } from "../../../context";
import { useDataService } from "../../../hooks/useDataService";
import { useENS } from "../../../hooks/useENS";
import { useProviderSelection } from "../../../hooks/useProviderSelection";
import { ENSService } from "../../../services/ENS/ENSService";
import type {
  Address as AddressData,
  AddressTransactionsResult,
  AddressType,
  DataWithMetadata,
  Transaction,
} from "../../../types";
import { fetchAddressWithType } from "../../../utils/addressTypeDetection";
import Loader from "../../common/Loader";
import {
  AccountDisplay,
  ContractDisplay,
  ERC20Display,
  ERC721Display,
  ERC1155Display,
} from "./displays";

// Transaction cache utilities
const TX_CACHE_PREFIX = "tx_cache_";
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

interface TxCache {
  transactions: Transaction[];
  timestamp: number;
  isComplete: boolean;
  oldestSearchedBlock: number; // Lowest block we've searched to (for Load More)
}

function getTxCacheKey(networkId: number, address: string): string {
  return `${TX_CACHE_PREFIX}${networkId}_${address.toLowerCase()}`;
}

function loadTxCache(networkId: number, address: string): TxCache | null {
  try {
    const key = getTxCacheKey(networkId, address);
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const data = JSON.parse(cached) as TxCache;
    if (Date.now() - data.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function saveTxCache(networkId: number, address: string, cache: TxCache): void {
  try {
    const key = getTxCacheKey(networkId, address);
    localStorage.setItem(key, JSON.stringify(cache));
  } catch {
    // localStorage might be full or disabled
  }
}

function clearTxCache(networkId: number, address: string): void {
  try {
    const key = getTxCacheKey(networkId, address);
    localStorage.removeItem(key);
  } catch {
    // Ignore errors
  }
}

function getNewestBlockFromTxs(transactions: Transaction[]): number {
  if (transactions.length === 0) return 0;
  return Math.max(
    ...transactions.map((tx) => (tx.blockNumber ? Number.parseInt(tx.blockNumber, 16) : 0)),
  );
}

function getOldestBlockFromTxs(transactions: Transaction[]): number {
  if (transactions.length === 0) return Number.MAX_SAFE_INTEGER;
  return Math.min(
    ...transactions.map((tx) =>
      tx.blockNumber ? Number.parseInt(tx.blockNumber, 16) : Number.MAX_SAFE_INTEGER,
    ),
  );
}

export default function Address() {
  const { networkId, address: addressParam } = useParams<{
    networkId?: string;
    address?: string;
  }>();
  const location = useLocation();
  const numericNetworkId = Number(networkId) || 1;
  const { rpcUrls } = useContext(AppContext);
  const [addressData, setAddressData] = useState<AddressData | null>(null);
  const [addressType, setAddressType] = useState<AddressType>("account");
  const [transactionsResult, setTransactionsResult] = useState<AddressTransactionsResult | null>(
    null,
  );
  const [transactionDetails, setTransactionDetails] = useState<Transaction[]>([]);
  const transactionHashSet = useRef(new Set<string>()); // Persistent set to track seen tx hashes
  const [loadingTxDetails] = useState(false); // No longer needed with streaming
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [searchLimit, setSearchLimit] = useState(100);
  const [searchingTxs, setSearchingTxs] = useState(false);
  const loadMoreFromBlockRef = useRef<number | undefined>(undefined); // Use ref to avoid triggering effect
  const searchToBlockRef = useRef<number | undefined>(undefined); // For "Search Recent" - stop at this block
  const [searchVersion, setSearchVersion] = useState(0); // Counter to force effect re-run
  const searchIdRef = useRef(0); // Counter to track active search and ignore stale callbacks
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cache-related state
  const [hasCachedData, setHasCachedData] = useState(false);
  const [oldestSearchedBlock, setOldestSearchedBlock] = useState(0); // Oldest block from cache (for Load More)

  // ENS resolution state
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [ensResolving, setEnsResolving] = useState(false);
  const [ensError, setEnsError] = useState<string | null>(null);

  // Detect if the URL parameter is an ENS name
  const isEnsName = useMemo(() => {
    return addressParam ? ENSService.isENSName(addressParam) : false;
  }, [addressParam]);

  // The actual address to use (resolved from ENS or direct from URL)
  const address = isEnsName ? resolvedAddress : addressParam;

  // Get ENS name from navigation state or from URL if it's an ENS name
  const initialEnsName =
    (location.state as { ensName?: string })?.ensName || (isEnsName ? addressParam : undefined);

  // Create dataService after we know the address
  const dataService = useDataService(numericNetworkId);

  // Provider selection state - store metadata from address data fetch
  const [addressDataResult, setAddressDataResult] = useState<DataWithMetadata<AddressData> | null>(
    null,
  );
  const [selectedProvider, setSelectedProvider] = useProviderSelection(
    `address_${numericNetworkId}_${address}`,
  );

  // Resolve ENS name to address
  useEffect(() => {
    if (!isEnsName || !addressParam) {
      setResolvedAddress(null);
      setEnsResolving(false);
      setEnsError(null);
      return;
    }

    const mainnetRpcUrls = rpcUrls[1];
    if (!mainnetRpcUrls || mainnetRpcUrls.length === 0) {
      setEnsError("No Ethereum mainnet RPC configured for ENS resolution");
      setEnsResolving(false);
      return;
    }

    setEnsResolving(true);
    setEnsError(null);

    const ensService = new ENSService(mainnetRpcUrls);
    ensService
      .resolve(addressParam)
      .then((resolved) => {
        if (resolved) {
          setResolvedAddress(resolved);
        } else {
          setEnsError(`Could not resolve ENS name: ${addressParam}`);
        }
      })
      .catch((err) => {
        setEnsError(`Error resolving ENS: ${err instanceof Error ? err.message : "Unknown error"}`);
      })
      .finally(() => {
        setEnsResolving(false);
      });
  }, [isEnsName, addressParam, rpcUrls]);

  // Use ENS hook to get reverse lookup and records
  const {
    ensName,
    reverseResult,
    records: ensRecords,
    decodedContenthash,
    loading: ensLoading,
    isMainnet,
  } = useENS(address ?? undefined, numericNetworkId, initialEnsName);

  // Fetch address data and detect type in a single flow
  useEffect(() => {
    if (!address || !dataService) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Use DataService to fetch address data with metadata support
    dataService.networkAdapter
      .getAddress(address)
      .then((result) => {
        // Store the full result with metadata
        setAddressDataResult(result);

        // Extract the address data
        const addressData = result.data;
        setAddressData(addressData);

        // Detect address type using the utility
        const rpcUrlsForChain = rpcUrls[numericNetworkId as keyof typeof rpcUrls];
        const rpcUrl = Array.isArray(rpcUrlsForChain) ? rpcUrlsForChain[0] : rpcUrlsForChain;

        if (rpcUrl) {
          fetchAddressWithType({
            addressHash: address,
            chainId: numericNetworkId,
            rpcUrl,
          })
            .then((typeResult) => {
              setAddressType(typeResult.addressType);
            })
            .catch(() => {
              // Fallback to account if type detection fails
              setAddressType("account");
            });
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch address data");
      })
      .finally(() => setLoading(false));
  }, [address, dataService, numericNetworkId, rpcUrls]);

  // Optimized streaming callback - uses ref to avoid O(n) Set recreation on each update
  // IMPORTANT: Hash set modification must happen OUTSIDE the functional updater
  // because React Strict Mode calls functional updaters twice, which would cause
  // the second call to see all transactions as duplicates
  const handleTransactionsFound = useCallback((newTxs: Transaction[]) => {
    console.log(
      "[handleTransactionsFound] Called with",
      newTxs.length,
      "txs, hashSet size:",
      transactionHashSet.current.size,
    );
    // Filter duplicates BEFORE the state update (outside functional updater)
    const uniqueNewTxs = newTxs.filter((tx) => {
      if (transactionHashSet.current.has(tx.hash)) return false;
      transactionHashSet.current.add(tx.hash);
      return true;
    });

    console.log("[handleTransactionsFound] After filter, unique:", uniqueNewTxs.length);
    if (uniqueNewTxs.length === 0) return;

    setTransactionDetails((prev) => {
      // Append new transactions
      const combined = [...prev, ...uniqueNewTxs];

      // Only sort if order might be wrong (check if newest new tx is newer than oldest prev)
      // Since search goes newest-first, new batches are typically older, so we need to sort
      if (prev.length > 0 && uniqueNewTxs.length > 0) {
        combined.sort((a, b) => {
          const blockA = Number.parseInt(a.blockNumber || "0", 16);
          const blockB = Number.parseInt(b.blockNumber || "0", 16);
          return blockB - blockA;
        });
      }

      console.log("[handleTransactionsFound] prev:", prev.length, "-> combined:", combined.length);
      return combined;
    });
  }, []);

  // Fetch transactions only when user triggers search - with streaming support and cancellation
  // Uses searchIdRef to track active search and prevent stale callbacks from a previous search
  // searchVersion > 0 ensures we only search when user explicitly triggers (not when loading from cache)
  // biome-ignore lint/correctness/useExhaustiveDependencies: searchVersion is intentionally used to force re-run on Load More
  useEffect(() => {
    console.log(
      "[TxSearch Effect] Running, searchTriggered:",
      searchTriggered,
      "searchVersion:",
      searchVersion,
      "address:",
      address?.slice(0, 10),
    );
    if (!dataService || !address || !searchTriggered || searchVersion === 0) {
      console.log("[TxSearch Effect] Early return - missing deps or not triggered");
      return;
    }

    // Increment search ID and capture it for this search instance
    searchIdRef.current += 1;
    const currentSearchId = searchIdRef.current;
    const toBlock = loadMoreFromBlockRef.current;
    const fromBlock = searchToBlockRef.current;
    const isLoadMore = toBlock !== undefined;
    const isSearchRecent = fromBlock !== undefined;
    console.log(
      "[TxSearch Effect] Starting search, searchId:",
      currentSearchId,
      "toBlock:",
      toBlock,
      "fromBlock:",
      fromBlock,
    );

    setSearchingTxs(true);
    setTransactionsResult(null);

    // Only clear transactions for fresh search, not for "load more" or "search recent"
    if (!isLoadMore && !isSearchRecent) {
      console.log("[TxSearch Effect] Clearing transactions for fresh search");
      setTransactionDetails([]);
      transactionHashSet.current.clear();
      setHasCachedData(false);
    }

    // Check if this search is still active (not superseded by a newer search)
    const isSearchActive = () => {
      const active = searchIdRef.current === currentSearchId;
      if (!active) {
        console.log(
          "[TxSearch] Search invalidated! current:",
          searchIdRef.current,
          "expected:",
          currentSearchId,
        );
      }
      return active;
    };

    // Wrap the callback to check if search is still active
    const wrappedCallback = (newTxs: Transaction[]) => {
      console.log(
        "[TxSearch Callback] Received",
        newTxs.length,
        "txs, isActive:",
        isSearchActive(),
      );
      if (!isSearchActive()) return;
      handleTransactionsFound(newTxs);
    };

    // Pass toBlock for "load more" and fromBlock for "search recent"
    dataService.networkAdapter
      .getAddressTransactions(address, fromBlock, toBlock, searchLimit, wrappedCallback)
      .then((result) => {
        if (!isSearchActive()) return;

        // Special handling for "Search Recent" when no new transactions found
        if (isSearchRecent && result.transactions.length === 0) {
          // Preserve existing cached data but show a warning
          setTransactionsResult((prev) => ({
            transactions: prev?.transactions || [],
            source: prev?.source || "binary_search",
            isComplete: prev?.isComplete || false, // Preserve original isComplete for Load More
            message: "No recent transactions found",
          }));
          return;
        }

        setTransactionsResult(result);
        // Transactions are already added via streaming callback, no need to set them again
        // Just ensure the hash set is populated for future "Load More" deduplication
        if (result.transactionDetails) {
          for (const tx of result.transactionDetails) {
            transactionHashSet.current.add(tx.hash);
          }
        }

        // Save to localStorage cache after successful search
        setTransactionDetails((currentTxs) => {
          if (currentTxs.length > 0 && address) {
            const oldestTxBlock = getOldestBlockFromTxs(currentTxs);
            // For "Search Recent", don't update isComplete - it only searched recent blocks
            // The full history isComplete status depends on searching older blocks
            const cacheIsComplete = isSearchRecent ? false : result.isComplete;
            // If search is complete, we searched to block 0
            // For load more, use minimum of current and cached
            // Otherwise use oldest tx block
            let oldestSearched: number;
            if (result.isComplete && !isSearchRecent) {
              oldestSearched = 0;
            } else if (isLoadMore) {
              oldestSearched = Math.min(oldestTxBlock, oldestSearchedBlock || oldestTxBlock);
            } else {
              oldestSearched = oldestTxBlock;
            }
            saveTxCache(numericNetworkId, address, {
              transactions: currentTxs,
              timestamp: Date.now(),
              isComplete: cacheIsComplete,
              oldestSearchedBlock: oldestSearched,
            });
            // Update cache state
            setOldestSearchedBlock(oldestSearched);
            setHasCachedData(true);
          }
          return currentTxs; // Don't modify, just read
        });
      })
      .catch((err) => {
        if (!isSearchActive()) return;
        setTransactionsResult({
          transactions: [],
          source: "none",
          isComplete: false,
          message: `Failed to fetch transaction history: ${err.message}`,
        });
      })
      .finally(() => {
        if (!isSearchActive()) return;
        setSearchingTxs(false);
        // Reset refs after search completes
        loadMoreFromBlockRef.current = undefined;
        searchToBlockRef.current = undefined;
      });
  }, [dataService, address, searchTriggered, searchLimit, searchVersion, handleTransactionsFound]);

  // Debug: Log when transactionDetails changes
  useEffect(() => {
    console.log("[DEBUG transactionDetails changed] length:", transactionDetails.length);
  }, [transactionDetails]);

  // Reset search state when address changes and load from cache if available
  useEffect(() => {
    console.log(
      "[Address Reset Effect] Resetting search state for address:",
      address?.slice(0, 10),
    );

    // Reset all state
    setSearchTriggered(false);
    setSearchLimit(100);
    loadMoreFromBlockRef.current = undefined;
    searchToBlockRef.current = undefined;
    setTransactionsResult(null);
    setTransactionDetails([]);
    transactionHashSet.current.clear();
    setHasCachedData(false);
    setOldestSearchedBlock(0);

    // Try to load from cache
    if (address) {
      const cache = loadTxCache(numericNetworkId, address);
      if (cache && cache.transactions.length > 0) {
        console.log("[Cache] Loaded", cache.transactions.length, "transactions from cache");
        setTransactionDetails(cache.transactions);
        setHasCachedData(true);
        setOldestSearchedBlock(cache.oldestSearchedBlock);
        // Populate hash set with cached transactions
        for (const tx of cache.transactions) {
          transactionHashSet.current.add(tx.hash);
        }
        // Set searchTriggered to show the table (but not searching)
        setSearchTriggered(true);
        // Create a result object to show status
        setTransactionsResult({
          transactions: cache.transactions.map((tx) => tx.hash),
          source: "binary_search",
          isComplete: cache.isComplete,
        });
      }
    }
  }, [address, numericNetworkId]);

  // Handler to start transaction search with specified limit
  const handleStartSearch = (limit: number) => {
    loadMoreFromBlockRef.current = undefined; // Fresh search
    setSearchLimit(limit);
    setSearchTriggered(true);
    setSearchVersion((v) => v + 1); // Force effect re-run
  };

  // Handler to cancel an in-progress search
  const handleCancelSearch = () => {
    setSearchTriggered(false);
    setSearchingTxs(false);
  };

  // Handler to load more transactions starting from the last displayed block
  const handleLoadMore = (limit: number) => {
    if (transactionDetails.length === 0) return;

    // Use cached oldest block if available, otherwise find from transactions
    let oldestBlockNum: number;
    if (oldestSearchedBlock > 0) {
      oldestBlockNum = oldestSearchedBlock;
    } else {
      const oldestTx = transactionDetails.reduce((oldest, tx) => {
        const blockNum = Number.parseInt(tx.blockNumber || "0", 16);
        const oldestBlockNum = Number.parseInt(oldest.blockNumber || "0", 16);
        return blockNum < oldestBlockNum ? tx : oldest;
      });
      oldestBlockNum = Number.parseInt(oldestTx.blockNumber || "0", 16);
    }

    loadMoreFromBlockRef.current = oldestBlockNum;
    searchToBlockRef.current = undefined; // Search down to block 0
    setSearchLimit(limit);
    setSearchTriggered(true);
    setSearchVersion((v) => v + 1); // Force effect re-run
  };

  // Handler to search for recent transactions (new txs since cache was saved)
  const handleSearchRecent = () => {
    if (transactionDetails.length === 0) return;

    // Find the newest (highest block number) transaction in cache
    const newestBlock = getNewestBlockFromTxs(transactionDetails);

    // Search from latest block down to the newest cached block + 1
    loadMoreFromBlockRef.current = undefined; // Start from latest
    searchToBlockRef.current = newestBlock + 1; // Stop before cached transactions
    setSearchLimit(0); // No limit for recent search
    setSearchTriggered(true);
    setSearchVersion((v) => v + 1); // Force effect re-run
  };

  // Handler to clear the transaction cache and reset the table
  const handleClearCache = () => {
    if (!address) return;
    clearTxCache(numericNetworkId, address);
    setTransactionDetails([]);
    setTransactionsResult(null);
    transactionHashSet.current.clear();
    setHasCachedData(false);
    setOldestSearchedBlock(0);
    setSearchTriggered(false);
    setSearchVersion(0);
  };

  // Show ENS resolving state (must come first before other checks)
  if (isEnsName && (ensResolving || (!resolvedAddress && !ensError))) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="block-display-header">
            <span className="block-label">ENS Name</span>
            <span className="tx-mono header-subtitle">{addressParam}</span>
          </div>
          <div className="card-content-loading">
            <Loader text={`Resolving ENS name: ${addressParam}...`} />
          </div>
        </div>
      </div>
    );
  }

  // Show ENS resolution error
  if (ensError) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="block-display-header">
            <span className="block-label">ENS Name</span>
            <span className="tx-mono header-subtitle">{addressParam}</span>
          </div>
          <div className="card-content">
            <p className="text-error margin-0">Error: {ensError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="block-display-header">
            <span className="block-label">Address</span>
            <span className="tx-mono header-subtitle">{address}</span>
          </div>
          <div className="card-content-loading">
            <Loader text="Loading address data..." />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="block-display-header">
            <span className="block-label">Address</span>
            <span className="tx-mono header-subtitle">{address}</span>
          </div>
          <div className="card-content">
            <p className="text-error margin-0">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="block-display-header">
            <span className="block-label">Address</span>
          </div>
          <div className="card-content">
            <p className="text-muted margin-0">No address provided</p>
          </div>
        </div>
      </div>
    );
  }

  if (!addressData) {
    return (
      <div className="container-wide">
        <p>Address data not found</p>
      </div>
    );
  }

  // Common props for all display components
  const displayProps = {
    address: addressData,
    addressHash: address,
    networkId: networkId || "1",
    transactionsResult,
    transactionDetails,
    loadingTxDetails,
    searchTriggered,
    searchingTxs,
    searchLimit,
    searchVersion,
    hasCachedData,
    oldestSearchedBlock: oldestSearchedBlock,
    onStartSearch: handleStartSearch,
    onCancelSearch: handleCancelSearch,
    onLoadMore: handleLoadMore,
    onSearchRecent: handleSearchRecent,
    onClearCache: handleClearCache,
    ensName,
    reverseResult,
    ensRecords,
    decodedContenthash,
    ensLoading,
    isMainnet,
    metadata: addressDataResult?.metadata,
    selectedProvider,
    onProviderSelect: setSelectedProvider,
  };

  // Render appropriate display component based on detected type
  return (
    <div className="container-wide">
      {addressType === "account" && <AccountDisplay {...displayProps} />}
      {addressType === "contract" && <ContractDisplay {...displayProps} />}
      {addressType === "erc20" && <ERC20Display {...displayProps} />}
      {addressType === "erc721" && <ERC721Display {...displayProps} />}
      {addressType === "erc1155" && <ERC1155Display {...displayProps} />}
    </div>
  );
}
