import type React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { DASHBOARD_BLOCKS } from "../../../config/zcashConstants";
import { useZcashTimeAgo } from "../../../hooks/useZcashTimeAgo";
import type { ZcashBlock } from "../../../types";
import { truncateBlockHash } from "../../../utils/zcashFormatters";

interface ZcashBlocksTableProps {
  blocks: ZcashBlock[];
  loading: boolean;
  networkId: string;
}

const ZcashBlocksTable: React.FC<ZcashBlocksTableProps> = ({ blocks, loading, networkId }) => {
  const { t } = useTranslation("zcash");
  const timeAgo = useZcashTimeAgo();

  return (
    <div
      className="dashboard-table-section dashboard-table-section-full"
      data-testid="zcash-blocks-table"
    >
      <div className="dashboard-table-header">
        <Link to={`/${networkId}/blocks`} className="dashboard-table-title-link">
          <h3 className="dashboard-table-title">{t("blocks.title")}</h3>
          <span className="dashboard-title-arrow">↗</span>
        </Link>
        <Link to={`/${networkId}/blocks`} className="dashboard-view-all">
          {t("blocks.viewAll")} →
        </Link>
      </div>

      {loading && blocks.length === 0 ? (
        <div className="dashboard-table-compact">
          {Array.from({ length: DASHBOARD_BLOCKS }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
            <div key={i} className="dashboard-table-row">
              <div className="dashboard-block-info">
                <span
                  className="skeleton-pulse"
                  style={{ width: "70px", height: 14, display: "inline-block" }}
                />
              </div>
              <div className="dashboard-block-details">
                <span
                  className="skeleton-pulse"
                  style={{ width: "50px", height: 12, display: "inline-block" }}
                />
              </div>
              <div className="dashboard-block-meta">
                <span
                  className="skeleton-pulse"
                  style={{ width: "80px", height: 12, display: "inline-block" }}
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
            <div key={block.hash} className="dashboard-table-row">
              <div className="dashboard-block-info">
                <Link to={`/${networkId}/block/${block.height}`} className="dashboard-block-number">
                  #{block.height.toLocaleString()}
                </Link>
                <span className="dashboard-block-time">{timeAgo(block.time)}</span>
              </div>
              <div className="dashboard-block-details">
                <span className="dashboard-block-txns">
                  {t("blocks.txCount", { count: block.nTx })}
                </span>
              </div>
              <div className="dashboard-block-meta">
                <Link
                  to={`/${networkId}/block/${block.hash}`}
                  className="dashboard-block-miner"
                  title={block.hash}
                >
                  {truncateBlockHash(block.hash)}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ZcashBlocksTable;
