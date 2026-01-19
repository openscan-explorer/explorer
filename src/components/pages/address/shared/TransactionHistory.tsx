import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toFunctionSelector } from "viem";
import type { ABI, AddressTransactionsResult, FunctionABI, Transaction } from "../../../../types";

interface TransactionHistoryProps {
  networkId: string;
  addressHash: string;
  transactionsResult?: AddressTransactionsResult | null;
  transactionDetails: Transaction[];
  loadingTxDetails: boolean;
  contractAbi?: ABI[];
  searchTriggered: boolean;
  searchingTxs: boolean;
  searchLimit?: number; // Selected search limit (5, 10, 50, or 0 for all)
  onStartSearch: (limit: number) => void;
  onCancelSearch?: () => void; // Cancel an in-progress search
  onLoadMore?: (limit: number) => void; // Load more transactions with specified limit
  txCount?: number; // Nonce (outgoing tx count) - used as minimum estimate for progress
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  networkId,
  addressHash,
  transactionsResult,
  transactionDetails,
  loadingTxDetails,
  contractAbi,
  searchTriggered,
  searchingTxs,
  searchLimit = 100,
  onStartSearch,
  onCancelSearch,
  onLoadMore,
  txCount = 0,
}) => {
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

  // Decode function name from calldata using ABI
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

  // Render transaction table - extracted to avoid duplication
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
                {tx.receipt?.status === "0x1" ? (
                  <span className="table-status-badge table-status-success">✓ Success</span>
                ) : tx.receipt?.status === "0x0" ? (
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

  // Show search button if search hasn't been triggered
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
                onClick={() => onStartSearch(selectedLimit)}
              >
                🔍 Search Transactions
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
  // (transactions populate as they are found)
  if (searchingTxs) {
    const foundCount = transactionDetails.length;
    // Use txCount (nonce) as minimum estimate - actual total may be higher due to incoming txs
    // If searching for a limit, use that as target; otherwise use txCount as estimate
    const targetEstimate = searchLimit > 0 ? searchLimit : Math.max(txCount, 1);
    // Calculate progress but cap at 95% while searching (never show complete until done)
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

        {/* Progress bar */}
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
            {onCancelSearch && (
              <button type="button" className="tx-history-cancel-btn" onClick={onCancelSearch}>
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Show transactions as they are found */}
        {transactionDetails.length > 0 && renderTransactionTable(transactionDetails)}

        {/* Show searching indicator if no transactions yet */}
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

      {/* Completed progress bar */}
      {transactionsResult && transactionDetails.length > 0 && (
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

      {/* Warning message for partial data */}
      {transactionsResult?.message && (
        <div
          className={`tx-history-message ${transactionsResult.source === "none" ? "tx-history-message-error" : "tx-history-message-warning"}`}
        >
          <span className="tx-history-message-icon">
            {transactionsResult.source === "none" ? "⚠️" : "ℹ️"}
          </span>
          {transactionsResult.message}
        </div>
      )}

      {/* Loading state */}
      {loadingTxDetails && <div className="tx-history-empty">Loading transaction details...</div>}

      {/* Transaction table */}
      {!loadingTxDetails &&
        transactionDetails.length > 0 &&
        renderTransactionTable(transactionDetails)}

      {/* Load More button with dropdown - hide when search is complete (no more txs to find) */}
      {!loadingTxDetails &&
        transactionDetails.length > 0 &&
        onLoadMore &&
        !transactionsResult?.isComplete && (
          <div className="tx-history-load-more">
            <div className="tx-history-button-group" ref={loadMoreDropdownRef}>
              <button
                type="button"
                className="tx-history-load-more-btn"
                onClick={() => onLoadMore(selectedLimit)}
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

      {/* Empty state */}
      {!loadingTxDetails && transactionDetails.length === 0 && !transactionsResult?.message && (
        <div className="tx-history-empty">No transactions found for this address</div>
      )}
    </div>
  );
};

export default TransactionHistory;
