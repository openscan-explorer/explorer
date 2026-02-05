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
        <div className={`dashboard-stat-value ${loading ? "dashboard-stat-loading" : ""}`}>
          {formatPrice(btcPrice)}
        </div>
      </div>

      <div className="dashboard-stat-card">
        <div className="dashboard-stat-label">Mempool</div>
        <div className={`dashboard-stat-value ${loading ? "dashboard-stat-loading" : ""}`}>
          {formatNumber(stats?.mempoolSize)} txs
        </div>
        <div className="dashboard-stat-subvalue">{formatSize(stats?.mempoolBytes ?? 0)}</div>
      </div>

      <div className="dashboard-stat-card">
        <div className="dashboard-stat-label">Fee Estimates</div>
        <div className={`dashboard-stat-value ${loading ? "dashboard-stat-loading" : ""}`}>
          {formatFeeRate(feeEstimates?.fast ?? null)}
        </div>
        <div className="dashboard-stat-subvalue btc-fee-rates">
          <span title="~1 hour">Med: {formatFeeRate(feeEstimates?.medium ?? null)}</span>
          <span title="~24 hours">Low: {formatFeeRate(feeEstimates?.slow ?? null)}</span>
        </div>
      </div>
    </div>
  );
};

export default BitcoinDashboardStats;
