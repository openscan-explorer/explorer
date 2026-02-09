import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { TXS_PER_PAGE } from "../../../config/bitcoinConstants";
import { useDataService } from "../../../hooks/useDataService";
import type { BitcoinTransaction } from "../../../types";
import {
  formatBTC,
  formatTimeAgo,
  truncateBlockHash,
  truncateHash,
} from "../../../utils/bitcoinFormatters";
import { calculateTotalOutput } from "../../../utils/bitcoinUtils";
import { logger } from "../../../utils/logger";
import Loader from "../../common/Loader";

export default function BitcoinTransactionsPage() {
  const location = useLocation();

  // Extract network slug from path (e.g., "/tbtc/txs" → "tbtc")
  const networkSlug = location.pathname.split("/")[1] || "btc";
  const dataService = useDataService(networkSlug);

  const [transactions, setTransactions] = useState<BitcoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataService || !dataService.isBitcoin()) {
      setLoading(false);
      return;
    }

    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);

      try {
        const adapter = dataService.getBitcoinAdapter();

        // Get latest transactions from recent blocks
        const txs = await adapter.getLatestTransactions(TXS_PER_PAGE);
        setTransactions(txs);
      } catch (err) {
        logger.error("Error fetching Bitcoin transactions:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch transactions");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [dataService]);

  if (loading) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="blocks-header">
            <span className="block-label">Bitcoin Transactions</span>
          </div>
          <div className="card-content-loading">
            <Loader text="Loading transactions..." />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="blocks-header">
            <span className="block-label">Bitcoin Transactions</span>
          </div>
          <div className="card-content">
            <p className="text-error margin-0">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-wide">
      <div className="block-display-card">
        <div className="blocks-header">
          <div className="blocks-header-main">
            <span className="block-label">Bitcoin Transactions</span>
            <span className="block-header-divider">•</span>
            <span className="blocks-header-info">
              Showing {transactions.length} recent transactions from latest blocks
            </span>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Block</th>
                <th className="hide-mobile">Time</th>
                <th>Inputs</th>
                <th>Outputs</th>
                <th>Value</th>
                <th className="hide-mobile">Size</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const isCoinbase = tx.vin.length === 1 && !tx.vin[0]?.txid;
                return (
                  <tr key={tx.txid}>
                    <td className="table-cell-mono">
                      <Link
                        to={`/${networkSlug}/tx/${tx.txid}`}
                        className="table-cell-address"
                        title={tx.txid}
                      >
                        {truncateHash(tx.txid, "long")}
                      </Link>
                    </td>
                    <td>
                      {tx.blockhash ? (
                        <Link
                          to={`/${networkSlug}/block/${tx.blockhash}`}
                          className="table-cell-number"
                          title={tx.blockhash}
                        >
                          {truncateBlockHash(tx.blockhash)}
                        </Link>
                      ) : (
                        <span className="text-muted">Pending</span>
                      )}
                    </td>
                    <td className="table-cell-text hide-mobile">
                      {tx.blocktime ? formatTimeAgo(tx.blocktime) : "—"}
                    </td>
                    <td className="table-cell-value">
                      {isCoinbase ? (
                        <span className="btc-flag-yes" title="Coinbase transaction">
                          Coinbase
                        </span>
                      ) : (
                        tx.vin.length
                      )}
                    </td>
                    <td className="table-cell-value">{tx.vout.length}</td>
                    <td className="table-cell-text tx-value-highlight">
                      {formatBTC(calculateTotalOutput(tx))}
                    </td>
                    <td className="table-cell-muted hide-mobile">{tx.vsize.toLocaleString()} vB</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
