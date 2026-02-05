import type React from "react";
import { Link } from "react-router-dom";
import type { Block } from "../../../../types";

interface LatestBlocksTableProps {
  blocks: Block[];
  networkId: number;
  loading: boolean;
  currency: string;
}

function parseHexOrDecimal(value: string): number {
  if (!value) return 0;
  // Hex string with 0x prefix
  if (value.startsWith("0x")) {
    return Number.parseInt(value, 16);
  }
  // Already a decimal number - parse as decimal
  return Number.parseInt(value, 10);
}

function formatTimeAgo(timestamp: string): string {
  try {
    const blockTime = parseHexOrDecimal(timestamp) * 1000;
    const now = Date.now();
    const diffMs = now - blockTime;
    // Clamp to 0 minimum to handle clock drift (block slightly in future)
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

function formatGasUsed(gasUsed: string, gasLimit: string): { amount: string; percent: string } {
  try {
    const used = parseHexOrDecimal(gasUsed);
    const limit = parseHexOrDecimal(gasLimit);
    const percent = limit > 0 ? ((used / limit) * 100).toFixed(1) : "0";
    return {
      amount: used.toLocaleString(),
      percent: `${percent}%`,
    };
  } catch {
    return { amount: "—", percent: "—" };
  }
}

function calculateBlockReward(block: Block): string {
  try {
    // Base block reward (2 ETH for Ethereum mainnet post-merge)
    // This is simplified - actual reward depends on network and includes tips
    const gasUsed = parseHexOrDecimal(block.gasUsed);
    const baseFeePerGas = block.baseFeePerGas ? parseHexOrDecimal(block.baseFeePerGas) : 0;

    // Burnt fees = gasUsed * baseFeePerGas
    const burntFees = (gasUsed * baseFeePerGas) / 1e18;

    // For display, show approximate reward (base + estimated tips - burnt)
    // Since we don't have exact tip data, show a simplified version
    if (burntFees > 0) {
      return `~${burntFees.toFixed(4)}`;
    }
    return "—";
  } catch {
    return "—";
  }
}

function truncateAddress(address: string): string {
  if (!address) return "—";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const LatestBlocksTable: React.FC<LatestBlocksTableProps> = ({
  blocks,
  networkId,
  loading,
  currency,
}) => {
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
            const gas = formatGasUsed(block.gasUsed, block.gasLimit);
            const reward = calculateBlockReward(block);

            return (
              <div key={block.hash} className="dashboard-table-row">
                <div className="dashboard-block-info">
                  <Link to={`/${networkId}/block/${blockNum}`} className="dashboard-block-number">
                    #{blockNum.toLocaleString()}
                  </Link>
                  <span className="dashboard-block-time">{formatTimeAgo(block.timestamp)}</span>
                </div>
                <div className="dashboard-block-details">
                  <span className="dashboard-block-txns">{txCount} txns</span>
                  <span className="dashboard-block-gas" title={`Gas: ${gas.amount}`}>
                    {gas.percent} Gas Used
                  </span>
                  {reward !== "—" && (
                    <span className="dashboard-block-reward" title="Burnt fees">
                      {reward} {currency}
                    </span>
                  )}
                </div>
                <div className="dashboard-block-meta">
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
