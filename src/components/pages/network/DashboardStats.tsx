import type React from "react";
import { formatPrice } from "../../../services/PriceService";

interface DashboardStatsProps {
  price: number | null;
  gasPrice: string | null;
  blockNumber: string | null;
  currency: string;
  loading: boolean;
}

function formatGasPrice(gasPriceHex: string | null): string {
  if (!gasPriceHex) return "—";
  try {
    const gasPriceWei = BigInt(gasPriceHex);
    const gasPriceGwei = Number(gasPriceWei) / 1e9;
    if (gasPriceGwei < 1) {
      return `${gasPriceGwei.toFixed(4)} Gwei`;
    }
    return `${gasPriceGwei.toFixed(2)} Gwei`;
  } catch {
    return "—";
  }
}

function formatBlockNumber(blockNumberHex: string | null): string {
  if (!blockNumberHex) return "—";
  try {
    const blockNumber = Number.parseInt(blockNumberHex, 16);
    return blockNumber.toLocaleString();
  } catch {
    return "—";
  }
}

const DashboardStats: React.FC<DashboardStatsProps> = ({
  price,
  gasPrice,
  blockNumber,
  currency,
  loading,
}) => {
  return (
    <div className="dashboard-stats-row">
      <div className="dashboard-stat-card">
        <div className="dashboard-stat-label">{currency} Price</div>
        <div className={`dashboard-stat-value ${loading ? "dashboard-stat-loading" : ""}`}>
          {formatPrice(price)}
        </div>
      </div>

      <div className="dashboard-stat-card">
        <div className="dashboard-stat-label">Gas Price</div>
        <div className={`dashboard-stat-value ${loading ? "dashboard-stat-loading" : ""}`}>
          {formatGasPrice(gasPrice)}
        </div>
      </div>

      <div className="dashboard-stat-card">
        <div className="dashboard-stat-label">Block</div>
        <div className={`dashboard-stat-value ${loading ? "dashboard-stat-loading" : ""}`}>
          {formatBlockNumber(blockNumber)}
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
