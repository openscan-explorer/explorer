import type React from "react";
import { useTranslation } from "react-i18next";
import type { SolanaNetworkStats } from "../../../types";
import { calculateEpochProgress, formatSlotNumber } from "../../../utils/solanaUtils";

interface SolanaDashboardStatsProps {
  stats: SolanaNetworkStats | null;
  solPrice: number | null;
  loading: boolean;
}

const SolanaDashboardStats: React.FC<SolanaDashboardStatsProps> = ({
  stats,
  solPrice,
  loading,
}) => {
  const { t } = useTranslation("solana");

  const skeleton = (width: string) => (
    <span className="skeleton-pulse" style={{ width, height: 20, display: "inline-block" }} />
  );

  const epochProgress = stats
    ? calculateEpochProgress(stats.epochSlotIndex, stats.epochSlotsTotal)
    : 0;

  return (
    <div className="dashboard-stats-row">
      <div className="dashboard-stat-card">
        <div className="dashboard-stat-label">{t("dashboard.solPrice")}</div>
        <div className="dashboard-stat-value">
          {loading && solPrice === null
            ? skeleton("80px")
            : solPrice
              ? `$${solPrice.toFixed(2)}`
              : "—"}
        </div>
      </div>

      <div className="dashboard-stat-card">
        <div className="dashboard-stat-label">{t("dashboard.currentSlot")}</div>
        <div className="dashboard-stat-value">
          {loading && !stats ? skeleton("100px") : formatSlotNumber(stats?.currentSlot ?? 0)}
        </div>
        <div className="dashboard-stat-subvalue">
          {stats ? `${t("dashboard.blockHeight")}: ${formatSlotNumber(stats.blockHeight)}` : ""}
        </div>
      </div>

      <div className="dashboard-stat-card">
        <div className="dashboard-stat-label">{t("dashboard.epoch")}</div>
        <div className="dashboard-stat-value">
          {loading && !stats ? skeleton("60px") : (stats?.epoch ?? "—")}
        </div>
        <div className="dashboard-stat-subvalue">
          {stats ? `${epochProgress.toFixed(1)}% complete` : ""}
        </div>
      </div>
    </div>
  );
};

export default SolanaDashboardStats;
