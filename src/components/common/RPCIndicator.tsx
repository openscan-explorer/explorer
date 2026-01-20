import { useEffect, useRef, useState } from "react";
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

  const successCount = metadata.responses.filter((r) => r.status === "success").length;
  const totalCount = metadata.responses.length;
  const isFallbackMode = metadata.strategy === "fallback";

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
        title="Click to see RPC provider details"
      >
        {metadata.hasInconsistencies && (
          <span className="rpc-indicator-warning" title="Inconsistent responses">
            !!!
          </span>
        )}
        <span className="rpc-indicator-status">
          {isFallbackMode ? (
            // Fallback: show attempt ratio (1/N means succeeded on Nth attempt)
            `✓ 1/${totalCount}`
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
            <strong>RPC Providers</strong>
            <span className="rpc-indicator-strategy">Strategy: {metadata.strategy}</span>
          </div>

          {isFallbackMode && totalCount > 1 && (
            <div className="rpc-indicator-fallback-info">Succeeded on attempt #{totalCount}</div>
          )}

          {metadata.hasInconsistencies && (
            <div className="rpc-indicator-warning-banner">Responses differ between providers</div>
          )}

          <div className="rpc-indicator-list">
            {metadata.responses.map((response, idx) => {
              const isSelected = selectedProvider === response.url;
              const urlDisplay = truncateUrl(response.url);
              const isClickable = !isFallbackMode && response.status === "success";

              return (
                // biome-ignore lint/a11y/noStaticElementInteractions: <TODO>
                // biome-ignore lint/a11y/useKeyWithClickEvents: <TODO>
                <div
                  key={response.url}
                  className={`rpc-indicator-item ${isSelected ? "selected" : ""} ${response.status} ${isFallbackMode ? "fallback-mode" : ""}`}
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

                  {!isFallbackMode && isSelected && (
                    <div className="rpc-indicator-item-badge">Selected</div>
                  )}
                </div>
              );
            })}
          </div>

          {isFallbackMode && (
            <div className="rpc-indicator-footer">
              <span className="rpc-indicator-footer-note">
                Fallback mode: providers tried sequentially
              </span>
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
