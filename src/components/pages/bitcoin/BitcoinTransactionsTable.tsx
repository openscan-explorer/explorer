import type React from "react";
import { Link } from "react-router-dom";
import type { BitcoinTransaction } from "../../../types";

interface BitcoinTransactionsTableProps {
  transactions: BitcoinTransaction[];
  loading: boolean;
  networkId?: string;
}

function formatBTC(value: number): string {
  return `${value.toFixed(8)} BTC`;
}

function truncateHash(hash: string, start = 8, end = 6): string {
  if (!hash || hash.length <= start + end) return hash || "—";
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

function calculateTotalOutput(tx: BitcoinTransaction): number {
  return tx.vout.reduce((sum, output) => sum + output.value, 0);
}

const BitcoinTransactionsTable: React.FC<BitcoinTransactionsTableProps> = ({
  transactions,
  loading,
  networkId,
}) => {
  return (
    <div className="dashboard-table-section dashboard-table-section-full">
      <div className="dashboard-table-header">
        <h3 className="dashboard-table-title">Latest Transactions</h3>
      </div>

      {loading && transactions.length === 0 ? (
        <div className="dashboard-table-loading">Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div className="dashboard-table-empty">No transactions found</div>
      ) : (
        <div className="dashboard-table-compact dashboard-table-scrollable">
          {transactions.map((tx) => (
            <div key={tx.txid} className="dashboard-table-row">
              <div className="dashboard-tx-info">
                <span className="dashboard-tx-hash">
                  {networkId ? (
                    <Link to={`/${networkId}/tx/${tx.txid}`} className="link-accent tx-mono">
                      {truncateHash(tx.txid, 10, 8)}
                    </Link>
                  ) : (
                    <span className="tx-mono">{truncateHash(tx.txid, 10, 8)}</span>
                  )}
                </span>
              </div>
              <div className="dashboard-tx-details">
                <span className="dashboard-tx-ios">
                  {tx.vin.length} in / {tx.vout.length} out
                </span>
              </div>
              <div className="dashboard-tx-value">
                <span className="tx-value-highlight">{formatBTC(calculateTotalOutput(tx))}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BitcoinTransactionsTable;
