import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { DataService } from "../../../../services/DataService";
import type {
  CallNode,
  PrestateAccountState,
  PrestateTrace,
} from "../../../../services/adapters/NetworkAdapter";
import { useCallTreeEnrichment } from "../../../../hooks/useCallTreeEnrichment";
import { countByType, countCalls, countReverts, hexToGas } from "../../../../utils/callTreeUtils";
import type { ContractInfo } from "../../../../utils/contractLookup";
import { decodeFunctionCall } from "../../../../utils/inputDecoder";
import { formatNativeFromWei } from "../../../../utils/unitFormatters";
import { logger } from "../../../../utils/logger";
import LongString from "../../../common/LongString";

interface TxAnalyserProps {
  txHash: string;
  networkId: string;
  networkCurrency: string;
  dataService: DataService;
}

type AnalyserTab = "callTree" | "stateChanges";

// ─── Call type color mapping ───────────────────────────────────────────────

const CALL_TYPE_COLORS: Record<string, string> = {
  CALL: "#3b82f6",
  DELEGATECALL: "#f97316",
  STATICCALL: "#8b5cf6",
  CREATE: "#10b981",
  CREATE2: "#10b981",
  SELFDESTRUCT: "#ef4444",
};

function getCallTypeColor(type: string): string {
  return CALL_TYPE_COLORS[type.toUpperCase()] ?? "#6b7280";
}

/** Truncate a decoded param value for inline display */
function truncateParamValue(value: string, max = 20): string {
  if (!value) return "";
  const str = String(value);
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

// ─── Call Tree Node ────────────────────────────────────────────────────────

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

  // Contract info for the target address
  const contractInfo = node.to ? contracts[node.to.toLowerCase()] : undefined;

  // Decode the function call if we have an ABI
  const decoded =
    node.input && node.input !== "0x" && contractInfo?.abi
      ? decodeFunctionCall(node.input, contractInfo.abi)
      : null;

  const addressLink = (addr: string | undefined, name?: string) => {
    if (!addr) return null;
    return (
      <Link
        to={`/address/${addr}?network=${networkId}`}
        className="call-tree-address"
        onClick={(e) => e.stopPropagation()}
      >
        {name ? (
          <span className="call-tree-contract-name">{name}</span>
        ) : (
          <LongString value={addr} start={6} end={4} />
        )}
      </Link>
    );
  };

  return (
    <div className={`call-tree-node${isError ? " call-tree-node--error" : ""}`}>
      {/* Node header */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: call tree expand/collapse via click */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: call tree expand/collapse via click */}
      <div
        className="call-tree-node-header"
        onClick={() => hasChildren && setExpanded((e) => !e)}
        style={{ cursor: hasChildren ? "pointer" : "default" }}
      >
        {/* Expand toggle */}
        <span className="call-tree-toggle">{hasChildren ? (expanded ? "▾" : "▸") : "·"}</span>

        {/* Call type badge */}
        <span
          className="call-tree-type-badge"
          style={{ background: `${color}22`, color, borderColor: `${color}66` }}
        >
          {node.type}
        </span>

        {/* From → To (with contract names) */}
        <span className="call-tree-addresses">
          {addressLink(node.from, contracts[node.from?.toLowerCase() ?? ""]?.name)}
          {node.to && (
            <>
              <span className="call-tree-arrow">→</span>
              {addressLink(node.to, contractInfo?.name)}
            </>
          )}
        </span>

        {/* Decoded function call */}
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

        {/* Value */}
        {formattedValue && <span className="call-tree-value">{formattedValue}</span>}

        {/* Gas used */}
        {gasUsed !== undefined && (
          <span className="call-tree-gas">{gasUsed.toLocaleString()} gas</span>
        )}

        {/* Error badge */}
        {isError && <span className="call-tree-error-badge">{node.error}</span>}
      </div>

      {/* Children */}
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

// ─── Call Tree Tab ─────────────────────────────────────────────────────────

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
      {/* Summary bar */}
      <div className="analyser-summary">
        {gasUsed !== undefined && (
          <span>{t("analyser.summaryGas", { gas: gasUsed.toLocaleString() })}</span>
        )}
        <span>{t("analyser.summaryCalls", { calls: totalCalls })}</span>
        {/* Per-type breakdown */}
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
      {/* Tree */}
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

// ─── State Changes Tab ─────────────────────────────────────────────────────

function formatHexBalance(hex: string | undefined): string {
  if (!hex) return "—";
  try {
    const bn = BigInt(hex);
    const eth = Number(bn) / 1e18;
    return eth.toFixed(6);
  } catch {
    return hex;
  }
}

function balanceDiff(pre?: string, post?: string): string | null {
  if (pre === undefined && post === undefined) return null;
  if (pre === post) return null;
  try {
    const preBn = BigInt(pre ?? "0x0");
    const postBn = BigInt(post ?? "0x0");
    const diff = postBn - preBn;
    const sign = diff >= 0n ? "+" : "";
    const eth = Number(diff) / 1e18;
    return `${sign}${eth.toFixed(6)}`;
  } catch {
    return null;
  }
}

const StateChangesTab: React.FC<{
  trace: PrestateTrace;
  networkId: string;
  networkCurrency: string;
  contracts: Record<string, ContractInfo>;
}> = ({ trace, networkId, networkCurrency, contracts }) => {
  const { t } = useTranslation("transaction");

  const allAddresses = Array.from(new Set([...Object.keys(trace.pre), ...Object.keys(trace.post)]));

  if (allAddresses.length === 0) {
    return (
      <div className="analyser-tab-content">
        <div className="analyser-empty">{t("analyser.noChanges")}</div>
      </div>
    );
  }

  return (
    <div className="analyser-tab-content">
      {allAddresses.map((address) => {
        const pre: PrestateAccountState = trace.pre[address] ?? {};
        const post: PrestateAccountState = trace.post[address] ?? {};

        const balDiff = balanceDiff(pre.balance, post.balance);
        const nonceDiff =
          pre.nonce !== post.nonce && (pre.nonce !== undefined || post.nonce !== undefined);
        const storageKeys = Array.from(
          new Set([...Object.keys(pre.storage ?? {}), ...Object.keys(post.storage ?? {})]),
        ).filter((k) => pre.storage?.[k] !== post.storage?.[k]);
        const codeChanged = pre.code !== post.code;

        if (!balDiff && !nonceDiff && storageKeys.length === 0 && !codeChanged) return null;

        const contractName = contracts[address.toLowerCase()]?.name;

        return (
          <div key={address} className="state-change-block">
            <div className="state-change-address">
              <Link to={`/address/${address}?network=${networkId}`} className="call-tree-address">
                {contractName ? (
                  <>
                    <span className="call-tree-contract-name">{contractName}</span>
                    <span className="state-change-addr-sub">
                      <LongString value={address} start={6} end={4} />
                    </span>
                  </>
                ) : (
                  <LongString value={address} start={10} end={8} />
                )}
              </Link>
            </div>

            <div className="state-change-rows">
              {/* Balance */}
              {balDiff && (
                <div className="state-change-row">
                  <span className="state-change-label">
                    {t("analyser.balanceChange")} ({networkCurrency})
                  </span>
                  <span className="state-change-before">{formatHexBalance(pre.balance)}</span>
                  <span className="state-change-arrow">→</span>
                  <span className="state-change-after">{formatHexBalance(post.balance)}</span>
                  <span
                    className={`state-change-diff ${balDiff.startsWith("+") ? "state-change-diff--positive" : "state-change-diff--negative"}`}
                  >
                    {balDiff}
                  </span>
                </div>
              )}

              {/* Nonce */}
              {nonceDiff && (
                <div className="state-change-row">
                  <span className="state-change-label">{t("analyser.nonceChange")}</span>
                  <span className="state-change-before">{pre.nonce ?? "—"}</span>
                  <span className="state-change-arrow">→</span>
                  <span className="state-change-after">{post.nonce ?? "—"}</span>
                  <span className="state-change-diff state-change-diff--positive">
                    +{(post.nonce ?? 0) - (pre.nonce ?? 0)}
                  </span>
                </div>
              )}

              {/* Code */}
              {codeChanged && (
                <div className="state-change-row">
                  <span className="state-change-label">{t("analyser.codeDeployed")}</span>
                  <span className="state-change-after state-change-code">
                    {post.code ? `${post.code.slice(0, 20)}…` : "—"}
                  </span>
                </div>
              )}

              {/* Storage */}
              {storageKeys.map((slot) => (
                <div key={slot} className="state-change-row state-change-row--storage">
                  <span className="state-change-label">{t("analyser.storageChange")}</span>
                  <span className="state-change-slot">
                    <LongString value={slot} start={8} end={6} />
                  </span>
                  <span className="state-change-before">
                    <LongString value={pre.storage?.[slot] ?? "0x0"} start={8} end={6} />
                  </span>
                  <span className="state-change-arrow">→</span>
                  <span className="state-change-after">
                    <LongString value={post.storage?.[slot] ?? "0x0"} start={8} end={6} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Main TxAnalyser ───────────────────────────────────────────────────────

const TxAnalyser: React.FC<TxAnalyserProps> = ({
  txHash,
  networkId,
  networkCurrency,
  dataService,
}) => {
  const { t } = useTranslation("transaction");
  const [activeTab, setActiveTab] = useState<AnalyserTab>("callTree");

  const [callTree, setCallTree] = useState<CallNode | null>(null);
  const [prestateTrace, setPrestateTrace] = useState<PrestateTrace | null>(null);
  const [loadingCallTree, setLoadingCallTree] = useState(false);
  const [loadingPrestate, setLoadingPrestate] = useState(false);
  const [callTreeError, setCallTreeError] = useState<string | null>(null);
  const [prestateError, setPrestateError] = useState<string | null>(null);

  // Contract name + ABI enrichment for the call tree
  const { contracts, enrichmentLoading } = useCallTreeEnrichment(callTree, networkId);

  const isUnsupported = useCallback((msg: string) => {
    return /method not found|not supported|unsupported|does not exist/i.test(msg);
  }, []);

  // Load call tree on first render
  useEffect(() => {
    if (callTree || callTreeError || loadingCallTree) return;
    setLoadingCallTree(true);
    dataService.networkAdapter
      .getAnalyserCallTrace(txHash)
      .then((data) => {
        if (data) {
          setCallTree(data);
        } else {
          setCallTreeError(t("analyser.notSupported"));
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn("TX Analyser call trace error:", msg);
        setCallTreeError(
          isUnsupported(msg) ? t("analyser.notSupported") : `${t("analyser.error")}: ${msg}`,
        );
      })
      .finally(() => setLoadingCallTree(false));
  }, [txHash, dataService, callTree, callTreeError, loadingCallTree, t, isUnsupported]);

  // Load prestate when switching to that tab
  useEffect(() => {
    if (activeTab !== "stateChanges") return;
    if (prestateTrace || prestateError || loadingPrestate) return;
    setLoadingPrestate(true);
    dataService.networkAdapter
      .getAnalyserPrestateTrace(txHash)
      .then((data) => {
        if (data) {
          setPrestateTrace(data);
        } else {
          setPrestateError(t("analyser.notSupported"));
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn("TX Analyser prestate trace error:", msg);
        setPrestateError(
          isUnsupported(msg) ? t("analyser.notSupported") : `${t("analyser.error")}: ${msg}`,
        );
      })
      .finally(() => setLoadingPrestate(false));
  }, [
    activeTab,
    txHash,
    dataService,
    prestateTrace,
    prestateError,
    loadingPrestate,
    t,
    isUnsupported,
  ]);

  return (
    <div className="tx-analyser">
      {/* Tab bar */}
      <div className="tx-analyser-tabs">
        <button
          type="button"
          className={`tx-analyser-tab${activeTab === "callTree" ? " tx-analyser-tab--active" : ""}`}
          onClick={() => setActiveTab("callTree")}
        >
          {t("analyser.callTree")}
        </button>
        <button
          type="button"
          className={`tx-analyser-tab${activeTab === "stateChanges" ? " tx-analyser-tab--active" : ""}`}
          onClick={() => setActiveTab("stateChanges")}
        >
          {t("analyser.stateChanges")}
        </button>
      </div>

      {/* Tab content */}
      <div className="tx-analyser-body">
        {activeTab === "callTree" && (
          <>
            {loadingCallTree && <div className="analyser-loading">{t("analyser.loading")}</div>}
            {callTreeError && (
              <div className="analyser-error">
                <div>{callTreeError}</div>
                {callTreeError === t("analyser.notSupported") && (
                  <div className="analyser-hint">{t("analyser.traceHint")}</div>
                )}
              </div>
            )}
            {callTree && (
              <CallTreeTab
                root={callTree}
                networkId={networkId}
                networkCurrency={networkCurrency}
                contracts={contracts}
                enrichmentLoading={enrichmentLoading}
              />
            )}
          </>
        )}

        {activeTab === "stateChanges" && (
          <>
            {loadingPrestate && <div className="analyser-loading">{t("analyser.loading")}</div>}
            {prestateError && (
              <div className="analyser-error">
                <div>{prestateError}</div>
                {prestateError === t("analyser.notSupported") && (
                  <div className="analyser-hint">{t("analyser.traceHint")}</div>
                )}
              </div>
            )}
            {prestateTrace && (
              <StateChangesTab
                trace={prestateTrace}
                networkId={networkId}
                networkCurrency={networkCurrency}
                contracts={contracts}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TxAnalyser;
