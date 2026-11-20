import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BLOCKS_PER_PAGE } from "../../../config/zcashConstants";
import { useDataService } from "../../../hooks/useDataService";
import { useTimeAgo } from "../../../hooks/useTimeAgo";
import { useZcashNetworkFromPath } from "../../../hooks/useZcashNetworkFromPath";
import type { ZcashBlock } from "../../../types";
import { logger } from "../../../utils/logger";
import {
  formatNumber,
  formatSize,
  formatTimestamp,
  truncateBlockHash,
} from "../../../utils/zcashFormatters";
import Breadcrumb from "../../common/Breadcrumb";
import { ZcashSkeleton } from "./ZcashCells";

export default function ZcashBlocksPage() {
  const { t } = useTranslation("zcash");
  const timeAgo = useTimeAgo();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { slug: networkSlug, name: networkName, label: networkLabel } = useZcashNetworkFromPath();
  const dataService = useDataService(networkSlug);

  const fromBlockParam = searchParams.get("fromBlock");
  const fromBlock =
    fromBlockParam !== null && /^\d+$/.test(fromBlockParam) ? Number(fromBlockParam) : null;

  const [blocks, setBlocks] = useState<Map<number, ZcashBlock>>(new Map());
  const [failedHeights, setFailedHeights] = useState<number[]>([]);
  const [latestHeight, setLatestHeight] = useState<number | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Aborted when the page or network changes, so retries of an old page can't land here
  const pageSignalRef = useRef<AbortSignal | null>(null);

  const addBlock = useCallback((block: ZcashBlock) => {
    setBlocks((prev) => new Map(prev).set(block.height, block));
  }, []);

  useEffect(() => {
    if (!dataService || !dataService.isZcash()) return;

    const controller = new AbortController();
    const { signal } = controller;
    pageSignalRef.current = signal;
    const adapter = dataService.getZcashAdapter();

    const fetchBlocks = async () => {
      setFetching(true);
      setError(null);
      setBlocks(new Map());
      setFailedHeights([]);

      try {
        const tipHeight = await adapter.getLatestBlockNumber({ signal });
        if (signal.aborted) return;
        setLatestHeight(tipHeight);

        const start = Math.min(fromBlock ?? tipHeight, tipHeight);
        const heights = Array.from({ length: BLOCKS_PER_PAGE }, (_, i) => start - i).filter(
          (height) => height >= 0,
        );
        // One block per call; rows appear as they arrive on rate-limited endpoints
        const result = await adapter.getBlockSummaries(heights, {
          signal,
          onBlock: (block) => {
            if (!signal.aborted) addBlock(block);
          },
        });
        if (signal.aborted) return;
        setFailedHeights(result.failedHeights);
      } catch (err) {
        if (signal.aborted) return;
        logger.error("Error fetching Zcash blocks:", err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!signal.aborted) setFetching(false);
      }
    };

    fetchBlocks();
    return () => controller.abort();
  }, [dataService, fromBlock, addBlock]);

  const retryBlock = async (height: number) => {
    const signal = pageSignalRef.current;
    if (!dataService?.isZcash() || !signal) return;
    setFailedHeights((prev) => prev.filter((failed) => failed !== height));
    try {
      const result = await dataService.getZcashAdapter().getBlockSummaries([height], {
        signal,
        onBlock: (block) => {
          if (!signal.aborted) addBlock(block);
        },
      });
      if (signal.aborted) return;
      setFailedHeights((prev) => [...prev, ...result.failedHeights]);
    } catch {
      // Aborted: the page moved on
    }
  };

  const startHeight =
    latestHeight === null ? null : Math.min(fromBlock ?? latestHeight, latestHeight);
  const oldestHeight = startHeight === null ? null : Math.max(startHeight - BLOCKS_PER_PAGE + 1, 0);
  const isAtLatest = fromBlock === null || (latestHeight !== null && fromBlock >= latestHeight);
  const canGoNewer = !isAtLatest && startHeight !== null;
  const canGoOlder = startHeight !== null && startHeight - BLOCKS_PER_PAGE >= 0;

  const pageHeights =
    startHeight === null || oldestHeight === null
      ? []
      : Array.from({ length: startHeight - oldestHeight + 1 }, (_, i) => startHeight - i);
  const skeletonRows = startHeight === null && fetching ? BLOCKS_PER_PAGE : 0;

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
                {pageHeights.map((height) => {
                  const block = blocks.get(height);
                  if (block) {
                    return (
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
                    );
                  }
                  if (failedHeights.includes(height)) {
                    return (
                      <tr key={`failed-${height}`} data-testid="zcash-block-unavailable">
                        <td>
                          <Link
                            to={`/${networkSlug}/block/${height}`}
                            className="table-cell-number"
                          >
                            {height.toLocaleString()}
                          </Link>
                        </td>
                        <td colSpan={4} className="table-cell-muted">
                          {t("blocksPage.unavailable")}
                          <button
                            type="button"
                            className="link-accent zec-retry-button"
                            onClick={() => retryBlock(height)}
                          >
                            {t("blocksPage.retryBlock")}
                          </button>
                        </td>
                      </tr>
                    );
                  }
                  return <SkeletonRow key={`loading-${height}`} />;
                })}
                {Array.from({ length: skeletonRows }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
                  <SkeletonRow key={`skeleton-${i}`} />
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

const SkeletonRow = () => (
  <tr>
    <td>
      <ZcashSkeleton width={70} size="row" />
    </td>
    <td>
      <ZcashSkeleton width={120} size="row" />
    </td>
    <td>
      <ZcashSkeleton width={60} size="row" />
    </td>
    <td>
      <ZcashSkeleton width={40} size="row" />
    </td>
    <td className="hide-mobile">
      <ZcashSkeleton width={80} size="row" />
    </td>
  </tr>
);
