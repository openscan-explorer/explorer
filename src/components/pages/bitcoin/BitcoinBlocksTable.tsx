import type React from "react";
import type { BitcoinBlock } from "../../../types";

interface BitcoinBlocksTableProps {
  blocks: BitcoinBlock[];
  loading: boolean;
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function truncateHash(hash: string): string {
  if (!hash) return "—";
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

const BitcoinBlocksTable: React.FC<BitcoinBlocksTableProps> = ({ blocks, loading }) => {
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
                <span className="dashboard-block-number">#{block.height.toLocaleString()}</span>
                <span className="dashboard-block-time">{formatTimeAgo(block.time)}</span>
              </div>
              <div className="dashboard-block-details">
                <span className="dashboard-block-txns">{block.nTx} txns</span>
                <span className="dashboard-block-gas">{formatSize(block.size)}</span>
              </div>
              <div className="dashboard-block-meta">
                <span className="dashboard-block-hash" title={block.hash}>
                  {truncateHash(block.hash)}
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
