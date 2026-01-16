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
  const searchIdRef = useRef(0); // Counter to track active search and ignore stale callbacks
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    console.log("[handleTransactionsFound] Called with", newTxs.length, "txs, hashSet size:", transactionHashSet.current.size);
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
  useEffect(() => {
    console.log("[TxSearch Effect] Running, searchTriggered:", searchTriggered, "address:", address?.slice(0, 10));
    if (!dataService || !address || !searchTriggered) {
      console.log("[TxSearch Effect] Early return - missing deps or not triggered");
      return;
    }

    // Increment search ID and capture it for this search instance
    searchIdRef.current += 1;
    const currentSearchId = searchIdRef.current;
    console.log("[TxSearch Effect] Starting search, searchId:", currentSearchId);
    const toBlock = loadMoreFromBlockRef.current;
    const isLoadMore = toBlock !== undefined;

    setSearchingTxs(true);
    setTransactionsResult(null);

    // Only clear transactions and hash set for fresh search, not for "load more"
    if (!isLoadMore) {
      console.log("[TxSearch Effect] Clearing transactions for fresh search");
      setTransactionDetails([]);
      transactionHashSet.current.clear();
    }

    // Check if this search is still active (not superseded by a newer search)
    const isSearchActive = () => {
      const active = searchIdRef.current === currentSearchId;
      if (!active) {
        console.log("[TxSearch] Search invalidated! current:", searchIdRef.current, "expected:", currentSearchId);
      }
      return active;
    };

    // Wrap the callback to check if search is still active
    const wrappedCallback = (newTxs: Transaction[]) => {
      console.log("[TxSearch Callback] Received", newTxs.length, "txs, isActive:", isSearchActive());
      if (!isSearchActive()) return;
      handleTransactionsFound(newTxs);
    };

    // Pass toBlock for "load more" functionality
    dataService.networkAdapter
      .getAddressTransactions(address, undefined, toBlock, searchLimit, wrappedCallback)
      .then((result) => {
        if (!isSearchActive()) return;
        setTransactionsResult(result);
        // Transactions are already added via streaming callback, no need to set them again
        // Just ensure the hash set is populated for future "Load More" deduplication
        if (result.transactionDetails) {
          for (const tx of result.transactionDetails) {
            transactionHashSet.current.add(tx.hash);
          }
        }
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
        // NOTE: Don't reset searchTriggered here - it controls whether results are shown
        // Setting it to false would hide the transaction table and show the search prompt
        // Reset loadMoreFromBlock after search completes
        loadMoreFromBlockRef.current = undefined;
      });
  }, [dataService, address, searchTriggered, searchLimit, handleTransactionsFound]);

  // Debug: Log when transactionDetails changes
  useEffect(() => {
    console.log("[DEBUG transactionDetails changed] length:", transactionDetails.length);
  }, [transactionDetails]);

  // Reset search state when address changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset state when address changes
  useEffect(() => {
    console.log("[Address Reset Effect] Resetting search state for address:", address?.slice(0, 10));
    setSearchTriggered(false);
    setSearchLimit(100);
    loadMoreFromBlockRef.current = undefined;
    setTransactionsResult(null);
    setTransactionDetails([]);
    transactionHashSet.current.clear(); // Clear the hash set
  }, [address]);

  // Handler to start transaction search with specified limit
  const handleStartSearch = (limit: number) => {
    loadMoreFromBlockRef.current = undefined; // Fresh search
    setSearchLimit(limit);
    setSearchTriggered(true);
  };

  // Handler to cancel an in-progress search
  const handleCancelSearch = () => {
    setSearchTriggered(false);
    setSearchingTxs(false);
  };

  // Handler to load more transactions starting from the last displayed block
  const handleLoadMore = (limit: number) => {
    if (transactionDetails.length === 0) return;

    // Find the oldest (lowest block number) transaction
    const oldestTx = transactionDetails.reduce((oldest, tx) => {
      const blockNum = Number.parseInt(tx.blockNumber || "0", 16);
      const oldestBlockNum = Number.parseInt(oldest.blockNumber || "0", 16);
      return blockNum < oldestBlockNum ? tx : oldest;
    });

    const oldestBlockNum = Number.parseInt(oldestTx.blockNumber || "0", 16);
    loadMoreFromBlockRef.current = oldestBlockNum;
    setSearchLimit(limit);
    setSearchTriggered(true);
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
    onStartSearch: handleStartSearch,
    onCancelSearch: handleCancelSearch,
    onLoadMore: handleLoadMore,
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
