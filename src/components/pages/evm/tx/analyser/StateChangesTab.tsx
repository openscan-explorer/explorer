import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type {
  PrestateAccountState,
  PrestateTrace,
} from "../../../../../services/adapters/NetworkAdapter";
import type { ContractInfo } from "../../../../../utils/contractLookup";
import HelperTooltip from "../../../../common/HelperTooltip";
import { useSettings } from "../../../../../context/SettingsContext";
import LongString from "../../../../common/LongString";

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
  const { t: tTooltips } = useTranslation("tooltips");
  const { settings } = useSettings();
  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set());

  const allAddresses = Array.from(new Set([...Object.keys(trace.pre), ...Object.keys(trace.post)]));

  // Filter to only addresses with actual changes
  const changedAddresses = allAddresses.filter((address) => {
    const pre: PrestateAccountState = trace.pre[address] ?? {};
    const post: PrestateAccountState = trace.post[address] ?? {};
    const balDiff = balanceDiff(pre.balance, post.balance);
    const nonceDiff =
      pre.nonce !== post.nonce && (pre.nonce !== undefined || post.nonce !== undefined);
    const storageKeys = Array.from(
      new Set([...Object.keys(pre.storage ?? {}), ...Object.keys(post.storage ?? {})]),
    ).filter((k) => pre.storage?.[k] !== post.storage?.[k]);
    const codeChanged = pre.code !== post.code;
    return !!(balDiff || nonceDiff || storageKeys.length > 0 || codeChanged);
  });

  if (changedAddresses.length === 0) {
    return (
      <div className="detail-panel-tab-content">
        <div className="detail-panel-empty">{t("analyser.noChanges")}</div>
      </div>
    );
  }

  const toggleAddress = (addr: string) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(addr)) next.delete(addr);
      else next.add(addr);
      return next;
    });
  };

  const expandAll = () => setExpandedSet(new Set(changedAddresses));
  const collapseAll = () => setExpandedSet(new Set());

  return (
    <div className="detail-panel-tab-content">
      <div className="detail-panel-summary">
        <span>
          {changedAddresses.length} {t("analyser.stateChanges").toLowerCase()}
        </span>
        <span className="detail-panel-expand-controls">
          <button type="button" className="detail-panel-expand-btn" onClick={expandAll}>
            {t("analyser.expandAll")}
          </button>
          <button type="button" className="detail-panel-expand-btn" onClick={collapseAll}>
            {t("analyser.collapseAll")}
          </button>
        </span>
      </div>
      {changedAddresses.map((address) => {
        const pre: PrestateAccountState = trace.pre[address] ?? {};
        const post: PrestateAccountState = trace.post[address] ?? {};
        const balDiff = balanceDiff(pre.balance, post.balance);
        const nonceDiff =
          pre.nonce !== post.nonce && (pre.nonce !== undefined || post.nonce !== undefined);
        const storageKeys = Array.from(
          new Set([...Object.keys(pre.storage ?? {}), ...Object.keys(post.storage ?? {})]),
        ).filter((k) => pre.storage?.[k] !== post.storage?.[k]);
        const codeChanged = pre.code !== post.code;
        const contractName = contracts[address.toLowerCase()]?.name;
        const isExpanded = expandedSet.has(address);

        return (
          <div key={address} className="state-change-block">
            {/* biome-ignore lint/a11y/noStaticElementInteractions: collapsible header */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: collapsible header */}
            <div
              className="state-change-address state-change-address--toggle"
              onClick={() => toggleAddress(address)}
            >
              <span className="call-tree-toggle">{isExpanded ? "▾" : "▸"}</span>
              <Link
                to={`/${networkId}/address/${address}`}
                className="call-tree-address"
                onClick={(e) => e.stopPropagation()}
              >
                {contractName ? (
                  <>
                    <span className="call-tree-contract-name">{contractName}</span>
                    <span className="state-change-addr-sub">({address})</span>
                  </>
                ) : (
                  address
                )}
              </Link>
            </div>

            {isExpanded && (
              <div className="state-change-rows">
                {balDiff && (
                  <div className="state-change-row">
                    <span className="state-change-label">
                      {t("analyser.balanceChange")} ({networkCurrency})
                      {settings.showHelperTooltips !== false && (
                        <HelperTooltip content={tTooltips("transaction.balanceChange")} />
                      )}
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

                {nonceDiff && (
                  <div className="state-change-row">
                    <span className="state-change-label">
                      {t("analyser.nonceChange")}
                      {settings.showHelperTooltips !== false && (
                        <HelperTooltip content={tTooltips("transaction.nonceChange")} />
                      )}
                    </span>
                    <span className="state-change-before">{pre.nonce ?? "—"}</span>
                    <span className="state-change-arrow">→</span>
                    <span className="state-change-after">{post.nonce ?? "—"}</span>
                    <span className="state-change-diff state-change-diff--positive">
                      +{(post.nonce ?? 0) - (pre.nonce ?? 0)}
                    </span>
                  </div>
                )}

                {codeChanged && (
                  <div className="state-change-row">
                    <span className="state-change-label">
                      {t("analyser.codeDeployed")}
                      {settings.showHelperTooltips !== false && (
                        <HelperTooltip content={tTooltips("transaction.codeDeployed")} />
                      )}
                    </span>
                    <span className="state-change-after state-change-code">
                      {post.code ? `${post.code.slice(0, 20)}…` : "—"}
                    </span>
                  </div>
                )}

                {storageKeys.map((slot) => (
                  <div key={slot} className="state-change-row state-change-row--storage">
                    <span className="state-change-label">
                      {t("analyser.storageChange")}
                      {settings.showHelperTooltips !== false && (
                        <HelperTooltip content={tTooltips("transaction.storageChange")} />
                      )}
                    </span>
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
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StateChangesTab;
