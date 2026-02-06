import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { BLOCKS_PER_PAGE } from "../../../config/bitcoinConstants";
import { useDataService } from "../../../hooks/useDataService";
import type { BitcoinBlock } from "../../../types";
import {
  formatTimeAgo,
  formatTimestamp,
  truncateBlockHash,
} from "../../../utils/bitcoinFormatters";
import { logger } from "../../../utils/logger";
import Loader from "../../common/Loader";

export default function BitcoinBlocksPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Extract network slug from path (e.g., "/tbtc/blocks" → "tbtc")
  const networkSlug = location.pathname.split("/")[1] || "btc";
  const dataService = useDataService(networkSlug);

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
        logger.error("Error fetching Bitcoin blocks:", err);
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
      navigate(`/${networkSlug}/blocks`);
    } else {
      navigate(`/${networkSlug}/blocks?fromBlock=${newFromBlock}`);
    }
  };

  const goToOlderBlocks = () => {
    if (blocks.length === 0) return;
    const oldestBlockInPage = blocks[blocks.length - 1]?.height || 0;
    const newFromBlock = oldestBlockInPage - 1;

    if (newFromBlock >= 0) {
      navigate(`/${networkSlug}/blocks?fromBlock=${newFromBlock}`);
    }
  };

  const goToLatest = () => {
    navigate(`/${networkSlug}/blocks`);
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
                    <Link
                      to={`/${networkSlug}/block/${block.height}`}
                      className="table-cell-number"
                    >
                      {block.height.toLocaleString()}
                    </Link>
                  </td>
                  <td className="table-cell-mono">
                    <Link
                      to={`/${networkSlug}/block/${block.hash}`}
                      className="table-cell-address"
                      title={block.hash}
                    >
                      {truncateBlockHash(block.hash)}
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
