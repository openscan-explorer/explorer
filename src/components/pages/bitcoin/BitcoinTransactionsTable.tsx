import type React from "react";
import { Link } from "react-router-dom";
import type { BitcoinTransaction } from "../../../types";
import { formatBTC, truncateHash } from "../../../utils/bitcoinFormatters";
import { calculateTotalOutput } from "../../../utils/bitcoinUtils";

interface BitcoinTransactionsTableProps {
  transactions: BitcoinTransaction[];
  loading: boolean;
  networkId?: string;
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
                      {truncateHash(tx.txid, "medium")}
                    </Link>
                  ) : (
                    <span className="tx-mono">{truncateHash(tx.txid, "medium")}</span>
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
