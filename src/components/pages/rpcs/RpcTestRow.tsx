import type React from "react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { MetadataRpcEndpoint } from "../../../services/MetadataService";
import { redactSensitiveUrl } from "../../../utils/urlUtils";
import type { RpcTestResult, RpcTestStatus } from "./useRpcLatencyTest";

interface RpcTestRowProps {
  url: string;
  metadata: MetadataRpcEndpoint | undefined;
  result: RpcTestResult | undefined;
  isActive: boolean;
  onRetest: (url: string) => void;
}

function getStatusDotClass(status: RpcTestStatus | undefined): string {
  switch (status) {
    case "online":
      return "rpcs-status-dot rpcs-status-online";
    case "offline":
      return "rpcs-status-dot rpcs-status-offline";
    case "timeout":
      return "rpcs-status-dot rpcs-status-timeout";
    case "pending":
      return "rpcs-status-dot rpcs-status-pending";
    default:
      return "rpcs-status-dot rpcs-status-untested";
  }
}

function getTrackingClass(metadata: MetadataRpcEndpoint | undefined): string {
  if (!metadata) return "";
  if (metadata.tracking !== "none") return "rpc-tracking";
  if (metadata.isOpenSource) return "rpc-opensource";
  return "rpc-private";
}

function getProviderLabel(url: string, metadata: MetadataRpcEndpoint | undefined): string {
  if (metadata?.provider && metadata.provider.toLowerCase() !== "unknown") {
    return metadata.provider;
  }
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function getTruncatedUrl(url: string): string {
  const safeUrl = redactSensitiveUrl(url);
  try {
    const parsed = new URL(safeUrl);
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    const query = parsed.search ? parsed.search : "";
    const display = `${parsed.hostname}${path}${query}`;
    return display.length > 70 ? `${display.slice(0, 67)}...` : display;
  } catch {
    return safeUrl.length > 70 ? `${safeUrl.slice(0, 67)}...` : safeUrl;
  }
}

const RpcTestRow: React.FC<RpcTestRowProps> = ({ url, metadata, result, isActive, onRetest }) => {
  const { t } = useTranslation("rpcs");
  const status = result?.status;
  const provider = getProviderLabel(url, metadata);
  const trackingClass = getTrackingClass(metadata);

  const safeUrl = redactSensitiveUrl(url);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(safeUrl);
  }, [safeUrl]);

  const getTrackingLabel = (): string => {
    if (!metadata) return "";
    if (metadata.tracking !== "none") return t("tracking.enabled");
    if (metadata.isOpenSource) return t("tracking.opensource");
    return t("tracking.private");
  };

  return (
    <div className={`rpcs-row ${isActive ? "rpcs-row-active" : ""}`}>
      {/* Provider */}
      <div className="rpcs-cell rpcs-cell-provider">
        <span className="rpcs-provider-name">{provider}</span>
        <span className="rpcs-provider-url" title={safeUrl}>
          {getTruncatedUrl(url)}
        </span>
      </div>

      {/* Latency */}
      <div className="rpcs-cell rpcs-cell-latency">
        {status === "pending" ? (
          <span className="rpcs-latency-pending">...</span>
        ) : status === "offline" || status === "timeout" || status === "untested" ? (
          <span className="rpcs-latency-na">{t("latency.na")}</span>
        ) : result?.latency != null ? (
          <span
            className={`rpcs-latency-value ${result.latency < 300 ? "rpcs-latency-fast" : result.latency < 1000 ? "rpcs-latency-medium" : "rpcs-latency-slow"}`}
          >
            {t("latency.ms", { ms: result.latency })}
          </span>
        ) : (
          <span className="rpcs-latency-na">{t("latency.na")}</span>
        )}
      </div>

      {/* Status */}
      <div className="rpcs-cell rpcs-cell-status">
        <span className={getStatusDotClass(status)} />
        <span className="rpcs-status-label">
          {status ? t(`status.${status}`) : t("status.untested")}
        </span>
      </div>

      {/* Block Number */}
      <div className="rpcs-cell rpcs-cell-block">
        {status === "pending" ? (
          <span className="rpcs-block-pending">...</span>
        ) : result?.blockNumber ? (
          <span className="rpcs-block-value">
            {result.blockNumber.startsWith("0x")
              ? Number.parseInt(result.blockNumber, 16).toLocaleString()
              : Number(result.blockNumber).toLocaleString()}
          </span>
        ) : (
          <span className="rpcs-block-na">{t("latency.na")}</span>
        )}
      </div>

      {/* Tracking */}
      <div className="rpcs-cell rpcs-cell-tracking">
        {trackingClass && (
          <span className={`settings-rpc-tag ${trackingClass}`}>{getTrackingLabel()}</span>
        )}
      </div>

      {/* Actions */}
      <div className="rpcs-cell rpcs-cell-actions">
        <button
          type="button"
          className="rpcs-action-button rpcs-button-retest"
          onClick={() => onRetest(url)}
          disabled={status === "pending"}
          title={t("actions.retest")}
        >
          {t("actions.retest")}
        </button>
        <button
          type="button"
          className="rpcs-action-button rpcs-button-copy"
          onClick={handleCopy}
          title={t("actions.copyUrl")}
        >
          {t("actions.copyUrl")}
        </button>
      </div>

      {/* Mobile labels */}
      <div className="rpcs-mobile-row">
        <div className="rpcs-mobile-header">
          <span className={getStatusDotClass(status)} />
          <span className="rpcs-provider-name">{provider}</span>
        </div>
        <span className="rpcs-provider-url" title={safeUrl}>
          {getTruncatedUrl(url)}
        </span>
        <div className="rpcs-mobile-stats">
          {status === "pending" ? (
            <span className="rpcs-latency-pending">...</span>
          ) : status === "offline" || status === "timeout" || status === "untested" ? (
            <span className="rpcs-latency-na">{t("latency.na")}</span>
          ) : result?.latency != null ? (
            <span
              className={`rpcs-latency-value ${result.latency < 300 ? "rpcs-latency-fast" : result.latency < 1000 ? "rpcs-latency-medium" : "rpcs-latency-slow"}`}
            >
              {t("latency.ms", { ms: result.latency })}
            </span>
          ) : (
            <span className="rpcs-latency-na">{t("latency.na")}</span>
          )}
          {result?.blockNumber && (
            <span className="rpcs-block-value">
              #
              {result.blockNumber.startsWith("0x")
                ? Number.parseInt(result.blockNumber, 16).toLocaleString()
                : Number(result.blockNumber).toLocaleString()}
            </span>
          )}
          {trackingClass && (
            <span className={`settings-rpc-tag ${trackingClass}`}>{getTrackingLabel()}</span>
          )}
        </div>
        <div className="rpcs-mobile-actions">
          <button
            type="button"
            className="rpcs-action-button rpcs-button-retest"
            onClick={() => onRetest(url)}
            disabled={status === "pending"}
          >
            {t("actions.retest")}
          </button>
          <button
            type="button"
            className="rpcs-action-button rpcs-button-copy"
            onClick={handleCopy}
          >
            {t("actions.copyUrl")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RpcTestRow;
