import type React from "react";
import { useCallback, useMemo } from "react";
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
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  networkId,
  addressHash,
  transactionsResult,
  transactionDetails,
  loadingTxDetails,
  contractAbi,
}) => {
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

  return (
    <div className="tx-details">
      <div className="tx-section tx-history-header">
        <span className="tx-section-title">Last Transactions</span>
        {transactionsResult && (
          <span
            className={`tx-history-status ${transactionsResult.source === "trace_filter" ? "tx-history-status-complete" : transactionsResult.source === "logs" ? "tx-history-status-partial" : "tx-history-status-none"}`}
          >
            {transactionsResult.source === "trace_filter" && (
              <>
                <span className="tx-history-dot">●</span>
                Complete history ({transactionDetails.length} transactions)
              </>
            )}
            {transactionsResult.source === "logs" && (
              <>
                <span className="tx-history-dot">●</span>
                Partial (logs only) - {transactionDetails.length} transactions
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
      {!loadingTxDetails && transactionDetails.length > 0 && (
        <div className="address-table-container">
          <table className="recent-transactions-table">
            <thead>
              <tr>
                <th>TX Hash</th>
                {hasContractAbi && <th>Method</th>}
                <th>From</th>
                <th>To</th>
                <th>Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactionDetails.map((tx) => (
                <tr key={tx.hash}>
                  <td>
                    <Link to={`/${networkId}/tx/${tx.hash}`} className="address-table-link">
                      {truncate(tx.hash, 8, 6)}
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
      )}

      {/* Empty state */}
      {!loadingTxDetails && transactionDetails.length === 0 && !transactionsResult?.message && (
        <div className="tx-history-empty">No transactions found for this address</div>
      )}
    </div>
  );
};

export default TransactionHistory;
