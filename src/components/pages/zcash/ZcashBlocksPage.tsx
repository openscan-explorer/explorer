import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { getNetworkBySlug } from "../../../config/networks";
import { BLOCKS_PER_PAGE } from "../../../config/zcashConstants";
import { useDataService } from "../../../hooks/useDataService";
import { useZcashTimeAgo } from "../../../hooks/useZcashTimeAgo";
import type { ZcashBlock } from "../../../types";
import { logger } from "../../../utils/logger";
import {
  formatNumber,
  formatSize,
  formatTimestamp,
  truncateBlockHash,
} from "../../../utils/zcashFormatters";
import Breadcrumb from "../../common/Breadcrumb";

const skeletonCell = (width: string) => (
  <span className="skeleton-pulse" style={{ width, height: 18 }} />
);

export default function ZcashBlocksPage() {
  const { t } = useTranslation("zcash");
  const timeAgo = useZcashTimeAgo();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Extract network slug from path (e.g., "/tzec/blocks" → "tzec")
  const networkSlug = location.pathname.split("/")[1] || "zec";
  const dataService = useDataService(networkSlug);
  const network = getNetworkBySlug(networkSlug);
  const networkName = network?.name ?? networkSlug;
  const networkLabel = network?.shortName || networkSlug.toUpperCase();

  const fromBlockParam = searchParams.get("fromBlock");
  const fromBlock =
    fromBlockParam !== null && /^\d+$/.test(fromBlockParam) ? Number(fromBlockParam) : null;

  const [blocks, setBlocks] = useState<ZcashBlock[]>([]);
  const [latestHeight, setLatestHeight] = useState<number | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataService || !dataService.isZcash()) return;

    let cancelled = false;
    const adapter = dataService.getZcashAdapter();

    const fetchBlocks = async () => {
      setFetching(true);
      setError(null);
      setBlocks([]);

      try {
        const tipHeight = await adapter.getLatestBlockNumber();
        if (cancelled) return;
        setLatestHeight(tipHeight);

        const start = Math.min(fromBlock ?? tipHeight, tipHeight);
        for (let height = start; height > start - BLOCKS_PER_PAGE && height >= 0; height--) {
          // One block per call, so rows appear as they arrive on rate-limited endpoints
          const [block] = await adapter.getBlockSummaries([height]);
          if (cancelled) return;
          if (block) setBlocks((prev) => [...prev, block]);
        }
      } catch (err) {
        logger.error("Error fetching Zcash blocks:", err);
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setFetching(false);
      }
    };

    fetchBlocks();
    return () => {
      cancelled = true;
    };
  }, [dataService, fromBlock]);

  const startHeight =
    latestHeight === null ? null : Math.min(fromBlock ?? latestHeight, latestHeight);
  const oldestHeight = startHeight === null ? null : Math.max(startHeight - BLOCKS_PER_PAGE + 1, 0);
  const isAtLatest = fromBlock === null || (latestHeight !== null && fromBlock >= latestHeight);
  const canGoNewer = !isAtLatest && startHeight !== null;
  const canGoOlder = startHeight !== null && startHeight - BLOCKS_PER_PAGE >= 0;

  const expectedRows =
    startHeight === null ? BLOCKS_PER_PAGE : Math.min(BLOCKS_PER_PAGE, startHeight + 1);
  const skeletonRows = fetching ? Math.max(expectedRows - blocks.length, 0) : 0;

  const goToLatest = () => navigate(`/${networkSlug}/blocks`);

  const goToNewer = () => {
    if (startHeight === null || latestHeight === null) return;
    const next = startHeight + BLOCKS_PER_PAGE;
    navigate(
      next >= latestHeight ? `/${networkSlug}/blocks` : `/${networkSlug}/blocks?fromBlock=${next}`,
    );
  };

  const goToOlder = () => {
    if (startHeight === null) return;
    navigate(`/${networkSlug}/blocks?fromBlock=${startHeight - BLOCKS_PER_PAGE}`);
  };

  return (
    <div className="container-wide">
      <Breadcrumb
        items={[
          { label: t("breadcrumb.home"), to: "/" },
          { label: networkLabel, to: `/${networkSlug}` },
          { label: t("breadcrumb.blocks") },
        ]}
      />
      <div className="block-display-card">
        <div className="blocks-header">
          <div className="blocks-header-main">
            <span className="block-label">{t("blocksPage.title", { network: networkName })}</span>
            {startHeight !== null && oldestHeight !== null && (
              <>
                <span className="block-header-divider">•</span>
                <span className="blocks-header-info">
                  {isAtLatest
                    ? t("blocksPage.showingLatest", { count: BLOCKS_PER_PAGE })
                    : t("blocksPage.showingRange", {
                        from: formatNumber(oldestHeight),
                        to: formatNumber(startHeight),
                      })}
                </span>
              </>
            )}
          </div>
        </div>

        {error ? (
          <div className="card-content">
            <p className="text-error margin-0">{t("blocksPage.loadError", { message: error })}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="dash-table blocks-table">
              <thead>
                <tr>
                  <th>{t("blocksPage.height")}</th>
                  <th>{t("blocksPage.hash")}</th>
                  <th>{t("blocksPage.time")}</th>
                  <th>{t("blocksPage.txns")}</th>
                  <th className="hide-mobile">{t("blocksPage.size")}</th>
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
                      {timeAgo(block.time)}
                    </td>
                    <td className="table-cell-value">{block.nTx.toLocaleString()}</td>
                    <td className="table-cell-muted hide-mobile">{formatSize(block.size)}</td>
                  </tr>
                ))}
                {Array.from({ length: skeletonRows }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
                  <tr key={`skeleton-${i}`}>
                    <td>{skeletonCell("70px")}</td>
                    <td>{skeletonCell("120px")}</td>
                    <td>{skeletonCell("60px")}</td>
                    <td>{skeletonCell("40px")}</td>
                    <td className="hide-mobile">{skeletonCell("80px")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination-container">
          <button
            type="button"
            onClick={goToLatest}
            disabled={isAtLatest}
            className="pagination-btn"
            title={t("blocksPage.latestTitle")}
          >
            {t("blocksPage.latest")}
          </button>
          <button
            type="button"
            onClick={goToNewer}
            disabled={!canGoNewer}
            className="pagination-btn"
            title={t("blocksPage.newerTitle")}
          >
            {t("blocksPage.newer")}
          </button>
          <button
            type="button"
            onClick={goToOlder}
            disabled={!canGoOlder}
            className="pagination-btn"
            title={t("blocksPage.olderTitle")}
          >
            {t("blocksPage.older")}
          </button>
        </div>
      </div>
    </div>
  );
}
