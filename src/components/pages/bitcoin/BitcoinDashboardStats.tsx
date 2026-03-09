import type React from "react";
import { formatPrice } from "../../../services/PriceService";
import type { BitcoinFeeEstimates, BitcoinNetworkStats } from "../../../types";
import { formatFeeRate, formatNumber, formatSize } from "../../../utils/bitcoinFormatters";

interface BitcoinDashboardStatsProps {
  stats: BitcoinNetworkStats | null;
  btcPrice: number | null;
  feeEstimates: BitcoinFeeEstimates | null;
  loading: boolean;
}

const BitcoinDashboardStats: React.FC<BitcoinDashboardStatsProps> = ({
  stats,
  btcPrice,
  feeEstimates,
  loading,
}) => {
  return (
    <div className="dashboard-stats-row">
      <div className="dashboard-stat-card">
        <div className="dashboard-stat-label">BTC Price</div>
        <div className="dashboard-stat-value">
          {loading && !btcPrice ? (
            <span
              className="skeleton-pulse"
              style={{ width: "80px", height: 20, display: "inline-block" }}
            />
          ) : (
            formatPrice(btcPrice)
          )}
        </div>
      </div>

      <div className="dashboard-stat-card">
        <div className="dashboard-stat-label">Mempool</div>
        <div className="dashboard-stat-value">
          {loading && !stats ? (
            <span
              className="skeleton-pulse"
              style={{ width: "90px", height: 20, display: "inline-block" }}
            />
          ) : (
            <>{formatNumber(stats?.mempoolSize)} txs</>
          )}
        </div>
        <div className="dashboard-stat-subvalue">
          {loading && !stats ? (
            <span
              className="skeleton-pulse"
              style={{ width: "60px", height: 12, display: "inline-block" }}
            />
          ) : (
            formatSize(stats?.mempoolBytes ?? 0)
          )}
        </div>
      </div>

      <div className="dashboard-stat-card">
        <div className="dashboard-stat-label">Fee Estimates</div>
        <div className="dashboard-stat-value">
          {loading && !feeEstimates ? (
            <span
              className="skeleton-pulse"
              style={{ width: "80px", height: 20, display: "inline-block" }}
            />
          ) : (
            formatFeeRate(feeEstimates?.fast ?? null)
          )}
        </div>
        <div className="dashboard-stat-subvalue btc-fee-rates">
          {loading && !feeEstimates ? (
            <>
              <span
                className="skeleton-pulse"
                style={{ width: "50px", height: 12, display: "inline-block" }}
              />
              <span
                className="skeleton-pulse"
                style={{ width: "50px", height: 12, display: "inline-block" }}
              />
            </>
          ) : (
            <>
              <span title="~1 hour">Med: {formatFeeRate(feeEstimates?.medium ?? null)}</span>
              <span title="~24 hours">Low: {formatFeeRate(feeEstimates?.slow ?? null)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BitcoinDashboardStats;
