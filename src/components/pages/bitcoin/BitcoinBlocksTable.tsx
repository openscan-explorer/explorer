import type React from "react";
import { Link } from "react-router-dom";
import type { BitcoinBlock } from "../../../types";

interface BitcoinBlocksTableProps {
  blocks: BitcoinBlock[];
  loading: boolean;
  networkId?: string;
}

function formatTimeAgo(timestamp: number): string {
  try {
    const blockTime = timestamp * 1000;
    const now = Date.now();
    const diffMs = now - blockTime;
    const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));

    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    }
    if (diffSeconds < 3600) {
      const mins = Math.floor(diffSeconds / 60);
      return `${mins}m ago`;
    }
    if (diffSeconds < 86400) {
      const hours = Math.floor(diffSeconds / 3600);
      return `${hours}h ago`;
    }
    const days = Math.floor(diffSeconds / 86400);
    return `${days}d ago`;
  } catch {
    return "—";
  }
}

function truncateHash(hash: string): string {
  if (!hash) return "—";
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

const BitcoinBlocksTable: React.FC<BitcoinBlocksTableProps> = ({ blocks, loading, networkId }) => {
  return (
    <div className="dashboard-table-section dashboard-table-section-full">
      <div className="dashboard-table-header">
        <h3 className="dashboard-table-title">Latest Blocks</h3>
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
                <span className="dashboard-block-number">
                  {networkId ? (
                    <Link to={`/${networkId}/block/${block.height}`} className="link-accent">
                      #{block.height.toLocaleString()}
                    </Link>
                  ) : (
                    `#${block.height.toLocaleString()}`
                  )}
                </span>
                <span className="dashboard-block-time">{formatTimeAgo(block.time)}</span>
              </div>
              <div className="dashboard-block-details">
                <span className="dashboard-block-txns">{block.nTx} txns</span>
              </div>
              <div className="dashboard-block-meta">
                <span className="dashboard-block-hash" title={block.hash}>
                  {networkId ? (
                    <Link to={`/${networkId}/block/${block.hash}`} className="link-accent">
                      {truncateHash(block.hash)}
                    </Link>
                  ) : (
                    truncateHash(block.hash)
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BitcoinBlocksTable;
