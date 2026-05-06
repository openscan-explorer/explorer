import type React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { SolanaBlock } from "../../../types";
import { formatSlotNumber, shortenSolanaAddress } from "../../../utils/solanaUtils";

interface SolanaBlocksTableProps {
  blocks: SolanaBlock[];
  loading: boolean;
  networkId: string;
}

function formatTimeAgo(blockTime: number | null): string {
  if (blockTime === null) return "—";
  const seconds = Math.floor(Date.now() / 1000 - blockTime);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

const SolanaBlocksTable: React.FC<SolanaBlocksTableProps> = ({ blocks, loading, networkId }) => {
  const { t } = useTranslation("solana");

  return (
    <div className="dashboard-table-section dashboard-table-section-full">
      <div className="dashboard-table-header">
        <Link to={`/${networkId}/slots`} className="dashboard-table-title-link">
          <h3 className="dashboard-table-title">{t("blocks.title")}</h3>
          <span className="dashboard-title-arrow">↗</span>
        </Link>
        <Link to={`/${networkId}/slots`} className="dashboard-view-all">
          {t("blocks.viewAll")} →
        </Link>
      </div>

      {loading && blocks.length === 0 ? (
        <div className="dashboard-table-compact">
          {Array.from({ length: 5 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
            <div key={i} className="dashboard-table-row">
              <div className="dashboard-block-info">
                <span
                  className="skeleton-pulse"
                  style={{ width: "100px", height: 14, display: "inline-block" }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : blocks.length === 0 ? (
        <div className="dashboard-table-empty">{t("blocks.noBlocks")}</div>
      ) : (
        <div className="dashboard-table-compact">
          {blocks.map((block) => (
            <div key={block.blockhash} className="dashboard-table-row">
              <div className="dashboard-block-info">
                <Link to={`/${networkId}/slot/${block.slot}`} className="dashboard-block-number">
                  #{formatSlotNumber(block.slot)}
                </Link>
                <span className="dashboard-block-time">{formatTimeAgo(block.blockTime)}</span>
              </div>
              <div className="dashboard-block-details">
                <span className="dashboard-block-txns">{block.transactionCount} txns</span>
              </div>
              <div className="dashboard-block-meta">
                <span className="dashboard-block-miner" title={block.blockhash}>
                  {shortenSolanaAddress(block.blockhash, 6, 6)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SolanaBlocksTable;
