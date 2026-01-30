import type React from "react";
import type { BitcoinNetworkStats } from "../../../types";

interface BitcoinDashboardStatsProps {
  stats: BitcoinNetworkStats | null;
  loading: boolean;
}

function formatNumber(value: number | undefined): string {
  if (value === undefined || value === null) return "—";
  return value.toLocaleString();
}

function formatDifficulty(difficulty: number | undefined): string {
  if (difficulty === undefined || difficulty === null) return "—";
  // Format difficulty in T (tera)
  const trillions = difficulty / 1e12;
  return `${trillions.toFixed(2)} T`;
}

function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const BitcoinDashboardStats: React.FC<BitcoinDashboardStatsProps> = ({ stats, loading }) => {
  return (
    <div className="dashboard-stats-row">
      <div className="dashboard-stat-card">
        <div className="dashboard-stat-label">Block Height</div>
        <div className={`dashboard-stat-value ${loading ? "dashboard-stat-loading" : ""}`}>
          {formatNumber(stats?.blockHeight)}
        </div>
      </div>

      <div className="dashboard-stat-card">
        <div className="dashboard-stat-label">Difficulty</div>
        <div className={`dashboard-stat-value ${loading ? "dashboard-stat-loading" : ""}`}>
          {formatDifficulty(stats?.difficulty)}
        </div>
      </div>

      <div className="dashboard-stat-card">
        <div className="dashboard-stat-label">Mempool</div>
        <div className={`dashboard-stat-value ${loading ? "dashboard-stat-loading" : ""}`}>
          {formatNumber(stats?.mempoolSize)} txs
        </div>
        <div className="dashboard-stat-subvalue">{formatBytes(stats?.mempoolBytes)}</div>
      </div>
    </div>
  );
};

export default BitcoinDashboardStats;
