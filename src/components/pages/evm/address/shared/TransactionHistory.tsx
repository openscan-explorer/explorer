import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toFunctionSelector } from "viem";
import { useDataService } from "../../../../../hooks/useDataService";
import type {
  ABI,
  AddressTransactionsResult,
  FunctionABI,
  Transaction,
} from "../../../../../types";

// Transaction cache utilities
const TX_CACHE_PREFIX = "tx_cache_";
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

interface TxCache {
  transactions: Transaction[];
  timestamp: number;
  isComplete: boolean;
  oldestSearchedBlock: number;
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

interface TransactionHistoryProps {
  networkId: string;
  addressHash: string;
  contractAbi?: ABI[];
  txCount?: number; // Nonce (outgoing tx count) - used as minimum estimate for progress
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  networkId,
  addressHash,
  contractAbi,
  txCount = 0,
}) => {
  const numericNetworkId = Number(networkId) || 1;
  const dataService = useDataService(numericNetworkId);

  // Transaction state
  const [transactionsResult, setTransactionsResult] = useState<AddressTransactionsResult | null>(
    null,
  );
  const [transactionDetails, setTransactionDetails] = useState<Transaction[]>([]);
  const transactionHashSet = useRef(new Set<string>());

  // Search state
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [searchLimit, setSearchLimit] = useState(100);
  const [searchingTxs, setSearchingTxs] = useState(false);
  const [searchVersion, setSearchVersion] = useState(0);
  const loadMoreFromBlockRef = useRef<number | undefined>(undefined);
  const searchToBlockRef = useRef<number | undefined>(undefined);
  const searchIdRef = useRef(0);
  const isAutoSearchRef = useRef(false);
  const [autoSearchPending, setAutoSearchPending] = useState(true);

  // Cache state
  const [hasCachedData, setHasCachedData] = useState(false);
  const [oldestSearchedBlock, setOldestSearchedBlock] = useState(0);

  // UI state
  const [selectedLimit, setSelectedLimit] = useState<number>(10);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [loadMoreDropdownOpen, setLoadMoreDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const loadMoreDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    if (!dropdownOpen && !loadMoreDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (
        loadMoreDropdownRef.current &&
        !loadMoreDropdownRef.current.contains(event.target as Node)
      ) {
        setLoadMoreDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen, loadMoreDropdownOpen]);

  // Optimized streaming callback
  const handleTransactionsFound = useCallback((newTxs: Transaction[]) => {
    const uniqueNewTxs = newTxs.filter((tx) => {
      if (transactionHashSet.current.has(tx.hash)) return false;
      transactionHashSet.current.add(tx.hash);
      return true;
    });

    if (uniqueNewTxs.length === 0) return;

    setTransactionDetails((prev) => {
      const combined = [...prev, ...uniqueNewTxs];
      if (prev.length > 0 && uniqueNewTxs.length > 0) {
        combined.sort((a, b) => {
          const blockA = Number.parseInt(a.blockNumber || "0", 16);
          const blockB = Number.parseInt(b.blockNumber || "0", 16);
          return blockB - blockA;
        });
      }
      return combined;
    });
  }, []);

  // Reset state and load cache when address changes
  useEffect(() => {
    setSearchTriggered(false);
    setSearchLimit(100);
    loadMoreFromBlockRef.current = undefined;
    searchToBlockRef.current = undefined;
    setTransactionsResult(null);
    setTransactionDetails([]);
    transactionHashSet.current.clear();
    setHasCachedData(false);
    setOldestSearchedBlock(0);
    setSearchVersion(0);
    setAutoSearchPending(true);

    // Try to load from cache
    const cache = loadTxCache(numericNetworkId, addressHash);
    if (cache && cache.transactions.length > 0) {
      setTransactionDetails(cache.transactions);
      setHasCachedData(true);
      setAutoSearchPending(false);
      setOldestSearchedBlock(cache.oldestSearchedBlock);
      for (const tx of cache.transactions) {
        transactionHashSet.current.add(tx.hash);
      }
      setSearchTriggered(true);
      setTransactionsResult({
        transactions: cache.transactions.map((tx) => tx.hash),
        source: "binary_search",
        isComplete: cache.isComplete,
      });
    }
  }, [addressHash, numericNetworkId]);

  // Auto-search: on mount with no cache, find recent activity range then search
  // Phase 1: Exponential search from chain tip to find most recent activity range
  // Phase 2: Run binary search tree within the narrowed range
  useEffect(() => {
    if (!dataService || !addressHash || hasCachedData || searchTriggered) return;

    const abortController = new AbortController();

    dataService.networkAdapter
      .findRecentActivityRange(addressHash, undefined, abortController.signal)
      .then((range) => {
        if (abortController.signal.aborted) return;

        if (range) {
          searchToBlockRef.current = range.fromBlock;
        } else {
          searchToBlockRef.current = undefined;
        }

        loadMoreFromBlockRef.current = undefined;
        isAutoSearchRef.current = true;
        setAutoSearchPending(false);
        setSearchLimit(5);
        setSearchTriggered(true);
        setSearchVersion((v) => v + 1);
      });

    return () => {
      abortController.abort();
    };
  }, [dataService, addressHash, hasCachedData, searchTriggered]);

  // Transaction search effect
  // biome-ignore lint/correctness/useExhaustiveDependencies: oldestSearchedBlock intentionally excluded - effect should not re-run when it changes (causes table clear bug)
  useEffect(() => {
    if (!dataService || !addressHash || !searchTriggered || searchVersion === 0) {
      return;
    }

    const abortController = new AbortController();
    searchIdRef.current += 1;
    const currentSearchId = searchIdRef.current;
    const toBlock = loadMoreFromBlockRef.current;
    const fromBlock = searchToBlockRef.current;
    const isLoadMore = toBlock !== undefined;
    const isSearchRecent = fromBlock !== undefined;

    setSearchingTxs(true);
    setTransactionsResult(null);

    if (!isLoadMore && !isSearchRecent) {
      setTransactionDetails([]);
      transactionHashSet.current.clear();
      setHasCachedData(false);
    }

    const isSearchActive = () =>
      searchIdRef.current === currentSearchId && !abortController.signal.aborted;

    const wrappedCallback = (newTxs: Transaction[]) => {
      if (!isSearchActive()) return;
      handleTransactionsFound(newTxs);
    };

    dataService.networkAdapter
      .getAddressTransactions(
        addressHash,
        fromBlock,
        toBlock,
        searchLimit,
        wrappedCallback,
        abortController.signal,
      )
      .then((rawResult) => {
        if (!isSearchActive()) return;

        if (isSearchRecent && rawResult.transactions.length === 0) {
          setTransactionsResult((prev) => ({
            transactions: prev?.transactions || [],
            source: prev?.source || "binary_search",
            isComplete: prev?.isComplete || false,
            message: "No recent transactions found",
          }));
          return;
        }

        // For auto-search: force isComplete to false (we only searched 1/4 of chain)
        const isAutoSearch = isAutoSearchRef.current;
        if (isAutoSearch) {
          isAutoSearchRef.current = false;
        }
        const result = isAutoSearch ? { ...rawResult, isComplete: false } : rawResult;

        setTransactionsResult(result);

        if (result.transactionDetails) {
          for (const tx of result.transactionDetails) {
            transactionHashSet.current.add(tx.hash);
          }
        }

        // Save to cache
        setTransactionDetails((currentTxs) => {
          if (currentTxs.length > 0) {
            const oldestTxBlock = getOldestBlockFromTxs(currentTxs);
            const cacheIsComplete = isSearchRecent || isAutoSearch ? false : result.isComplete;
            let oldestSearched: number;
            if (result.isComplete && !isSearchRecent) {
              oldestSearched = 0;
            } else if (isLoadMore) {
              oldestSearched = Math.min(oldestTxBlock, oldestSearchedBlock || oldestTxBlock);
            } else {
              oldestSearched = oldestTxBlock;
            }
            saveTxCache(numericNetworkId, addressHash, {
              transactions: currentTxs,
              timestamp: Date.now(),
              isComplete: cacheIsComplete,
              oldestSearchedBlock: oldestSearched,
            });
            setOldestSearchedBlock(oldestSearched);
            setHasCachedData(true);
          }
          return currentTxs;
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
        loadMoreFromBlockRef.current = undefined;
        searchToBlockRef.current = undefined;
      });

    return () => {
      abortController.abort();
    };
  }, [
    dataService,
    addressHash,
    searchTriggered,
    searchLimit,
    searchVersion,
    handleTransactionsFound,
    numericNetworkId,
  ]);

  // Handlers
  const handleStartSearch = (limit: number) => {
    loadMoreFromBlockRef.current = undefined;
    setSearchLimit(limit);
    setSearchTriggered(true);
    setSearchVersion((v) => v + 1);
  };

  const handleCancelSearch = () => {
    setSearchTriggered(false);
    setSearchingTxs(false);
  };

  const handleLoadMore = (limit: number) => {
    if (transactionDetails.length === 0) return;

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
    searchToBlockRef.current = undefined;
    setSearchLimit(limit);
    setSearchTriggered(true);
    setSearchVersion((v) => v + 1);
  };

  const handleSearchRecent = () => {
    if (transactionDetails.length === 0) return;

    const newestBlock = getNewestBlockFromTxs(transactionDetails);
    loadMoreFromBlockRef.current = undefined;
    searchToBlockRef.current = newestBlock + 1;
    setSearchLimit(0);
    setSearchTriggered(true);
    setSearchVersion((v) => v + 1);
  };

  const handleClearCache = () => {
    clearTxCache(numericNetworkId, addressHash);
    setTransactionDetails([]);
    setTransactionsResult(null);
    transactionHashSet.current.clear();
    setHasCachedData(false);
    setOldestSearchedBlock(0);
    setSearchTriggered(false);
    setSearchVersion(0);
  };

  // Utility functions
  const truncate = useCallback((str: string, start = 6, end = 4) => {
    if (!str) return "";
    if (str.length <= start + end) return str;
    return `${str.slice(0, start)}...${str.slice(-end)}`;
  }, []);

  const formatValue = useCallback((value: string) => {
    try {
      const eth = Number(value) / 1e18;
      return `${eth.toFixed(6)} ETH`;
    } catch {
      return "0 ETH";
    }
  }, []);

  const decodeFunctionName = useCallback(
    (data: string | undefined): string | null => {
      if (!data || data === "0x" || data.length < 10) return null;
      if (!contractAbi) return null;

      const selector = data.slice(0, 10).toLowerCase();

      for (const item of contractAbi) {
        const abiItem = item as FunctionABI;
        if (abiItem.type !== "function") continue;

        const inputs = abiItem.inputs || [];
        const signature = `${abiItem.name}(${inputs.map((i) => i.type).join(",")})`;

        try {
          const computedSelector = toFunctionSelector(signature).toLowerCase();
          if (computedSelector === selector) {
            return abiItem.name;
          }
        } catch {
          // Continue
        }
      }

      return null;
    },
    [contractAbi],
  );

  const hasContractAbi = useMemo(() => contractAbi && contractAbi.length > 0, [contractAbi]);

  const blockRange = useMemo(() => {
    if (transactionDetails.length === 0) return null;
    let newest = 0;
    for (const tx of transactionDetails) {
      const blockNum = tx.blockNumber ? parseInt(tx.blockNumber, 16) : 0;
      if (blockNum > newest) newest = blockNum;
    }
    if (newest === 0) return null;
    const hasSearchedRange = hasCachedData || searchVersion > 0;
    const oldest = hasSearchedRange
      ? oldestSearchedBlock
      : transactionDetails.reduce((min, tx) => {
          const blockNum = tx.blockNumber ? parseInt(tx.blockNumber, 16) : 0;
          return blockNum > 0 && blockNum < min ? blockNum : min;
        }, Number.MAX_SAFE_INTEGER);
    if (oldest === Number.MAX_SAFE_INTEGER) return null;
    return { oldest, newest };
  }, [transactionDetails, oldestSearchedBlock, hasCachedData, searchVersion]);

  // Render transaction table
  const renderTransactionTable = (transactions: Transaction[]) => (
    <div className="address-table-container">
      <table className="recent-transactions-table">
        <thead>
          <tr>
            <th>TX Hash</th>
            <th>Block</th>
            {hasContractAbi && <th>Method</th>}
            <th>From</th>
            <th>To</th>
            <th>Value</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.hash}>
              <td>
                <Link to={`/${networkId}/tx/${tx.hash}`} className="address-table-link">
                  {truncate(tx.hash, 8, 6)}
                </Link>
              </td>
              <td>
                <Link
                  to={`/${networkId}/block/${tx.blockNumber ? parseInt(tx.blockNumber, 16) : 0}`}
                  className="address-table-link"
                >
                  {tx.blockNumber ? parseInt(tx.blockNumber, 16).toLocaleString() : "Pending"}
                </Link>
              </td>
              {hasContractAbi && (
                <td>
                  {tx.to?.toLowerCase() === addressHash.toLowerCase() ? (
                    (() => {
                      const funcName = decodeFunctionName(tx.data);
                      const selector = tx.data?.slice(0, 10);
                      return funcName ? (
                        <span className="method-badge method-badge-decoded">{funcName}</span>
                      ) : selector && selector !== "0x" ? (
                        <span className="method-badge method-badge-selector" title={selector}>
                          {selector}
                        </span>
                      ) : (
                        <span className="method-badge method-badge-transfer">Transfer</span>
                      );
                    })()
                  ) : !tx.data || tx.data === "0x" ? (
                    <span className="method-badge method-badge-transfer">Transfer</span>
                  ) : (
                    <span
                      className="method-badge method-badge-selector"
                      title={tx.data?.slice(0, 10)}
                    >
                      {tx.data?.slice(0, 10)}
                    </span>
                  )}
                </td>
              )}
              <td>
                <Link to={`/${networkId}/address/${tx.from}`} className="address-table-link">
                  {tx.from?.toLowerCase() === addressHash.toLowerCase()
                    ? "This Address"
                    : truncate(tx.from || "", 6, 4)}
                </Link>
              </td>
              <td>
                {tx.to ? (
                  <Link
                    to={`/${networkId}/address/${tx.to}`}
                    className={`tx-table-to-link ${tx.to?.toLowerCase() === addressHash.toLowerCase() ? "tx-table-to-link-self" : "tx-table-to-link-other"}`}
                  >
                    {tx.to?.toLowerCase() === addressHash.toLowerCase()
                      ? "This Address"
                      : truncate(tx.to, 6, 4)}
                  </Link>
                ) : (
                  <span className="contract-creation-badge">Contract Creation</span>
                )}
              </td>
              <td>
                <span className="address-table-value">{formatValue(tx.value)}</span>
              </td>
              <td>
                {tx.receipt?.status === "0x1" || tx.receipt?.status === "1" ? (
                  <span className="table-status-badge table-status-success">✓ Success</span>
                ) : tx.receipt?.status === "0x0" || tx.receipt?.status === "0" ? (
                  <span className="table-status-badge table-status-failed">✗ Failed</span>
                ) : (
                  <span className="table-status-badge table-status-pending">⏳ Pending</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Show loading state while auto-search is initializing (finding recent activity range)
  if (!searchTriggered && autoSearchPending) {
    return (
      <div className="tx-details">
        <div className="tx-section tx-history-header">
          <span className="tx-section-title">Transaction History</span>
          <span className="tx-history-status tx-history-status-searching">
            <div className="tx-history-searching-spinner-inline" />
            Searching...
          </span>
        </div>
        <div className="tx-history-searching">
          <div className="tx-history-searching-spinner" />
          <p>Searching for recent transactions...</p>
        </div>
      </div>
    );
  }

  // Show search button if search hasn't been triggered (auto-search didn't apply, e.g. cache loaded)
  if (!searchTriggered) {
    return (
      <div className="tx-details">
        <div className="tx-section tx-history-header">
          <span className="tx-section-title">Transaction History</span>
        </div>
        <div className="tx-history-search-prompt">
          <p className="tx-history-search-description">
            Search for transactions by scanning the blockchain for state changes.
          </p>
          <div className="tx-history-search-controls">
            <div className="tx-history-button-group" ref={dropdownRef}>
              <button
                type="button"
                className="tx-history-search-btn"
                onClick={() => handleStartSearch(selectedLimit)}
              >
                Search Transactions
              </button>
              <button
                type="button"
                className="tx-history-dropdown-toggle"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span className="tx-history-dropdown-count">
                  {selectedLimit === 0 ? "All txs" : `Last ${selectedLimit} txs`}
                </span>
                <span className="tx-history-dropdown-arrow">▼</span>
              </button>
              {dropdownOpen && (
                <div className="tx-history-dropdown-menu">
                  <button
                    type="button"
                    className="tx-history-dropdown-item"
                    onClick={() => {
                      setSelectedLimit(5);
                      setDropdownOpen(false);
                    }}
                  >
                    Last 5 transactions
                  </button>
                  <button
                    type="button"
                    className="tx-history-dropdown-item"
                    onClick={() => {
                      setSelectedLimit(10);
                      setDropdownOpen(false);
                    }}
                  >
                    Last 10 transactions
                  </button>
                  <button
                    type="button"
                    className="tx-history-dropdown-item"
                    onClick={() => {
                      setSelectedLimit(50);
                      setDropdownOpen(false);
                    }}
                  >
                    Last 50 transactions
                  </button>
                  <button
                    type="button"
                    className="tx-history-dropdown-item"
                    onClick={() => {
                      setSelectedLimit(0);
                      setDropdownOpen(false);
                    }}
                  >
                    All transactions
                  </button>
                </div>
              )}
            </div>
          </div>
          <p className="tx-history-search-note">
            Note: Searching all transactions may take longer for active addresses.
          </p>
        </div>
      </div>
    );
  }

  // Show searching state with live transaction table
  if (searchingTxs) {
    const foundCount = transactionDetails.length;
    const targetEstimate = searchLimit > 0 ? searchLimit : Math.max(txCount, 1);
    const rawProgress = targetEstimate > 0 ? (foundCount / targetEstimate) * 100 : 0;
    const progressPercent = Math.min(rawProgress, 95);
    const isIndeterminate = foundCount === 0;

    return (
      <div className="tx-details">
        <div className="tx-section tx-history-header">
          <span className="tx-section-title">Transaction History</span>
          <span className="tx-history-status tx-history-status-searching">
            <div className="tx-history-searching-spinner-inline" />
            Searching...
          </span>
        </div>

        <div className="tx-search-progress">
          <div className="tx-search-progress-bar">
            <div
              className={`tx-search-progress-fill ${isIndeterminate ? "tx-search-progress-indeterminate" : ""}`}
              style={{ width: isIndeterminate ? "30%" : `${progressPercent}%` }}
            />
          </div>
          <div className="tx-search-progress-info">
            <span className="tx-search-progress-text">
              {foundCount === 0
                ? "Searching for transactions..."
                : `Found ${foundCount} transaction${foundCount === 1 ? "" : "s"}...`}
            </span>
            <button type="button" className="tx-history-cancel-btn" onClick={handleCancelSearch}>
              Cancel
            </button>
          </div>
        </div>

        {transactionDetails.length > 0 && renderTransactionTable(transactionDetails)}

        {transactionDetails.length === 0 && (
          <div className="tx-history-searching">
            <div className="tx-history-searching-spinner" />
            <p>Searching for transactions...</p>
            <p className="tx-history-searching-note">
              Binary searching through blockchain state to find address activity
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="tx-details">
      <div className="tx-section tx-history-header">
        <span className="tx-section-title">Transaction History</span>
        {transactionsResult && (
          <span
            className={`tx-history-status ${transactionsResult.source === "trace_filter" ? "tx-history-status-complete" : transactionsResult.source === "binary_search" || transactionsResult.source === "logs" ? "tx-history-status-partial" : "tx-history-status-none"}`}
          >
            {transactionsResult.source === "trace_filter" && (
              <>
                <span className="tx-history-dot">●</span>
                Complete history ({transactionDetails.length} transactions)
              </>
            )}
            {(transactionsResult.source === "binary_search" ||
              transactionsResult.source === "logs") && (
              <>
                <span className="tx-history-dot">●</span>
                Found {transactionDetails.length} transactions
              </>
            )}
            {transactionsResult.source === "none" && (
              <>
                <span className="tx-history-dot">●</span>
                No data available
              </>
            )}
          </span>
        )}
      </div>

      {/* Completed progress bar - only show after a search has been executed */}
      {searchVersion > 0 && transactionsResult && transactionDetails.length > 0 && (
        <div className="tx-search-progress">
          <div className="tx-search-progress-bar">
            <div
              className="tx-search-progress-fill tx-search-progress-complete"
              style={{ width: "100%" }}
            />
          </div>
          <div className="tx-search-progress-info">
            <span className="tx-search-progress-text">
              {transactionsResult.isComplete
                ? `Found all ${transactionDetails.length} transaction${transactionDetails.length === 1 ? "" : "s"}`
                : `Found ${transactionDetails.length} transaction${transactionDetails.length === 1 ? "" : "s"}`}
            </span>
          </div>
        </div>
      )}

      {/* Block range info - always show when there are transactions */}
      {transactionDetails.length > 0 && blockRange && (
        <div className="tx-search-progress-info">
          <span className="tx-search-progress-text">
            Showing {transactionDetails.length} transaction
            {transactionDetails.length === 1 ? "" : "s"} from blocks{" "}
            {blockRange.oldest.toLocaleString()} to {blockRange.newest.toLocaleString()}
          </span>
        </div>
      )}

      {/* Warning message for partial data */}
      {transactionsResult?.message && (
        <div
          className={`tx-history-message ${transactionsResult.source === "none" ? "tx-history-message-error" : "tx-history-message-warning"}`}
        >
          <span className="tx-history-message-icon">
            {transactionsResult.source === "none" ? "Warning" : "Info"}
          </span>
          {transactionsResult.message}
        </div>
      )}

      {/* Search Recent button - always shown when we have cached data */}
      {hasCachedData && (
        <div className="tx-history-search-recent">
          <button
            type="button"
            className="tx-history-search-recent-btn"
            onClick={handleSearchRecent}
          >
            Search Recent Transactions
          </button>
        </div>
      )}

      {/* Transaction table */}
      {transactionDetails.length > 0 && renderTransactionTable(transactionDetails)}

      {/* Load More button with dropdown - hide when search is complete */}
      {transactionDetails.length > 0 && !transactionsResult?.isComplete && (
        <div className="tx-history-load-more">
          <div className="tx-history-button-group" ref={loadMoreDropdownRef}>
            <button
              type="button"
              className="tx-history-load-more-btn"
              onClick={() => handleLoadMore(selectedLimit)}
            >
              Load More
            </button>
            <button
              type="button"
              className="tx-history-dropdown-toggle tx-history-load-more-toggle"
              onClick={() => setLoadMoreDropdownOpen(!loadMoreDropdownOpen)}
            >
              <span className="tx-history-dropdown-count">
                {selectedLimit === 0 ? "All txs" : `${selectedLimit} txs`}
              </span>
              <span className="tx-history-dropdown-arrow">▼</span>
            </button>
            {loadMoreDropdownOpen && (
              <div className="tx-history-dropdown-menu">
                <button
                  type="button"
                  className="tx-history-dropdown-item"
                  onClick={() => {
                    setSelectedLimit(5);
                    setLoadMoreDropdownOpen(false);
                  }}
                >
                  5 more transactions
                </button>
                <button
                  type="button"
                  className="tx-history-dropdown-item"
                  onClick={() => {
                    setSelectedLimit(10);
                    setLoadMoreDropdownOpen(false);
                  }}
                >
                  10 more transactions
                </button>
                <button
                  type="button"
                  className="tx-history-dropdown-item"
                  onClick={() => {
                    setSelectedLimit(50);
                    setLoadMoreDropdownOpen(false);
                  }}
                >
                  50 more transactions
                </button>
                <button
                  type="button"
                  className="tx-history-dropdown-item"
                  onClick={() => {
                    setSelectedLimit(0);
                    setLoadMoreDropdownOpen(false);
                  }}
                >
                  All remaining transactions
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clear cache link */}
      {transactionDetails.length > 0 && (
        <div className="tx-history-clear-cache">
          <button type="button" className="tx-history-clear-cache-btn" onClick={handleClearCache}>
            Clear tx cache
          </button>
        </div>
      )}

      {/* Empty state - with full search option when auto-search found nothing */}
      {transactionDetails.length === 0 && transactionsResult && !transactionsResult?.message && (
        <div className="tx-history-empty">
          <p>No recent transactions found</p>
          <button
            type="button"
            className="tx-history-search-btn"
            onClick={() => {
              searchToBlockRef.current = undefined;
              loadMoreFromBlockRef.current = undefined;
              setSearchLimit(selectedLimit);
              setSearchTriggered(true);
              setSearchVersion((v) => v + 1);
            }}
          >
            Search Full History
          </button>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
