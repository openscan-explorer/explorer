import type React from "react";
import { Link } from "react-router-dom";
import type { Block } from "../../../types";

interface LatestBlocksTableProps {
  blocks: Block[];
  networkId: number;
  loading: boolean;
}

function formatTimeAgo(timestamp: string): string {
  try {
    const blockTime = Number.parseInt(timestamp, 16) * 1000;
    const now = Date.now();
    const diffSeconds = Math.floor((now - blockTime) / 1000);

    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    }
    if (diffSeconds < 3600) {
      const mins = Math.floor(diffSeconds / 60);
      return `${mins}m ago`;
    }
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours}h ago`;
  } catch {
    return "—";
  }
}

function truncateAddress(address: string): string {
  if (!address) return "—";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const LatestBlocksTable: React.FC<LatestBlocksTableProps> = ({ blocks, networkId, loading }) => {
  return (
    <div className="dashboard-table-section">
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
          {blocks.map((block) => {
            const blockNum = Number.parseInt(block.number, 16);
            const txCount = block.transactions?.length || 0;

            return (
              <div key={block.hash} className="dashboard-table-row">
                <div className="dashboard-block-info">
                  <Link to={`/${networkId}/block/${blockNum}`} className="dashboard-block-number">
                    #{blockNum.toLocaleString()}
                  </Link>
                  <span className="dashboard-block-time">{formatTimeAgo(block.timestamp)}</span>
                </div>
                <div className="dashboard-block-meta">
                  <span className="dashboard-block-txns">{txCount} txns</span>
                  <Link
                    to={`/${networkId}/address/${block.miner}`}
                    className="dashboard-block-miner"
                    title={block.miner}
                  >
                    {truncateAddress(block.miner)}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LatestBlocksTable;
