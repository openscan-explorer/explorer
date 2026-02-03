import type React from "react";
import { Link } from "react-router-dom";
import type { BitcoinBlock } from "../../../types";
import { formatTimeAgo, truncateHash } from "../../../utils/bitcoinFormatters";

interface BitcoinBlocksTableProps {
  blocks: BitcoinBlock[];
  loading: boolean;
  networkId: string;
}

const BitcoinBlocksTable: React.FC<BitcoinBlocksTableProps> = ({ blocks, loading, networkId }) => {
  return (
    <div className="dashboard-table-section dashboard-table-section-full">
      <div className="dashboard-table-header">
        <Link to={`/${networkId}/blocks`} className="dashboard-table-title-link">
          <h3 className="dashboard-table-title">Latest Blocks</h3>
          <span className="dashboard-title-arrow">↗</span>
        </Link>
        <Link to={`/${networkId}/blocks`} className="dashboard-view-all">
          View all →
        </Link>
      </div>

      {loading && blocks.length === 0 ? (
        <div className="dashboard-table-loading">Loading blocks...</div>
      ) : blocks.length === 0 ? (
        <div className="dashboard-table-empty">No blocks found</div>
      ) : (
        <div className="dashboard-table-compact">
          {blocks.map((block) => (
            <div key={block.hash} className="dashboard-table-row">
              <div className="dashboard-block-info">
                <Link to={`/${networkId}/block/${block.height}`} className="dashboard-block-number">
                  #{block.height.toLocaleString()}
                </Link>
                <span className="dashboard-block-time">{formatTimeAgo(block.time)}</span>
              </div>
              <div className="dashboard-block-details">
                <span className="dashboard-block-txns">{block.nTx} txns</span>
              </div>
              <div className="dashboard-block-meta">
                <Link
                  to={`/${networkId}/block/${block.hash}`}
                  className="dashboard-block-hash"
                  title={block.hash}
                >
                  {truncateHash(block.hash, "short")}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BitcoinBlocksTable;
