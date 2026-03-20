import type React from "react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TraceLog, TraceResult } from "../../../../../services/adapters/NetworkAdapter";

const OPCODES_PER_PAGE = 200;

const OPCODE_COLORS: Record<string, string> = {
  CALL: "#3b82f6",
  STATICCALL: "#8b5cf6",
  DELEGATECALL: "#f97316",
  CREATE: "#10b981",
  CREATE2: "#10b981",
  RETURN: "#6b7280",
  REVERT: "#ef4444",
  STOP: "#6b7280",
  SSTORE: "#eab308",
  SLOAD: "#06b6d4",
  LOG0: "#a855f7",
  LOG1: "#a855f7",
  LOG2: "#a855f7",
  LOG3: "#a855f7",
  LOG4: "#a855f7",
};

function getOpcodeColor(op: string): string | undefined {
  return OPCODE_COLORS[op];
}

const RawTraceTab: React.FC<{
  trace: TraceResult;
}> = ({ trace }) => {
  const { t } = useTranslation("transaction");
  const [page, setPage] = useState(0);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const totalSteps = trace.structLogs.length;
  const totalPages = Math.ceil(totalSteps / OPCODES_PER_PAGE);
  const currentLogs = useMemo(
    () => trace.structLogs.slice(page * OPCODES_PER_PAGE, (page + 1) * OPCODES_PER_PAGE),
    [trace.structLogs, page],
  );
  const startIndex = page * OPCODES_PER_PAGE;

  const toggleStep = (index: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const renderStackItem = (item: string, i: number) => (
    <div key={i} className="raw-trace-stack-item">
      <span className="raw-trace-stack-index">{i}</span>
      <span className="raw-trace-stack-value tx-mono">{item}</span>
    </div>
  );

  const renderLogRow = (log: TraceLog, globalIndex: number) => {
    const isExpanded = expandedSteps.has(globalIndex);
    const color = getOpcodeColor(log.op);

    return (
      <div key={globalIndex} className="raw-trace-row">
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: clickable row */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: clickable row */}
        <div className="raw-trace-row-summary" onClick={() => toggleStep(globalIndex)}>
          <span className="raw-trace-step">{globalIndex}</span>
          <span className="raw-trace-pc">{log.pc}</span>
          <span className="raw-trace-op" style={color ? { color } : undefined}>
            {log.op}
          </span>
          <span className="raw-trace-gas">{log.gas.toLocaleString()}</span>
          <span className="raw-trace-gas-cost">{log.gasCost.toLocaleString()}</span>
          <span className="raw-trace-depth">{log.depth}</span>
          <span className="raw-trace-expand">{isExpanded ? "▾" : "▸"}</span>
        </div>

        {isExpanded && (
          <div className="raw-trace-row-detail">
            {log.stack && log.stack.length > 0 && (
              <div className="raw-trace-section">
                <div className="raw-trace-section-title">Stack ({log.stack.length})</div>
                <div className="raw-trace-stack">
                  {[...log.stack].reverse().map((item, i) => renderStackItem(item, i))}
                </div>
              </div>
            )}
            {log.storage && Object.keys(log.storage).length > 0 && (
              <div className="raw-trace-section">
                <div className="raw-trace-section-title">Storage</div>
                <div className="raw-trace-storage">
                  {Object.entries(log.storage).map(([slot, value]) => (
                    <div key={slot} className="raw-trace-storage-item">
                      <span className="raw-trace-storage-slot tx-mono">{slot}</span>
                      <span className="raw-trace-storage-arrow">→</span>
                      <span className="raw-trace-storage-value tx-mono">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="analyser-tab-content">
      <div className="analyser-summary">
        <span>
          {t("analyser.rawTraceSteps", { count: totalSteps })} — Gas: {trace.gas.toLocaleString()}
          {trace.failed && <span className="raw-trace-failed"> (REVERTED)</span>}
        </span>
      </div>

      <div className="raw-trace-header">
        <span className="raw-trace-step">Step</span>
        <span className="raw-trace-pc">PC</span>
        <span className="raw-trace-op">Opcode</span>
        <span className="raw-trace-gas">Gas</span>
        <span className="raw-trace-gas-cost">Cost</span>
        <span className="raw-trace-depth">Depth</span>
        <span className="raw-trace-expand" />
      </div>

      <div className="raw-trace-body">
        {currentLogs.map((log, i) => renderLogRow(log, startIndex + i))}
      </div>

      {totalPages > 1 && (
        <div className="raw-trace-pagination">
          <button
            type="button"
            className="raw-trace-page-btn"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            ← {t("analyser.rawTracePrev")}
          </button>
          <span className="raw-trace-page-info">
            {t("analyser.rawTracePage", {
              current: page + 1,
              total: totalPages,
              from: (startIndex + 1).toLocaleString(),
              to: Math.min(startIndex + OPCODES_PER_PAGE, totalSteps).toLocaleString(),
              totalSteps: totalSteps.toLocaleString(),
            })}
          </span>
          <button
            type="button"
            className="raw-trace-page-btn"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("analyser.rawTraceNext")} →
          </button>
        </div>
      )}
    </div>
  );
};

export default RawTraceTab;
