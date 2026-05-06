import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { SolanaBlock } from "../../../types";
import {
  formatBlockTime,
  formatSlotNumber,
  formatSol,
  shortenSolanaAddress,
} from "../../../utils/solanaUtils";
import CopyButton from "../../common/CopyButton";

interface SolanaSlotDisplayProps {
  block: SolanaBlock;
  networkId: string;
}

const SolanaSlotDisplay: React.FC<SolanaSlotDisplayProps> = React.memo(({ block, networkId }) => {
  const [showTransactions, setShowTransactions] = useState(false);
  const { t } = useTranslation("solana");

  const totalRewards = block.rewards.reduce((sum, r) => sum + r.lamports, 0);

  return (
    <div className="page-with-analysis">
      <div className="block-display-card">
        <div className="block-display-header">
          <div className="block-header-main">
            {block.slot > 0 && (
              <Link
                to={`/${networkId}/slot/${block.slot - 1}`}
                className="block-nav-btn"
                title="Previous slot"
              >
                ←
              </Link>
            )}
            <div className="block-header-info">
              <span className="block-label">{t("block.title")}</span>
              <span className="block-number">#{formatSlotNumber(block.slot)}</span>
            </div>
            <Link
              to={`/${networkId}/slot/${block.slot + 1}`}
              className="block-nav-btn"
              title="Next slot"
            >
              →
            </Link>
            <span className="block-header-divider">•</span>
            <span className="block-header-timestamp">
              <span className="block-timestamp-full">{formatBlockTime(block.blockTime)}</span>
            </span>
          </div>
        </div>

        <div className="tx-details">
          {/* Block Hash */}
          <div className="tx-row">
            <span className="tx-label">{t("block.blockHash")}:</span>
            <span
              className="tx-value tx-mono"
              style={{ display: "inline-flex", alignItems: "center" }}
            >
              {block.blockhash}
              <CopyButton value={block.blockhash} />
            </span>
          </div>

          {/* Previous Blockhash */}
          <div className="tx-row">
            <span className="tx-label">{t("block.previousBlockhash")}:</span>
            <span className="tx-value tx-mono">{block.previousBlockhash}</span>
          </div>

          {/* Parent Slot */}
          <div className="tx-row">
            <span className="tx-label">{t("block.parentSlot")}:</span>
            <span className="tx-value">
              <Link to={`/${networkId}/slot/${block.parentSlot}`} className="link-accent tx-mono">
                #{formatSlotNumber(block.parentSlot)}
              </Link>
            </span>
          </div>

          {/* Block Height */}
          {block.blockHeight !== null && (
            <div className="tx-row">
              <span className="tx-label">{t("block.blockHeight")}:</span>
              <span className="tx-value">{formatSlotNumber(block.blockHeight)}</span>
            </div>
          )}

          {/* Transaction count */}
          <div className="tx-row">
            <span className="tx-label">{t("block.transactionCount")}:</span>
            <span className="tx-value">
              <span className="tx-value-highlight">{block.transactionCount.toLocaleString()}</span>{" "}
              transactions
            </span>
          </div>

          {/* Total rewards */}
          {block.rewards.length > 0 && (
            <div className="tx-row">
              <span className="tx-label">{t("block.rewards")}:</span>
              <span className="tx-value">{formatSol(totalRewards)}</span>
            </div>
          )}
        </div>

        {/* Rewards breakdown */}
        {block.rewards.length > 0 && (
          <div className="block-display-section">
            <h3 className="block-display-section-title">{t("block.rewards")}</h3>
            <div className="table-wrapper">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Pubkey</th>
                    <th>{t("block.rewardType")}</th>
                    <th>{t("block.amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {block.rewards.map((reward) => (
                    <tr key={reward.pubkey}>
                      <td className="table-cell-mono">
                        <Link
                          to={`/${networkId}/account/${reward.pubkey}`}
                          className="table-cell-address"
                          title={reward.pubkey}
                        >
                          {shortenSolanaAddress(reward.pubkey, 8, 8)}
                        </Link>
                      </td>
                      <td className="table-cell-text">{reward.rewardType ?? "—"}</td>
                      <td className="table-cell-value">{formatSol(reward.lamports)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transactions */}
        {block.signatures && block.signatures.length > 0 && (
          <div className="tx-row tx-row-vertical">
            <button
              type="button"
              className="more-details-toggle"
              onClick={() => setShowTransactions((v) => !v)}
            >
              {showTransactions ? "− Hide" : "+ Show"} {t("block.transactions")} (
              {block.signatures.length})
            </button>

            {showTransactions && (
              <div className="more-details-content">
                <div className="tx-list">
                  {block.signatures.map((sig, index) => (
                    <div key={sig} className="tx-list-item">
                      <span className="tx-list-index">{index}</span>
                      <span className="tx-list-hash tx-mono">
                        <Link to={`/${networkId}/tx/${sig}`} className="link-accent">
                          {sig}
                        </Link>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

SolanaSlotDisplay.displayName = "SolanaSlotDisplay";

export default SolanaSlotDisplay;
