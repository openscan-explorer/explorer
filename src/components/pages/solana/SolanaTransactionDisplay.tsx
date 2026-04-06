import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { SolanaTransaction } from "../../../types";
import {
  formatBlockTime,
  formatSlotNumber,
  formatSol,
  shortenSolanaAddress,
} from "../../../utils/solanaUtils";
import CopyButton from "../../common/CopyButton";

interface SolanaTransactionDisplayProps {
  tx: SolanaTransaction;
  networkId: string;
}

const SolanaTransactionDisplay: React.FC<SolanaTransactionDisplayProps> = React.memo(
  ({ tx, networkId }) => {
    const { t } = useTranslation("solana");
    const [showLogs, setShowLogs] = useState(false);
    const [showInner, setShowInner] = useState(false);

    return (
      <div className="page-with-analysis">
        <div className="block-display-card">
          <div className="block-display-header">
            <div className="block-header-main">
              <div className="block-header-info">
                <span className="block-label">{t("transaction.title")}</span>
              </div>
              <span className="block-header-divider">•</span>
              <span className="block-header-timestamp">
                <span className="block-timestamp-full">{formatBlockTime(tx.blockTime)}</span>
              </span>
            </div>
            <span
              className={`block-status-badge ${
                tx.status === "success" ? "block-status-finalized" : "block-status-failed"
              }`}
            >
              {tx.status === "success" ? t("transactions.success") : t("transactions.failed")}
            </span>
          </div>

          <div className="tx-details">
            {/* Signature */}
            <div className="tx-row">
              <span className="tx-label">{t("transaction.signature")}:</span>
              <span
                className="tx-value tx-mono"
                style={{ display: "inline-flex", alignItems: "center" }}
              >
                {tx.signature}
                <CopyButton value={tx.signature} />
              </span>
            </div>

            {/* Slot */}
            <div className="tx-row">
              <span className="tx-label">{t("transaction.slot")}:</span>
              <span className="tx-value">
                <Link to={`/${networkId}/slot/${tx.slot}`} className="link-accent tx-mono">
                  #{formatSlotNumber(tx.slot)}
                </Link>
              </span>
            </div>

            {/* Fee */}
            <div className="tx-row">
              <span className="tx-label">{t("transaction.fee")}:</span>
              <span className="tx-value tx-value-highlight">{formatSol(tx.fee)}</span>
            </div>

            {/* Compute units */}
            {tx.computeUnitsConsumed !== undefined && (
              <div className="tx-row">
                <span className="tx-label">{t("transaction.computeUnits")}:</span>
                <span className="tx-value">{tx.computeUnitsConsumed.toLocaleString()}</span>
              </div>
            )}

            {/* Version */}
            {tx.version !== undefined && (
              <div className="tx-row">
                <span className="tx-label">{t("transaction.version")}:</span>
                <span className="tx-value">{String(tx.version)}</span>
              </div>
            )}
          </div>

          {/* Account Keys */}
          {tx.accountKeys.length > 0 && (
            <div className="block-display-section">
              <h3 className="block-display-section-title">
                {t("transaction.accountKeys")} ({tx.accountKeys.length})
              </h3>
              <div className="table-wrapper">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Pubkey</th>
                      <th>{t("transaction.signer")}</th>
                      <th>{t("transaction.writable")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tx.accountKeys.map((key, idx) => (
                      <tr key={key.pubkey}>
                        <td className="table-cell-muted">{idx}</td>
                        <td className="table-cell-mono">
                          <Link
                            to={`/${networkId}/account/${key.pubkey}`}
                            className="table-cell-address"
                            title={key.pubkey}
                          >
                            {shortenSolanaAddress(key.pubkey, 8, 8)}
                          </Link>
                        </td>
                        <td className="table-cell-text">{key.signer ? "✓" : "—"}</td>
                        <td className="table-cell-text">{key.writable ? "✓" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Instructions */}
          {tx.instructions.length > 0 && (
            <div className="block-display-section">
              <h3 className="block-display-section-title">
                {t("transaction.instructions")} ({tx.instructions.length})
              </h3>
              <div className="instructions-list">
                {tx.instructions.map((ix, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: instructions are ordered
                  <div key={i} className="instruction-card">
                    <div className="tx-row">
                      <span className="tx-label">{t("transaction.programId")}:</span>
                      <span className="tx-value tx-mono">
                        <Link
                          to={`/${networkId}/account/${ix.programId}`}
                          className="link-accent tx-mono"
                          title={ix.programId}
                        >
                          {shortenSolanaAddress(ix.programId, 10, 10)}
                        </Link>
                      </span>
                    </div>
                    {ix.accounts.length > 0 && (
                      <div className="tx-row">
                        <span className="tx-label">{t("transaction.accounts")}:</span>
                        <span className="tx-value tx-mono">
                          {ix.accounts.length} account{ix.accounts.length === 1 ? "" : "s"}
                        </span>
                      </div>
                    )}
                    {ix.data && (
                      <div className="tx-row">
                        <span className="tx-label">{t("transaction.data")}:</span>
                        <span className="tx-value tx-mono tx-value-truncate" title={ix.data}>
                          {ix.data.length > 80 ? `${ix.data.slice(0, 80)}…` : ix.data}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inner Instructions */}
          {tx.innerInstructions.length > 0 && (
            <div className="block-display-section">
              <button
                type="button"
                className="block-display-section-toggle"
                onClick={() => setShowInner((v) => !v)}
              >
                <h3 className="block-display-section-title">
                  {t("transaction.innerInstructions")} ({tx.innerInstructions.length})
                </h3>
                <span className="block-display-section-toggle-icon">{showInner ? "−" : "+"}</span>
              </button>
              {showInner && (
                <div className="instructions-list">
                  {tx.innerInstructions.map((group) => (
                    <div key={group.index} className="instruction-card">
                      <div className="tx-row">
                        <span className="tx-label">Index:</span>
                        <span className="tx-value">{group.index}</span>
                      </div>
                      {group.instructions.map((ix, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: instructions are ordered
                        <div key={i} className="tx-row">
                          <span className="tx-label">{t("transaction.programId")}:</span>
                          <span className="tx-value tx-mono">
                            {shortenSolanaAddress(ix.programId, 8, 8)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Logs */}
          {tx.logMessages.length > 0 && (
            <div className="block-display-section">
              <button
                type="button"
                className="block-display-section-toggle"
                onClick={() => setShowLogs((v) => !v)}
              >
                <h3 className="block-display-section-title">
                  {t("transaction.logs")} ({tx.logMessages.length})
                </h3>
                <span className="block-display-section-toggle-icon">{showLogs ? "−" : "+"}</span>
              </button>
              {showLogs && <pre className="log-output tx-mono">{tx.logMessages.join("\n")}</pre>}
            </div>
          )}
        </div>
      </div>
    );
  },
);

SolanaTransactionDisplay.displayName = "SolanaTransactionDisplay";

export default SolanaTransactionDisplay;
