import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { EthLog } from "@openscan/network-connectors";
import type { ContractInfo } from "../../../../../utils/contractLookup";
import {
  type DecodedEvent,
  decodeEventLog,
  formatDecodedValue,
  getEventTypeColor,
} from "../../../../../utils/eventDecoder";
import { decodeEventWithAbi } from "../../../../../utils/inputDecoder";
import LongString from "../../../../common/LongString";

const EventLogsTab: React.FC<{
  logs: EthLog[];
  networkId: string;
  txToAddress?: string;
  // biome-ignore lint/suspicious/noExplicitAny: ABI types are dynamic
  contractAbi?: any[];
  contracts: Record<string, ContractInfo>;
}> = ({ logs, networkId, txToAddress, contractAbi, contracts }) => {
  const { t } = useTranslation("transaction");
  const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set());

  const expandAll = () => setExpandedSet(new Set(logs.map((_, i) => i)));
  const collapseAll = () => setExpandedSet(new Set());

  const toggleLog = (idx: number) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="analyser-tab-content">
      <div className="analyser-summary">
        <span>
          {logs.length} {t("analyser.events").toLowerCase()}
        </span>
        <span className="analyser-expand-controls">
          <button type="button" className="analyser-expand-btn" onClick={expandAll}>
            {t("analyser.expandAll")}
          </button>
          <button type="button" className="analyser-expand-btn" onClick={collapseAll}>
            {t("analyser.collapseAll")}
          </button>
        </span>
      </div>
      <div className="tx-logs">
        {logs.map((log, index) => {
          let decoded: DecodedEvent | null = null;
          let abiDecoded: ReturnType<typeof decodeEventWithAbi> = null;

          // Try enriched ABI first (from call tree enrichment)
          const enrichedContract = log.address ? contracts[log.address.toLowerCase()] : undefined;

          if (enrichedContract?.abi && log.topics) {
            abiDecoded = decodeEventWithAbi(log.topics, log.data || "0x", enrichedContract.abi);
          }

          // Try tx recipient ABI
          if (
            !abiDecoded &&
            txToAddress &&
            log.address?.toLowerCase() === txToAddress.toLowerCase() &&
            contractAbi &&
            log.topics
          ) {
            abiDecoded = decodeEventWithAbi(log.topics, log.data || "0x", contractAbi);
          }

          // Fallback to standard event lookup
          if (!abiDecoded && log.topics) {
            decoded = decodeEventLog(log.topics, log.data || "0x");
          }

          const hasDecoded = abiDecoded || decoded;
          const displayName = abiDecoded?.functionName || decoded?.name;
          const displaySignature = abiDecoded?.signature || decoded?.fullSignature;
          const displayParams = abiDecoded?.params || decoded?.params || [];

          const isExpanded = expandedSet.has(index);

          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: log index is stable
            <div key={index} className="tx-log">
              {/* biome-ignore lint/a11y/noStaticElementInteractions: collapsible header */}
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: collapsible header */}
              <div className="tx-log-header tx-log-header--toggle" onClick={() => toggleLog(index)}>
                <span className="call-tree-toggle">{isExpanded ? "▾" : "▸"}</span>
                <span className="tx-log-index">{index}</span>
                {hasDecoded && (
                  <div>
                    <span
                      className="tx-event-badge"
                      style={
                        {
                          "--event-color": abiDecoded
                            ? "#10b981"
                            : getEventTypeColor(decoded?.type || ""),
                        } as React.CSSProperties
                      }
                    >
                      {displayName}
                    </span>
                    <span
                      className="tx-event-signature"
                      title={decoded?.description || displaySignature}
                    >
                      {displaySignature}
                    </span>
                  </div>
                )}
                <span className="tx-log-header-address tx-mono">
                  <Link
                    to={`/${networkId}/address/${log.address}`}
                    className="link-accent"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {enrichedContract?.name ?? log.address}
                  </Link>
                </span>
              </div>

              {isExpanded && (
                <div className="tx-log-content">
                  <div className="tx-log-row">
                    <span className="tx-log-label">{t("logsAddress")}</span>
                    <span className="tx-log-value tx-mono">
                      <Link to={`/${networkId}/address/${log.address}`} className="link-accent">
                        {enrichedContract?.name ? (
                          <>
                            {enrichedContract.name}{" "}
                            <span className="tx-log-address-hex">
                              (<LongString value={log.address} start={6} end={4} />)
                            </span>
                          </>
                        ) : (
                          log.address
                        )}
                      </Link>
                    </span>
                  </div>

                  {displayParams.length > 0 && (
                    <div className="tx-log-row tx-log-params">
                      <span className="tx-log-label">{t("logsDecoded")}</span>
                      <div className="tx-log-value">
                        {displayParams.map((param, i) => (
                          // biome-ignore lint/suspicious/noArrayIndexKey: param index is stable
                          <div key={i} className="tx-decoded-param">
                            <span className="tx-param-name">{param.name}</span>
                            <span className="tx-param-type">({param.type})</span>
                            <span
                              className={`tx-param-value ${param.type === "address" ? "tx-mono" : ""}`}
                            >
                              {param.type === "address" ? (
                                <Link
                                  to={`/${networkId}/address/${param.value}`}
                                  className="link-accent"
                                >
                                  {param.value}
                                </Link>
                              ) : (
                                formatDecodedValue(param.value, param.type)
                              )}
                            </span>
                            {param.indexed && (
                              <span className="tx-param-indexed">{t("logsIndexed")}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {log.topics && log.topics.length > 0 && (
                    <div className="tx-log-row tx-log-topics">
                      <span className="tx-log-label">
                        {hasDecoded ? t("logsRawTopics") : t("logsTopics")}
                      </span>
                      <div className="tx-log-value">
                        {log.topics.map((topic: string, i: number) => (
                          <div key={topic} className="tx-topic">
                            <span className="tx-topic-index">[{i}]</span>
                            <code className="tx-topic-value">{topic}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {log.data && log.data !== "0x" && (
                    <div className="tx-log-row">
                      <span className="tx-log-label">
                        {hasDecoded ? t("logsRawData") : t("logsData")}
                      </span>
                      <div className="tx-log-value">
                        <code className="tx-log-data">{log.data}</code>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EventLogsTab;
