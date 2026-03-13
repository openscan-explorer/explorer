import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { CallNode } from "../../../../../services/adapters/NetworkAdapter";
import {
  countByType,
  countCalls,
  countReverts,
  hexToGas,
} from "../../../../../utils/callTreeUtils";
import type { ContractInfo } from "../../../../../utils/contractLookup";
import { decodeFunctionCall } from "../../../../../utils/inputDecoder";
import { formatNativeFromWei } from "../../../../../utils/unitFormatters";
import { getCallTypeColor } from "./types";

function truncateParamValue(value: string, max = 20): string {
  if (!value) return "";
  const str = String(value);
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

const CallTreeNode: React.FC<{
  node: CallNode;
  networkId: string;
  networkCurrency: string;
  depth: number;
  defaultExpanded: boolean;
  contracts: Record<string, ContractInfo>;
}> = ({ node, networkId, networkCurrency, depth, defaultExpanded, contracts }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasChildren = node.calls && node.calls.length > 0;
  const isError = !!node.error;
  const color = getCallTypeColor(node.type);

  const formattedValue =
    node.value && node.value !== "0x0" && node.value !== "0x"
      ? formatNativeFromWei(node.value, networkCurrency, 4)
      : null;

  const gasUsed = hexToGas(node.gasUsed);
  const contractInfo = node.to ? contracts[node.to.toLowerCase()] : undefined;

  const decoded =
    node.input && node.input !== "0x" && contractInfo?.abi
      ? decodeFunctionCall(node.input, contractInfo.abi)
      : null;

  const addressLink = (addr: string | undefined, name?: string) => {
    if (!addr) return null;
    return (
      <Link
        to={`/${networkId}/address/${addr}`}
        className="call-tree-address"
        onClick={(e) => e.stopPropagation()}
      >
        {name ? <span className="call-tree-contract-name">{name}</span> : addr}
      </Link>
    );
  };

  return (
    <div className={`call-tree-node${isError ? " call-tree-node--error" : ""}`}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: call tree expand/collapse via click */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: call tree expand/collapse via click */}
      <div
        className="call-tree-node-header"
        onClick={() => hasChildren && setExpanded((e) => !e)}
        style={{ cursor: hasChildren ? "pointer" : "default" }}
      >
        <span className="call-tree-toggle">{hasChildren ? (expanded ? "▾" : "▸") : "·"}</span>
        <span
          className="call-tree-type-badge"
          style={{ background: `${color}22`, color, borderColor: `${color}66` }}
        >
          {node.type}
        </span>
        <span className="call-tree-addresses">
          {addressLink(node.from, contracts[node.from?.toLowerCase() ?? ""]?.name)}
          {node.to && (
            <>
              <span className="call-tree-arrow">→</span>
              {addressLink(node.to, contractInfo?.name)}
            </>
          )}
        </span>
        {decoded && (
          <span className="call-tree-decoded">
            {decoded.functionName}
            {decoded.params.length > 0 && (
              <span className="call-tree-decoded-params">
                ({decoded.params.map((p) => truncateParamValue(p.value, 16)).join(", ")})
              </span>
            )}
          </span>
        )}
        {formattedValue && <span className="call-tree-value">{formattedValue}</span>}
        {gasUsed !== undefined && (
          <span className="call-tree-gas">{gasUsed.toLocaleString()} gas</span>
        )}
        {isError && <span className="call-tree-error-badge">{node.error}</span>}
      </div>
      {expanded && hasChildren && (
        <div className="call-tree-children">
          {node.calls?.map((child, i) => (
            <CallTreeNode
              key={`${i}-${child.type}-${child.from}-${child.to ?? ""}`}
              node={child}
              networkId={networkId}
              networkCurrency={networkCurrency}
              depth={depth + 1}
              defaultExpanded={depth < 2}
              contracts={contracts}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CALL_TYPE_LABELS: Record<string, string> = {
  CALL: "CALL",
  STATICCALL: "STATICCALL",
  DELEGATECALL: "DELEGATECALL",
  CREATE: "CREATE",
  CREATE2: "CREATE2",
  SELFDESTRUCT: "SELFDESTRUCT",
};

const CallTreeTab: React.FC<{
  root: CallNode;
  networkId: string;
  networkCurrency: string;
  contracts: Record<string, ContractInfo>;
  enrichmentLoading: boolean;
}> = ({ root, networkId, networkCurrency, contracts, enrichmentLoading }) => {
  const { t } = useTranslation("transaction");
  const totalCalls = countCalls(root);
  const totalReverts = countReverts(root);
  const gasUsed = hexToGas(root.gasUsed);
  const typeCounts = countByType(root);

  return (
    <div className="analyser-tab-content">
      <div className="analyser-summary">
        {gasUsed !== undefined && (
          <span>{t("analyser.summaryGas", { gas: gasUsed.toLocaleString() })}</span>
        )}
        <span>{t("analyser.summaryCalls", { calls: totalCalls })}</span>
        {Object.entries(typeCounts)
          .filter(([type]) => type !== "CALL" && CALL_TYPE_LABELS[type])
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => (
            <span
              key={type}
              className="analyser-summary-type"
              style={{ color: getCallTypeColor(type) }}
            >
              {count}× {type}
            </span>
          ))}
        {totalReverts > 0 && (
          <span className="analyser-summary-reverts">
            {t("analyser.summaryReverts", { reverts: totalReverts })}
          </span>
        )}
        {enrichmentLoading && (
          <span className="analyser-summary-loading">{t("analyser.enriching")}</span>
        )}
      </div>
      <div className="call-tree-root">
        <CallTreeNode
          node={root}
          networkId={networkId}
          networkCurrency={networkCurrency}
          depth={0}
          defaultExpanded
          contracts={contracts}
        />
      </div>
    </div>
  );
};

export default CallTreeTab;
