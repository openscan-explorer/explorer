import type React from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../../context/SettingsContext";
import type { ZcashNetworkStats } from "../../../types";
import {
  formatDifficulty,
  formatNumber,
  formatPercent,
  formatSize,
  formatZECCompact,
} from "../../../utils/zcashFormatters";
import { getShieldedSupplyPercent } from "../../../utils/zcashUtils";
import HelperTooltip from "../../common/HelperTooltip";
import { ZcashSkeleton } from "./ZcashCells";

interface ZcashDashboardStatsProps {
  stats: ZcashNetworkStats | null;
  currency: string;
  loading: boolean;
}

const ZcashDashboardStats: React.FC<ZcashDashboardStatsProps> = ({ stats, currency, loading }) => {
  const { t } = useTranslation("zcash");
  const { t: tTooltips } = useTranslation("tooltips");
  const { settings } = useSettings();
  const showTooltips = settings.showHelperTooltips !== false;
  const isLoading = loading && !stats;
  const shieldedPercent = stats ? getShieldedSupplyPercent(stats) : null;

  return (
    <div className="dashboard-stats-row">
      <div className="dashboard-stat-card">
        <div className="dashboard-stat-label">{t("dashboard.blockHeight")}</div>
        <div className="dashboard-stat-value">
          {isLoading ? (
            <ZcashSkeleton width={100} size="stat" />
          ) : stats ? (
            `#${formatNumber(stats.blockHeight)}`
          ) : (
            "—"
          )}
        </div>
        <div className="dashboard-stat-subvalue">
          {stats ? t("dashboard.difficulty", { value: formatDifficulty(stats.difficulty) }) : ""}
        </div>
      </div>

      <div className="dashboard-stat-card">
        <div className="dashboard-stat-label">{t("dashboard.mempool")}</div>
        <div className="dashboard-stat-value">
          {isLoading ? (
            <ZcashSkeleton width={90} size="stat" />
          ) : stats ? (
            t("dashboard.mempoolTxs", { count: stats.mempoolSize })
          ) : (
            "—"
          )}
        </div>
        <div className="dashboard-stat-subvalue">{stats ? formatSize(stats.mempoolBytes) : ""}</div>
      </div>

      <div className="dashboard-stat-card">
        <div className="dashboard-stat-label">
          {t("dashboard.chainSupply")}
          {showTooltips && <HelperTooltip content={tTooltips("zcash.chainSupply")} />}
        </div>
        <div className="dashboard-stat-value">
          {isLoading ? (
            <ZcashSkeleton width={140} size="stat" />
          ) : stats?.chainSupplyZat !== undefined ? (
            formatZECCompact(stats.chainSupplyZat, currency)
          ) : (
            "—"
          )}
        </div>
        <div className="dashboard-stat-subvalue">
          {shieldedPercent !== null
            ? t("dashboard.shieldedShare", { percent: formatPercent(shieldedPercent) })
            : ""}
        </div>
      </div>
    </div>
  );
};

export default ZcashDashboardStats;
