import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useDataService } from "../../../hooks/useDataService";
import type { BitcoinNetworkStats, BitcoinTransaction } from "../../../types";
import { formatBTC, formatTimeAgo, truncateHash } from "../../../utils/bitcoinFormatters";
import { calculateTotalOutput } from "../../../utils/bitcoinUtils";
import Loader from "../../common/Loader";

const PAGE_SIZE = 100;
const REFRESH_INTERVAL = 30000; // 30 seconds

export default function BitcoinMempoolPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Extract network slug from path (e.g., "/tbtc/mempool" → "tbtc")
  const networkSlug = location.pathname.split("/")[1] || "btc";
  const dataService = useDataService(networkSlug);

  // Get current page from URL params (1-indexed)
  const currentPage = Math.max(1, Number(searchParams.get("page")) || 1);

  const [transactions, setTransactions] = useState<BitcoinTransaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<BitcoinNetworkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const fetchMempoolData = useCallback(async () => {
    if (!dataService || !dataService.isBitcoin()) {
      setLoading(false);
      return;
    }

    try {
      const adapter = dataService.getBitcoinAdapter();

      // Fetch mempool stats and transactions in parallel
      const [statsResult, mempoolResult] = await Promise.all([
        adapter.getNetworkStats(),
        adapter.getMempoolTransactions(currentPage, PAGE_SIZE),
      ]);

      setStats(statsResult.data);
      setTransactions(mempoolResult.transactions);
      setTotalCount(mempoolResult.total);
      setError(null);
    } catch (err) {
      console.error("Error fetching mempool data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch mempool data");
    } finally {
      setLoading(false);
    }
  }, [dataService, currentPage]);

  useEffect(() => {
    setLoading(true);
    fetchMempoolData();

    // Set up polling interval
    const intervalId = setInterval(fetchMempoolData, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [fetchMempoolData]);

  // Navigation handlers
  const goToPage = (page: number) => {
    if (page === 1) {
      setSearchParams({});
    } else {
      setSearchParams({ page: String(page) });
    }
  };

  const goToPrevPage = () => goToPage(Math.max(1, currentPage - 1));
  const goToNextPage = () => goToPage(Math.min(totalPages, currentPage + 1));

  // Calculate display range
  const startIndex = totalCount > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const endIndex = Math.min(currentPage * PAGE_SIZE, totalCount);

  if (loading && transactions.length === 0) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="blocks-header">
            <span className="block-label">Bitcoin Mempool</span>
          </div>
          <div className="card-content-loading">
            <Loader text="Loading mempool data..." />
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
            <span className="block-label">Bitcoin Mempool</span>
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
            <span className="block-label">Bitcoin Mempool</span>
            <span className="block-header-divider">•</span>
            <span className="blocks-header-info">
              {stats?.mempoolSize?.toLocaleString() ?? totalCount.toLocaleString()} pending
              transactions
              {stats?.mempoolBytes ? ` (${(stats.mempoolBytes / 1000000).toFixed(2)} MB)` : ""}
            </span>
          </div>
          {totalPages > 1 && (
            <span className="blocks-header-info">
              Page {currentPage} of {totalPages}
            </span>
          )}
        </div>

        {transactions.length === 0 ? (
          <div className="card-content">
            <p className="text-muted margin-0">No pending transactions in mempool</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th className="hide-mobile">Time</th>
                  <th>Inputs</th>
                  <th>Outputs</th>
                  <th>Value</th>
                  <th>Fee</th>
                  <th className="hide-mobile">Fee Rate</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const isCoinbase = tx.vin.length === 1 && !tx.vin[0]?.txid;
                  const feeRate =
                    tx.fee !== undefined && tx.vsize > 0
                      ? ((tx.fee * 100000000) / tx.vsize).toFixed(1)
                      : "—";

                  return (
                    <tr key={tx.txid}>
                      <td className="table-cell-mono">
                        <Link
                          to={`/${networkSlug}/mempool/${tx.txid}`}
                          className="table-cell-address"
                          title={tx.txid}
                        >
                          {truncateHash(tx.txid, "long")}
                        </Link>
                      </td>
                      <td className="table-cell-text hide-mobile">
                        {tx.time ? formatTimeAgo(tx.time) : "—"}
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
                      <td className="table-cell-text">
                        {tx.fee !== undefined ? formatBTC(tx.fee) : "—"}
                      </td>
                      <td className="table-cell-muted hide-mobile">
                        {feeRate !== "—" ? `${feeRate} sat/vB` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="pagination-container">
            <button
              type="button"
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className="pagination-btn"
              title="Previous page"
            >
              ← Newer
            </button>
            <span className="pagination-info">
              {startIndex.toLocaleString()} - {endIndex.toLocaleString()} of{" "}
              {totalCount.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={goToNextPage}
              disabled={currentPage >= totalPages}
              className="pagination-btn"
              title="Next page"
            >
              Older →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
