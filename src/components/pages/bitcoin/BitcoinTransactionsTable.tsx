import type React from "react";
import { Link } from "react-router-dom";
import type { BitcoinTransaction } from "../../../types";
import { formatBTC, truncateHash } from "../../../utils/bitcoinFormatters";
import { calculateTotalOutput } from "../../../utils/bitcoinUtils";

interface BitcoinTransactionsTableProps {
  transactions: BitcoinTransaction[];
  loading: boolean;
  networkId: string;
}

const BitcoinTransactionsTable: React.FC<BitcoinTransactionsTableProps> = ({
  transactions,
  loading,
  networkId,
}) => {
  return (
    <div className="dashboard-table-section dashboard-table-section-full">
      <div className="dashboard-table-header">
        <Link to={`/${networkId}/txs`} className="dashboard-table-title-link">
          <h3 className="dashboard-table-title">Latest Transactions</h3>
          <span className="dashboard-title-arrow">↗</span>
        </Link>
        <Link to={`/${networkId}/txs`} className="dashboard-view-all">
          View all →
        </Link>
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
                <Link to={`/${networkId}/tx/${tx.txid}`} className="dashboard-tx-hash tx-mono">
                  {truncateHash(tx.txid, "medium")}
                </Link>
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
