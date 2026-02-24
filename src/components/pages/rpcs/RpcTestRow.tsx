import type React from "react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { MetadataRpcEndpoint } from "../../../services/MetadataService";
import type { RpcTestResult, RpcTestStatus } from "./useRpcLatencyTest";

interface RpcTestRowProps {
  url: string;
  metadata: MetadataRpcEndpoint | undefined;
  result: RpcTestResult | undefined;
  isActive: boolean;
  onRetest: (url: string) => void;
  onAdd: (url: string) => void;
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
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    const display = `${parsed.hostname}${path}`;
    return display.length > 50 ? `${display.slice(0, 47)}...` : display;
  } catch {
    return url.length > 50 ? `${url.slice(0, 47)}...` : url;
  }
}

const RpcTestRow: React.FC<RpcTestRowProps> = ({
  url,
  metadata,
  result,
  isActive,
  onRetest,
  onAdd,
}) => {
  const { t } = useTranslation("rpcs");
  const status = result?.status;
  const provider = getProviderLabel(url, metadata);
  const trackingClass = getTrackingClass(metadata);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(url);
  }, [url]);

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
        <span className="rpcs-provider-url" title={url}>
          {getTruncatedUrl(url)}
        </span>
      </div>

      {/* Latency */}
      <div className="rpcs-cell rpcs-cell-latency">
        {status === "pending" ? (
          <span className="rpcs-latency-pending">...</span>
        ) : status === "offline" ? (
          <span className="rpcs-latency-value rpcs-latency-slow">{t("latency.ms", { ms: 0 })}</span>
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
        {isActive ? (
          <span className="rpcs-active-badge">{t("actions.added")}</span>
        ) : (
          <button
            type="button"
            className="rpcs-action-button rpcs-button-add"
            onClick={() => onAdd(url)}
            title={t("actions.add")}
          >
            {t("actions.add")}
          </button>
        )}
      </div>

      {/* Mobile labels */}
      <div className="rpcs-mobile-row">
        <div className="rpcs-mobile-header">
          <span className={getStatusDotClass(status)} />
          <span className="rpcs-provider-name">{provider}</span>
          {isActive && <span className="rpcs-active-badge">{t("actions.added")}</span>}
        </div>
        <span className="rpcs-provider-url" title={url}>
          {getTruncatedUrl(url)}
        </span>
        <div className="rpcs-mobile-stats">
          {status === "pending" ? (
            <span className="rpcs-latency-pending">...</span>
          ) : status === "offline" ? (
            <span className="rpcs-latency-value rpcs-latency-slow">
              {t("latency.ms", { ms: 0 })}
            </span>
          ) : result?.latency != null ? (
            <span
              className={`rpcs-latency-value ${result.latency < 300 ? "rpcs-latency-fast" : result.latency < 1000 ? "rpcs-latency-medium" : "rpcs-latency-slow"}`}
            >
              {t("latency.ms", { ms: result.latency })}
            </span>
          ) : (
            <span className="rpcs-latency-na">{t("latency.na")}</span>
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
          {!isActive && (
            <button
              type="button"
              className="rpcs-action-button rpcs-button-add"
              onClick={() => onAdd(url)}
            >
              {t("actions.add")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RpcTestRow;
