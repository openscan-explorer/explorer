import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDataService } from "../../../hooks/useDataService";
import type { BitcoinTransaction } from "../../../types";
import Loader from "../../common/Loader";

const TXS_PER_PAGE = 50;

function formatBTC(value: number): string {
  return `${value.toFixed(8)} BTC`;
}

function truncateHash(hash: string, start = 12, end = 8): string {
  if (!hash || hash.length <= start + end) return hash || "—";
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

function calculateTotalOutput(tx: BitcoinTransaction): number {
  return tx.vout.reduce((sum, output) => sum + output.value, 0);
}

function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp * 1000;
  const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);

  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) {
    const mins = Math.floor(diffSeconds / 60);
    return `${mins}m ago`;
  }
  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours}h ago`;
  }
  const days = Math.floor(diffSeconds / 86400);
  return `${days}d ago`;
}

export default function BitcoinTransactionsPage() {
  const { networkId } = useParams<{ networkId?: string }>();
  const dataService = useDataService(networkId || "");

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
        console.error("Error fetching Bitcoin transactions:", err);
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
                        to={`/${networkId}/tx/${tx.txid}`}
                        className="table-cell-address"
                        title={tx.txid}
                      >
                        {truncateHash(tx.txid)}
                      </Link>
                    </td>
                    <td>
                      {tx.blockhash ? (
                        <Link
                          to={`/${networkId}/block/${tx.blockhash}`}
                          className="table-cell-number"
                          title={tx.blockhash}
                        >
                          {truncateHash(tx.blockhash, 8, 6)}
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
