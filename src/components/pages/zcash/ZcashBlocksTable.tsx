import type React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { DASHBOARD_BLOCKS } from "../../../config/zcashConstants";
import { useTimeAgo } from "../../../hooks/useTimeAgo";
import type { ZcashBlock } from "../../../types";
import { truncateBlockHash } from "../../../utils/zcashFormatters";
import { ZcashSkeleton } from "./ZcashCells";

interface ZcashBlocksTableProps {
  blocks: ZcashBlock[];
  /** Heights that couldn't be loaded (e.g. rate limited); retried on the next refresh */
  failedHeights: number[];
  loading: boolean;
  networkId: string;
}

type Row = { height: number; block?: ZcashBlock };

const ZcashBlocksTable: React.FC<ZcashBlocksTableProps> = ({
  blocks,
  failedHeights,
  loading,
  networkId,
}) => {
  const { t } = useTranslation("zcash");
  const timeAgo = useTimeAgo();

  const rows: Row[] = [
    ...blocks.map((block) => ({ height: block.height, block })),
    ...failedHeights.map((height) => ({ height })),
  ].sort((a, b) => b.height - a.height);

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

      {loading && rows.length === 0 ? (
        <div className="dashboard-table-compact">
          {Array.from({ length: DASHBOARD_BLOCKS }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
            <div key={i} className="dashboard-table-row">
              <div className="dashboard-block-info">
                <ZcashSkeleton width={70} />
              </div>
              <div className="dashboard-block-details">
                <ZcashSkeleton width={50} size="small" />
              </div>
              <div className="dashboard-block-meta">
                <ZcashSkeleton width={80} size="small" />
              </div>
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="dashboard-table-empty">{t("blocks.noBlocks")}</div>
      ) : (
        <div className="dashboard-table-compact">
          {rows.map(({ height, block }) =>
            block ? (
              <div key={block.hash} className="dashboard-table-row">
                <div className="dashboard-block-info">
                  <Link
                    to={`/${networkId}/block/${block.height}`}
                    className="dashboard-block-number"
                  >
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
            ) : (
              <div
                key={`failed-${height}`}
                className="dashboard-table-row"
                data-testid="zcash-block-unavailable"
              >
                <div className="dashboard-block-info">
                  <Link to={`/${networkId}/block/${height}`} className="dashboard-block-number">
                    #{height.toLocaleString()}
                  </Link>
                </div>
                <div className="dashboard-block-details">
                  <span className="text-muted">{t("blocks.unavailable")}</span>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
};

export default ZcashBlocksTable;
