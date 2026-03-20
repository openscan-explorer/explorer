import type React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { GasPrices } from "../../../../types";
import { useSettings } from "../../../../context/SettingsContext";
import { formatPrice } from "../../../../services/PriceService";
import { formatGasPriceWithUnit } from "../../../../utils/formatUtils";
import HelperTooltip from "../../../common/HelperTooltip";

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
  const { t: tTooltips } = useTranslation("tooltips");
  const { settings } = useSettings();
  // Use gas tiers if available, otherwise fall back to single gas price
  const hasGasTiers = gasPrices !== null;

  return (
    <div className="dashboard-stats-row">
      <div className="dashboard-stat-card">
        <div className="dashboard-stat-label">
          {t("currencyPrice", { currency })}
          {settings.showHelperTooltips !== false && (
            <HelperTooltip content={tTooltips("network.currencyPrice")} />
          )}
        </div>
        <div className="dashboard-stat-value">
          {loading ? (
            <span
              className="skeleton-pulse"
              style={{ width: "80px", height: 20, display: "inline-block" }}
            />
          ) : (
            formatPrice(price)
          )}
        </div>
      </div>

      <div className="dashboard-stat-card dashboard-stat-card-gas">
        <Link to={`/${networkId}/gastracker`} className="dashboard-stat-label-link">
          {t("gasPriceLink")}
        </Link>
        {hasGasTiers ? (
          <div className="dashboard-gas-tiers">
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
        ) : (
          <div className="dashboard-gas-tiers">
            <div className="gas-tier gas-tier-low">
              <span className="gas-tier-label">{t("low")}</span>
              <span className="gas-tier-value">
                {loading ? (
                  <span
                    className="skeleton-pulse"
                    style={{ width: "50px", height: 14, display: "inline-block" }}
                  />
                ) : (
                  formatGasPriceWithUnit(gasPrice)
                )}
              </span>
            </div>
            <div className="gas-tier gas-tier-avg">
              <span className="gas-tier-label">{t("avg")}</span>
              <span className="gas-tier-value">
                {loading ? (
                  <span
                    className="skeleton-pulse"
                    style={{ width: "50px", height: 14, display: "inline-block" }}
                  />
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="gas-tier gas-tier-high">
              <span className="gas-tier-label">{t("high")}</span>
              <span className="gas-tier-value">
                {loading ? (
                  <span
                    className="skeleton-pulse"
                    style={{ width: "50px", height: 14, display: "inline-block" }}
                  />
                ) : (
                  "—"
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-stat-card">
        <div className="dashboard-stat-label">
          {t("latestBlock")}
          {settings.showHelperTooltips !== false && (
            <HelperTooltip content={tTooltips("network.latestBlock")} />
          )}
        </div>
        <div className="dashboard-stat-value">
          {loading ? (
            <span
              className="skeleton-pulse"
              style={{ width: "100px", height: 20, display: "inline-block" }}
            />
          ) : (
            formatBlockNumber(blockNumber)
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
