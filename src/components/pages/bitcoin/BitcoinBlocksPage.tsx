import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useDataService } from "../../../hooks/useDataService";
import type { BitcoinBlock } from "../../../types";
import Loader from "../../common/Loader";

const BLOCKS_PER_PAGE = 20;

function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp * 1000;
  const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);

  if (diffSeconds < 60) return `${diffSeconds}s ago`;
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
}

function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp * 1000));
}

function truncateHash(hash: string, start = 10, end = 8): string {
  if (!hash || hash.length <= start + end) return hash || "—";
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

export default function BitcoinBlocksPage() {
  const { networkId } = useParams<{ networkId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dataService = useDataService(networkId || "");

  const [blocks, setBlocks] = useState<BitcoinBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestBlockHeight, setLatestBlockHeight] = useState<number | null>(null);

  // Get fromBlock from URL params, default to null (latest)
  const fromBlockParam = searchParams.get("fromBlock");
  const fromBlock = fromBlockParam ? Number(fromBlockParam) : null;

  useEffect(() => {
    if (!dataService || !dataService.isBitcoin()) {
      setLoading(false);
      return;
    }

    const fetchBlocks = async () => {
      setLoading(true);
      setError(null);

      try {
        const adapter = dataService.getBitcoinAdapter();

        // Get the latest block height
        const latestHeight = await adapter.getLatestBlockNumber();
        setLatestBlockHeight(latestHeight);

        // Determine starting block
        const startHeight = fromBlock !== null ? fromBlock : latestHeight;

        // Calculate block heights to fetch
        const heights: number[] = [];
        for (let i = 0; i < BLOCKS_PER_PAGE && startHeight - i >= 0; i++) {
          heights.push(startHeight - i);
        }

        // Fetch blocks
        const blockPromises = heights.map((height) => adapter.getBlock(height));
        const blockResults = await Promise.all(blockPromises);

        // Filter out nulls and extract data
        const fetchedBlocks = blockResults
          .map((result) => result.data)
          .filter((block): block is BitcoinBlock => block !== null);

        setBlocks(fetchedBlocks);
      } catch (err) {
        console.error("Error fetching Bitcoin blocks:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch blocks");
      } finally {
        setLoading(false);
      }
    };

    fetchBlocks();
  }, [dataService, fromBlock]);

  // Navigation handlers
  const goToNewerBlocks = () => {
    if (blocks.length === 0 || latestBlockHeight === null) return;
    const newestBlockInPage = blocks[0]?.height || 0;
    const newFromBlock = Math.min(newestBlockInPage + BLOCKS_PER_PAGE, latestBlockHeight);

    if (newFromBlock >= latestBlockHeight) {
      navigate(`/${networkId}/blocks`);
    } else {
      navigate(`/${networkId}/blocks?fromBlock=${newFromBlock}`);
    }
  };

  const goToOlderBlocks = () => {
    if (blocks.length === 0) return;
    const oldestBlockInPage = blocks[blocks.length - 1]?.height || 0;
    const newFromBlock = oldestBlockInPage - 1;

    if (newFromBlock >= 0) {
      navigate(`/${networkId}/blocks?fromBlock=${newFromBlock}`);
    }
  };

  const goToLatest = () => {
    navigate(`/${networkId}/blocks`);
  };

  // Determine if we can navigate
  const canGoNewer =
    fromBlock !== null && latestBlockHeight !== null && fromBlock < latestBlockHeight;
  const canGoOlder = blocks.length > 0 && (blocks[blocks.length - 1]?.height || 0) > 0;
  const isAtLatest =
    fromBlock === null || (latestBlockHeight !== null && fromBlock >= latestBlockHeight);

  if (loading) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="blocks-header">
            <span className="block-label">Bitcoin Blocks</span>
          </div>
          <div className="card-content-loading">
            <Loader text="Loading blocks..." />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="blocks-header">
            <span className="block-label">Bitcoin Blocks</span>
          </div>
          <div className="card-content">
            <p className="text-error margin-0">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-wide">
      <div className="block-display-card">
        <div className="blocks-header">
          <div className="blocks-header-main">
            <span className="block-label">Bitcoin Blocks</span>
            <span className="block-header-divider">•</span>
            <span className="blocks-header-info">
              {isAtLatest
                ? `Showing ${blocks.length} most recent blocks`
                : `Showing blocks ${(blocks[blocks.length - 1]?.height || 0).toLocaleString()} - ${(blocks[0]?.height || 0).toLocaleString()}`}
            </span>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Height</th>
                <th>Hash</th>
                <th>Time</th>
                <th>Txns</th>
                <th className="hide-mobile">Size</th>
                <th className="hide-mobile">Weight</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((block) => (
                <tr key={block.hash}>
                  <td>
                    <Link to={`/${networkId}/block/${block.height}`} className="table-cell-number">
                      {block.height.toLocaleString()}
                    </Link>
                  </td>
                  <td className="table-cell-mono">
                    <Link
                      to={`/${networkId}/block/${block.hash}`}
                      className="table-cell-address"
                      title={block.hash}
                    >
                      {truncateHash(block.hash)}
                    </Link>
                  </td>
                  <td className="table-cell-text" title={formatTimestamp(block.time)}>
                    {formatTimeAgo(block.time)}
                  </td>
                  <td className="table-cell-value">{block.nTx.toLocaleString()}</td>
                  <td className="table-cell-muted hide-mobile">
                    {block.size.toLocaleString()} bytes
                  </td>
                  <td className="table-cell-muted hide-mobile">
                    {block.weight.toLocaleString()} WU
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination-container">
          <button
            type="button"
            onClick={goToLatest}
            disabled={isAtLatest}
            className="pagination-btn"
            title="Go to latest blocks"
          >
            Latest
          </button>
          <button
            type="button"
            onClick={goToNewerBlocks}
            disabled={!canGoNewer}
            className="pagination-btn"
            title="View newer blocks"
          >
            ← Newer
          </button>
          <button
            type="button"
            onClick={goToOlderBlocks}
            disabled={!canGoOlder}
            className="pagination-btn"
            title="View older blocks"
          >
            Older →
          </button>
        </div>
      </div>
    </div>
  );
}
