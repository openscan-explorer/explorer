import type React from "react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { CallNode } from "../../../../../services/adapters/NetworkAdapter";
import { hexToGas } from "../../../../../utils/callTreeUtils";
import type { ContractInfo } from "../../../../../utils/contractLookup";
import { decodeFunctionCall } from "../../../../../utils/inputDecoder";
import { CALL_TYPE_COLORS } from "./types";

function getFlameColor(node: CallNode): string {
  if (node.error) return "#ef4444";
  const typeColor = CALL_TYPE_COLORS[node.type];
  if (typeColor) return typeColor;
  // hash-based fallback
  const addr = node.to ?? node.from;
  let h = 0;
  for (let i = 0; i < addr.length; i++) h = (h * 31 + addr.charCodeAt(i)) & 0xffffff;
  return `hsl(${h % 360}, 55%, 50%)`;
}

function getFlameLabel(node: CallNode, contracts: Record<string, ContractInfo>): string {
  const contractInfo = node.to ? contracts[node.to.toLowerCase()] : undefined;
  const target = contractInfo?.name ?? (node.to ? `${node.to.slice(0, 10)}…` : node.type);

  // Try full ABI decode first
  if (node.input && node.input.length >= 10 && node.input !== "0x" && contractInfo?.abi) {
    const decoded = decodeFunctionCall(node.input, contractInfo.abi);
    if (decoded) return `${target}.${decoded.functionName}()`;
  }

  // Fallback: show 4-byte selector if present
  if (node.input && node.input.length >= 10 && node.input !== "0x") {
    return `${target}.${node.input.slice(0, 10)}()`;
  }

  // No input data (plain ETH transfer or CREATE)
  if (node.type === "CREATE" || node.type === "CREATE2") return `${target} [${node.type}]`;
  return `${target} [${node.type}]`;
}

interface BreakdownEntry {
  label: string;
  gas: number;
  pct: number;
  color: string;
  type: string;
  to?: string;
}

function getChildBreakdown(
  node: CallNode,
  parentGas: number,
  contracts: Record<string, ContractInfo>,
): BreakdownEntry[] {
  if (!node.calls?.length) return [];
  const entries: BreakdownEntry[] = node.calls.map((child) => {
    const gas = hexToGas(child.gasUsed) ?? 0;
    return {
      label: getFlameLabel(child, contracts),
      gas,
      pct: parentGas > 0 ? (gas / parentGas) * 100 : 0,
      color: getFlameColor(child),
      type: child.type,
      to: child.to,
    };
  });
  const childSum = entries.reduce((s, e) => s + e.gas, 0);
  const selfGas = parentGas - childSum;
  if (selfGas > 0) {
    entries.unshift({
      label: "self",
      gas: selfGas,
      pct: (selfGas / parentGas) * 100,
      color: "var(--text-tertiary)",
      type: "self",
    });
  }
  return entries.sort((a, b) => b.gas - a.gas);
}

const FlameRow: React.FC<{
  node: CallNode;
  totalGas: number;
  contracts: Record<string, ContractInfo>;
  networkId: string;
  selected: CallNode | null;
  onSelect: (node: CallNode) => void;
}> = ({ node, totalGas, contracts, networkId, selected, onSelect }) => {
  const gas = hexToGas(node.gasUsed) ?? 0;
  const widthPct = totalGas > 0 ? (gas / totalGas) * 100 : 0;
  if (widthPct < 0.3) return null;

  const color = getFlameColor(node);
  const label = getFlameLabel(node, contracts);
  const isSelected = selected === node;

  return (
    <div className="flame-row" style={{ width: `${widthPct}%` }}>
      <button
        type="button"
        className={`flame-bar${node.error ? " flame-bar--error" : ""}${isSelected ? " flame-bar--selected" : ""}`}
        style={{ backgroundColor: color }}
        onClick={() => onSelect(node)}
        title={`${label} — ${gas.toLocaleString()} gas (${widthPct.toFixed(1)}%)`}
      >
        <span className="flame-bar-label">{label}</span>
        <span className="flame-bar-gas">{gas.toLocaleString()}</span>
      </button>
      {node.calls && node.calls.length > 0 && (
        <div className="flame-children">
          {node.calls.map((child, i) => (
            <FlameRow
              key={`${i}-${child.type}-${child.to ?? child.from}`}
              node={child}
              totalGas={totalGas}
              contracts={contracts}
              networkId={networkId}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const GasProfilerTab: React.FC<{
  root: CallNode;
  networkId: string;
  contracts: Record<string, ContractInfo>;
}> = ({ root, networkId, contracts }) => {
  const { t } = useTranslation("transaction");
  const [zoomNode, setZoomNode] = useState<CallNode>(root);
  const [selected, setSelected] = useState<CallNode | null>(null);

  const zoomGas = hexToGas(zoomNode.gasUsed) ?? 1;
  const totalGas = hexToGas(root.gasUsed) ?? 1;
  const isZoomed = zoomNode !== root;

  const handleSelect = useCallback((node: CallNode) => {
    setSelected(node);
    setZoomNode(node);
  }, []);

  const resetZoom = useCallback(() => {
    setZoomNode(root);
    setSelected(null);
  }, [root]);

  const breakdown = selected
    ? getChildBreakdown(selected, hexToGas(selected.gasUsed) ?? 1, contracts)
    : [];

  return (
    <div className="analyser-tab-content">
      <div className="analyser-summary">
        <span>{t("analyser.summaryGas", { gas: totalGas.toLocaleString() })}</span>
        {isZoomed && (
          <button type="button" className="gas-profiler-reset" onClick={resetZoom}>
            {t("analyser.gasResetView")}
          </button>
        )}
      </div>
      {/* Flame chart */}
      <div className="gas-profiler-flame">
        <FlameRow
          node={zoomNode}
          totalGas={zoomGas}
          contracts={contracts}
          networkId={networkId}
          selected={selected}
          onSelect={handleSelect}
        />
      </div>
      {/* Breakdown panel */}
      {selected && breakdown.length > 0 && (
        <div className="gas-profiler-breakdown">
          <div className="gas-profiler-breakdown-header">
            <span className="gas-profiler-breakdown-title">
              {t("analyser.gasBreakdownTitle")}:{" "}
              <strong>{getFlameLabel(selected, contracts)}</strong>
            </span>
            <span className="gas-profiler-breakdown-gas">
              {(hexToGas(selected.gasUsed) ?? 0).toLocaleString()} gas
            </span>
          </div>
          <div className="gas-profiler-breakdown-list">
            {breakdown.map((entry, i) => (
              <div key={`${i}-${entry.label}`} className="gas-profiler-breakdown-row">
                <span
                  className="gas-profiler-breakdown-swatch"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="gas-profiler-breakdown-label">
                  {entry.to ? (
                    <Link to={`/${networkId}/address/${entry.to}`} className="call-tree-address">
                      {entry.label}
                    </Link>
                  ) : (
                    entry.label
                  )}
                </span>
                <span className="gas-profiler-breakdown-pct">{entry.pct.toFixed(1)}%</span>
                <span className="gas-profiler-breakdown-value">
                  {entry.gas.toLocaleString()} gas
                </span>
                <span className="gas-profiler-breakdown-bar-bg">
                  <span
                    className="gas-profiler-breakdown-bar-fill"
                    style={{ width: `${entry.pct}%`, backgroundColor: entry.color }}
                  />
                </span>
              </div>
            ))}
          </div>
          <div className="gas-profiler-breakdown-hint">{t("analyser.gasBreakdownHint")}</div>
        </div>
      )}
    </div>
  );
};

export default GasProfilerTab;
