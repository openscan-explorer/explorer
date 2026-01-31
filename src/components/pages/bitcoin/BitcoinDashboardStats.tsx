import type React from "react";
import { formatPrice } from "../../../services/PriceService";
import type { BitcoinFeeEstimates, BitcoinNetworkStats } from "../../../types";

interface BitcoinDashboardStatsProps {
  stats: BitcoinNetworkStats | null;
  btcPrice: number | null;
  feeEstimates: BitcoinFeeEstimates | null;
  loading: boolean;
}

function formatNumber(value: number | undefined): string {
  if (value === undefined || value === null) return "—";
  return value.toLocaleString();
}

function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatFeeRate(rate: number | null | undefined): string {
  if (rate === undefined || rate === null) return "—";
  return `${rate} sat/vB`;
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
        <div className={`dashboard-stat-value ${loading ? "dashboard-stat-loading" : ""}`}>
          {formatPrice(btcPrice)}
        </div>
      </div>

      <div className="dashboard-stat-card">
        <div className="dashboard-stat-label">Mempool</div>
        <div className={`dashboard-stat-value ${loading ? "dashboard-stat-loading" : ""}`}>
          {formatNumber(stats?.mempoolSize)} txs
        </div>
        <div className="dashboard-stat-subvalue">{formatBytes(stats?.mempoolBytes)}</div>
      </div>

      <div className="dashboard-stat-card">
        <div className="dashboard-stat-label">Fee Estimates</div>
        <div className={`dashboard-stat-value ${loading ? "dashboard-stat-loading" : ""}`}>
          {formatFeeRate(feeEstimates?.fast)}
        </div>
        <div className="dashboard-stat-subvalue btc-fee-rates">
          <span title="~1 hour">Med: {formatFeeRate(feeEstimates?.medium)}</span>
          <span title="~24 hours">Low: {formatFeeRate(feeEstimates?.slow)}</span>
        </div>
      </div>
    </div>
  );
};

export default BitcoinDashboardStats;
