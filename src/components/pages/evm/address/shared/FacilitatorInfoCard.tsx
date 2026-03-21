import type React from "react";
import { useTranslation } from "react-i18next";
import type { X402Facilitator } from "../../../../../config/x402Facilitators";

interface FacilitatorInfoCardProps {
  facilitator: X402Facilitator;
}

const FacilitatorInfoCard: React.FC<FacilitatorInfoCardProps> = ({ facilitator }) => {
  const { t } = useTranslation("address");

  return (
    <div className="facilitator-info-card">
      <div className="account-card-title">{t("facilitatorInfo")}</div>

      {/* Name with logo */}
      <div className="account-card-row">
        <span className="account-card-label">{t("facilitatorName")}:</span>
        <span className="account-card-value">
          <span className="facilitator-name-display">
            <img
              src={facilitator.logoUrl}
              alt={facilitator.name}
              className="facilitator-logo"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            {facilitator.name}
          </span>
        </span>
      </div>

      {/* Description */}
      <div className="account-card-row">
        <span className="account-card-label">{t("facilitatorDescription")}:</span>
        <span className="account-card-value">{facilitator.description}</span>
      </div>

      {/* Website */}
      <div className="account-card-row">
        <span className="account-card-label">{t("facilitatorWebsite")}:</span>
        <span className="account-card-value">
          <a
            href={facilitator.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="facilitator-link"
          >
            {facilitator.websiteUrl} ↗
          </a>
        </span>
      </div>

      {/* Base URL */}
      <div className="account-card-row">
        <span className="account-card-label">{t("facilitatorBaseUrl")}:</span>
        <span className="account-card-value tx-mono">{facilitator.baseUrl}</span>
      </div>

      {/* Schemes */}
      <div className="account-card-row">
        <span className="account-card-label">{t("facilitatorSchemes")}:</span>
        <span className="account-card-value">{facilitator.schemes.join(", ")}</span>
      </div>

      {/* Assets */}
      <div className="account-card-row">
        <span className="account-card-label">{t("facilitatorAssets")}:</span>
        <span className="account-card-value">{facilitator.assets.join(", ")}</span>
      </div>

      {/* Capabilities */}
      <div className="account-card-row">
        <span className="account-card-label">{t("facilitatorCapabilities")}:</span>
        <span className="account-card-value">
          <span className="facilitator-capabilities">
            {facilitator.supports.verify && (
              <span className="facilitator-capability-badge supported">
                {t("facilitatorVerify")}
              </span>
            )}
            {facilitator.supports.settle && (
              <span className="facilitator-capability-badge supported">
                {t("facilitatorSettle")}
              </span>
            )}
            {facilitator.supports.supported && (
              <span className="facilitator-capability-badge supported">
                {t("facilitatorSupported")}
              </span>
            )}
            {facilitator.supports.list && (
              <span className="facilitator-capability-badge supported">{t("facilitatorList")}</span>
            )}
          </span>
        </span>
      </div>
    </div>
  );
};

export default FacilitatorInfoCard;
