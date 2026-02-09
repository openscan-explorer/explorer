import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { AppContext } from "../../context/AppContext";
import { useSettings } from "../../context/SettingsContext";
import type { RPCMetadata } from "../../types";

interface RPCIndicatorProps {
  metadata: RPCMetadata;
  selectedProvider: string | null;
  onProviderSelect: (url: string) => void;
  className?: string;
}

/**
 * Compact RPC indicator that shows request statistics
 * Expands on click to show detailed provider information
 */
export function RPCIndicator({
  metadata,
  selectedProvider,
  onProviderSelect,
  className,
}: RPCIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { networkId } = useParams<{ networkId?: string }>();
  const { rpcUrls } = useContext(AppContext);
  const { settings } = useSettings();
  const { t } = useTranslation();

  const successCount = metadata.responses.filter((r) => r.status === "success").length;
  const totalCount = metadata.responses.length;
  const isFallbackMode = metadata.strategy === "fallback";
  const isRaceMode = metadata.strategy === "race";

  // For race mode, get the actual total number of providers queried
  const networkRpcUrls = rpcUrls[Number(networkId) || 1] || [];
  const totalProviders = isRaceMode
    ? settings.maxParallelRequests && settings.maxParallelRequests > 0
      ? Math.min(networkRpcUrls.length, settings.maxParallelRequests)
      : networkRpcUrls.length
    : totalCount;

  // In race mode, find the fastest successful response (winner)
  const raceWinnerUrl = isRaceMode
    ? metadata.responses.find((r) => r.status === "success")?.url
    : null;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`rpc-indicator ${className || ""}`} ref={dropdownRef}>
      {/* Compact Badge */}
      {/** biome-ignore lint/a11y/noStaticElementInteractions: <TODO> */}
      {/** biome-ignore lint/a11y/useKeyWithClickEvents: <TODO> */}
      <div
        className="rpc-indicator-badge"
        onClick={() => setIsExpanded(!isExpanded)}
        title={t("rpcIndicator.clickToSeeDetails")}
      >
        {metadata.hasInconsistencies && (
          <span className="rpc-indicator-warning" title={t("rpcIndicator.inconsistentResponses")}>
            !!!
          </span>
        )}
        <span className="rpc-indicator-status">
          {isFallbackMode ? (
            // Fallback: show attempt ratio (1/N means succeeded on Nth attempt)
            `✓ 1/${totalCount}`
          ) : isRaceMode ? (
            // Race: show lightning bolt — 1 winner out of N total providers
            <>
              {"⚡"} 1/{totalProviders}
            </>
          ) : (
            // Parallel: show success count
            <>
              {"✓"} {successCount}/{totalCount}
            </>
          )}
        </span>
      </div>

      {/* Expanded Dropdown */}
      {isExpanded && (
        <div className="rpc-indicator-dropdown">
          <div className="rpc-indicator-header">
            <strong>{t("rpcIndicator.rpcProviders")}</strong>
            <span className="rpc-indicator-strategy">
              {t("rpcIndicator.strategy", { strategy: metadata.strategy })}
            </span>
          </div>

          {isFallbackMode && totalCount > 1 && (
            <div className="rpc-indicator-fallback-info">
              {t("rpcIndicator.succeededOnAttempt", { count: totalCount })}
            </div>
          )}

          {isRaceMode && (
            <div className="rpc-indicator-race-info">{t("rpcIndicator.fastestResponseWins")}</div>
          )}

          {metadata.hasInconsistencies && (
            <div className="rpc-indicator-warning-banner">{t("rpcIndicator.responsesDiffer")}</div>
          )}

          <div className="rpc-indicator-list">
            {(isRaceMode
              ? [...metadata.responses].sort((a, b) => a.responseTime - b.responseTime)
              : metadata.responses
            ).map((response, idx) => {
              const isSelected = selectedProvider === response.url;
              const urlDisplay = truncateUrl(response.url);
              const isClickable = !isFallbackMode && !isRaceMode && response.status === "success";
              const isRaceWinner = isRaceMode && response.url === raceWinnerUrl;

              return (
                // biome-ignore lint/a11y/noStaticElementInteractions: <TODO>
                // biome-ignore lint/a11y/useKeyWithClickEvents: <TODO>
                <div
                  key={response.url}
                  className={`rpc-indicator-item ${isSelected ? "selected" : ""} ${response.status} ${isFallbackMode ? "fallback-mode" : ""} ${isRaceWinner ? "race-winner" : ""}`}
                  onClick={() => {
                    if (isClickable) {
                      onProviderSelect(response.url);
                      setIsExpanded(false);
                    }
                  }}
                  style={{ cursor: isClickable ? "pointer" : "default" }}
                >
                  <div className="rpc-indicator-item-header">
                    <span className="rpc-indicator-item-index">#{idx + 1}</span>
                    <span className="rpc-indicator-item-url" title={response.url}>
                      {urlDisplay}
                    </span>
                    <span className={`rpc-indicator-item-status ${response.status}`}>
                      {response.status === "success" ? "✓" : "✗"}
                    </span>
                  </div>

                  {response.status === "error" && (
                    <div className="rpc-indicator-item-error">{response.error}</div>
                  )}

                  {response.responseTime > 0 && (
                    <div className="rpc-indicator-item-time">{response.responseTime}ms</div>
                  )}

                  {!isFallbackMode && !isRaceMode && isSelected && (
                    <div className="rpc-indicator-item-badge">{t("rpcIndicator.selected")}</div>
                  )}

                  {isRaceWinner && (
                    <div className="rpc-indicator-item-badge">{t("rpcIndicator.winner")}</div>
                  )}
                </div>
              );
            })}
          </div>

          {isFallbackMode && (
            <div className="rpc-indicator-footer">
              <span className="rpc-indicator-footer-note">{t("rpcIndicator.fallbackNote")}</span>
            </div>
          )}

          {isRaceMode && (
            <div className="rpc-indicator-footer">
              <span className="rpc-indicator-footer-note">{t("rpcIndicator.raceNote")}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Truncate URL to show hostname only
 */
function truncateUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    if (hostname.length > 30) {
      return `${hostname.slice(0, 15)}...${hostname.slice(-12)}`;
    }
    return hostname;
  } catch {
    return url.length > 30 ? `${url.slice(0, 15)}...${url.slice(-12)}` : url;
  }
}

export default RPCIndicator;
