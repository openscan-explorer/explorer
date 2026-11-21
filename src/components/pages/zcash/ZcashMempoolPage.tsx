import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import {
  LOADER_TIMEOUT_MS,
  MEMPOOL_PAGE_SIZE,
  MEMPOOL_REFRESH_MS,
} from "../../../config/zcashConstants";
import { useDataService } from "../../../hooks/useDataService";
import { useTimeAgo } from "../../../hooks/useTimeAgo";
import { useZcashNetworkFromPath } from "../../../hooks/useZcashNetworkFromPath";
import type { ZcashMempoolEntry } from "../../../types";
import { logger } from "../../../utils/logger";
import { formatNumber, formatSize, formatZEC, truncateHash } from "../../../utils/zcashFormatters";
import Breadcrumb from "../../common/Breadcrumb";
import LoaderWithTimeout from "../../common/LoaderWithTimeout";

export default function ZcashMempoolPage() {
  const { t } = useTranslation("zcash");
  const timeAgo = useTimeAgo();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    slug: networkSlug,
    name: networkName,
    label: networkLabel,
    currency,
  } = useZcashNetworkFromPath();
  const dataService = useDataService(networkSlug);

  const pageParam = Number(searchParams.get("page"));
  const page = Number.isInteger(pageParam) && pageParam > 1 ? pageParam : 1;

  const [entries, setEntries] = useState<ZcashMempoolEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // A single verbose getrawmempool call returns every entry with its fee, so no per-transaction
  // fetches are needed
  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt re-runs the fetch on retry
  useEffect(() => {
    setEntries([]);
    setLoading(true);
    setError(null);
    if (!dataService || !dataService.isZcash()) return;

    // Switching networks aborts this, so a slow response can't fill the other network's list
    const controller = new AbortController();
    const { signal } = controller;
    const adapter = dataService.getZcashAdapter();
    let inFlight = false;

    const fetchMempool = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const { data } = await adapter.getMempoolEntries({ signal });
        if (signal.aborted) return;
        setEntries(data);
        setError(null);
      } catch (err) {
        if (signal.aborted) return;
        logger.error("Error fetching Zcash mempool:", err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        inFlight = false;
        if (!signal.aborted) setLoading(false);
      }
    };

    fetchMempool();
    const intervalId = setInterval(fetchMempool, MEMPOOL_REFRESH_MS);
    return () => {
      controller.abort();
      clearInterval(intervalId);
    };
  }, [dataService, attempt]);

  const totalPages = Math.max(1, Math.ceil(entries.length / MEMPOOL_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const displayed = entries.slice((safePage - 1) * MEMPOOL_PAGE_SIZE, safePage * MEMPOOL_PAGE_SIZE);
  const totalBytes = entries.reduce((sum, entry) => sum + entry.size, 0);

  const goToPage = (target: number) => setSearchParams(target > 1 ? { page: String(target) } : {});

  const breadcrumb = (
    <Breadcrumb
      items={[
        { label: t("breadcrumb.home"), to: "/" },
        { label: networkLabel, to: `/${networkSlug}` },
        { label: t("breadcrumb.mempool") },
      ]}
    />
  );

  if (loading && entries.length === 0) {
    return (
      <div className="container-wide">
        {breadcrumb}
        <div className="block-display-card">
          <div className="blocks-header">
            <span className="block-label">{t("mempool.title", { network: networkName })}</span>
          </div>
          <div className="card-content-loading">
            <LoaderWithTimeout
              key={attempt}
              text={t("mempool.loading")}
              timeoutMs={LOADER_TIMEOUT_MS}
              onRetry={() => setAttempt((count) => count + 1)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-wide">
      {breadcrumb}
      <div className="block-display-card">
        <div className="blocks-header">
          <div className="blocks-header-main">
            <span className="block-label">{t("mempool.title", { network: networkName })}</span>
            <span className="block-header-divider">•</span>
            <span className="blocks-header-info">
              {t("mempool.summary", { count: entries.length, size: formatSize(totalBytes) })}
            </span>
          </div>
          {totalPages > 1 && (
            <span className="blocks-header-info">
              {t("txsPage.pageInfo", { page: safePage, totalPages })}
            </span>
          )}
        </div>

        {error && (
          <div className="card-content">
            <p className="text-error margin-0">{t("mempool.loadError", { message: error })}</p>
          </div>
        )}

        {entries.length === 0 ? (
          !error && (
            <div className="card-content">
              <p className="text-muted margin-0">{t("mempool.empty")}</p>
            </div>
          )
        ) : (
          <div className="table-wrapper">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>{t("mempool.txid")}</th>
                  <th className="hide-mobile">{t("mempool.age")}</th>
                  <th className="hide-mobile">{t("mempool.size")}</th>
                  <th>{t("mempool.fee")}</th>
                  <th className="hide-mobile">{t("mempool.feeRate")}</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((entry) => (
                  <tr key={entry.txid}>
                    <td className="table-cell-mono">
                      <Link
                        to={`/${networkSlug}/mempool/${entry.txid}`}
                        className="table-cell-address"
                        title={entry.txid}
                      >
                        {truncateHash(entry.txid, "long")}
                      </Link>
                    </td>
                    <td className="table-cell-text hide-mobile">{timeAgo(entry.time)}</td>
                    <td className="table-cell-muted hide-mobile">{formatSize(entry.size)}</td>
                    <td className="table-cell-text">{formatZEC(entry.feeZat, currency)}</td>
                    <td className="table-cell-muted hide-mobile">
                      {entry.size > 0
                        ? t("tx.feeRate", {
                            rate: formatNumber(Number((entry.feeZat / entry.size).toFixed(2))),
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination-container">
            <button
              type="button"
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage <= 1}
              className="pagination-btn"
              title={t("txsPage.prevTitle")}
            >
              {t("txsPage.prev")}
            </button>
            <span className="pagination-page-info">
              {t("txsPage.pageInfo", { page: safePage, totalPages })}
            </span>
            <button
              type="button"
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage >= totalPages}
              className="pagination-btn"
              title={t("txsPage.nextTitle")}
            >
              {t("txsPage.next")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
