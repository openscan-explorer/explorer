import type React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { GasPrices } from "../../../../types";
import { formatPrice } from "../../../../services/PriceService";
import { formatGasPriceWithUnit } from "../../../../utils/formatUtils";

interface DashboardStatsProps {
  price: number | null;
  gasPrice: string | null;
  gasPrices: GasPrices | null;
  blockNumber: string | null;
  currency: string;
  loading: boolean;
  networkId: number;
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
  gasPrices,
  blockNumber,
  currency,
  loading,
  networkId,
}) => {
  const { t } = useTranslation("network");
  // Use gas tiers if available, otherwise fall back to single gas price
  const hasGasTiers = gasPrices !== null;

  return (
    <div className="dashboard-stats-row">
      <div className="dashboard-stat-card">
        <div className="dashboard-stat-label">{t("currencyPrice", { currency })}</div>
        <div className={`dashboard-stat-value ${loading ? "dashboard-stat-loading" : ""}`}>
          {formatPrice(price)}
        </div>
      </div>

      {hasGasTiers ? (
        <div className="dashboard-stat-card dashboard-stat-card-gas">
          <Link to={`/${networkId}/gastracker`} className="dashboard-stat-label-link">
            {t("gasPriceLink")}
          </Link>
          <div className={`dashboard-gas-tiers ${loading ? "dashboard-stat-loading" : ""}`}>
            <div className="gas-tier gas-tier-low">
              <span className="gas-tier-label">{t("low")}</span>
              <span className="gas-tier-value">{formatGasPriceWithUnit(gasPrices.low)}</span>
            </div>
            <div className="gas-tier gas-tier-avg">
              <span className="gas-tier-label">{t("avg")}</span>
              <span className="gas-tier-value">{formatGasPriceWithUnit(gasPrices.average)}</span>
            </div>
            <div className="gas-tier gas-tier-high">
              <span className="gas-tier-label">{t("high")}</span>
              <span className="gas-tier-value">{formatGasPriceWithUnit(gasPrices.high)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="dashboard-stat-card">
          <Link to={`/${networkId}/gastracker`} className="dashboard-stat-label-link">
            {t("gasPriceLink")}
          </Link>
          <div className={`dashboard-stat-value ${loading ? "dashboard-stat-loading" : ""}`}>
            {formatGasPriceWithUnit(gasPrice)}
          </div>
        </div>
      )}

      <div className="dashboard-stat-card">
        <div className="dashboard-stat-label">{t("latestBlock")}</div>
        <div className={`dashboard-stat-value ${loading ? "dashboard-stat-loading" : ""}`}>
          {formatBlockNumber(blockNumber)}
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
