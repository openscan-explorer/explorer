import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { getNetworkBySlug } from "../../../config/networks";
import { TXS_PER_PAGE } from "../../../config/zcashConstants";
import { useDataService } from "../../../hooks/useDataService";
import type { ZcashBlock, ZcashTransaction } from "../../../types";
import { logger } from "../../../utils/logger";
import { formatNumber, formatSize, formatZEC, truncateHash } from "../../../utils/zcashFormatters";
import { classifyTransaction, getTransparentOutputZat } from "../../../utils/zcashUtils";
import Breadcrumb from "../../common/Breadcrumb";
import { TX_KIND_LABEL_KEYS } from "./labels";

const SKELETON_ROWS = 10;

const skeletonCell = (width: string) => (
  <span className="skeleton-pulse" style={{ width, height: 14 }} />
);

export default function ZcashTransactionsPage() {
  const { t } = useTranslation("zcash");
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Extract network slug from path (e.g., "/tzec/txs" → "tzec")
  const networkSlug = location.pathname.split("/")[1] || "zec";
  const dataService = useDataService(networkSlug);
  const network = getNetworkBySlug(networkSlug);
  const networkName = network?.name ?? networkSlug;
  const networkLabel = network?.shortName || networkSlug.toUpperCase();
  const currency = network?.currency ?? "ZEC";

  const blockParam = searchParams.get("block");
  const requestedBlock =
    blockParam !== null && /^\d+$/.test(blockParam) ? Number(blockParam) : null;
  const pageParam = Number(searchParams.get("page"));
  const page = Number.isInteger(pageParam) && pageParam > 1 ? pageParam : 1;

  const [block, setBlock] = useState<ZcashBlock | null>(null);
  const [transactions, setTransactions] = useState<ZcashTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataService || !dataService.isZcash()) return;

    let cancelled = false;
    const adapter = dataService.getZcashAdapter();

    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);

      try {
        const height = requestedBlock ?? (await adapter.getLatestBlockNumber());
        const { data } = await adapter.getBlock(height);
        if (cancelled) return;
        setBlock(data.block);
        setTransactions(data.transactions);
      } catch (err) {
        logger.error("Error fetching Zcash transactions:", err);
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTransactions();
    return () => {
      cancelled = true;
    };
  }, [dataService, requestedBlock]);

  const totalPages = Math.max(1, Math.ceil(transactions.length / TXS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * TXS_PER_PAGE;
  const displayed = transactions.slice(startIndex, startIndex + TXS_PER_PAGE);

  const currentHeight = block?.height ?? null;
  // The tip height follows from the block's confirmations, so paging costs no extra call
  const latestHeight = block?.confirmations ? block.height + block.confirmations - 1 : null;
  const isAtLatest = requestedBlock === null;
  const canGoNewer =
    !isAtLatest && currentHeight !== null && latestHeight !== null && currentHeight < latestHeight;
  const canGoOlder = currentHeight !== null && currentHeight > 0;

  const buildUrl = (height: number | null, targetPage = 1) => {
    const params = new URLSearchParams();
    if (height !== null) params.set("block", String(height));
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return `/${networkSlug}/txs${query ? `?${query}` : ""}`;
  };

  const goToNewerBlock = () => {
    if (currentHeight === null || latestHeight === null) return;
    const next = currentHeight + 1;
    navigate(buildUrl(next >= latestHeight ? null : next));
  };

  const goToOlderBlock = () => {
    if (currentHeight !== null) navigate(buildUrl(currentHeight - 1));
  };

  const breadcrumb = (
    <Breadcrumb
      items={[
        { label: t("breadcrumb.home"), to: "/" },
        { label: networkLabel, to: `/${networkSlug}` },
        { label: t("breadcrumb.transactions") },
      ]}
    />
  );

  const header = (message?: string) => (
    <div className="blocks-header">
      <div className="blocks-header-main">
        <span className="block-label">{t("txsPage.title", { network: networkName })}</span>
        {message && (
          <>
            <span className="block-header-divider">•</span>
            <span className="blocks-header-info">{message}</span>
          </>
        )}
      </div>
    </div>
  );

  const tableHead = (
    <thead>
      <tr>
        <th>{t("txsPage.txid")}</th>
        <th>{t("txsPage.kind")}</th>
        <th className="hide-mobile">{t("txsPage.transparentIo")}</th>
        <th>{t("txsPage.value")}</th>
        <th className="hide-mobile">{t("txsPage.size")}</th>
      </tr>
    </thead>
  );

  if (loading) {
    return (
      <div className="container-wide">
        {breadcrumb}
        <div className="block-display-card">
          {header()}
          <div className="table-wrapper">
            <table className="dash-table">
              {tableHead}
              <tbody>
                {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
                  <tr key={i}>
                    <td>{skeletonCell("120px")}</td>
                    <td>{skeletonCell("70px")}</td>
                    <td className="hide-mobile">{skeletonCell("60px")}</td>
                    <td>{skeletonCell("80px")}</td>
                    <td className="hide-mobile">{skeletonCell("60px")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-wide">
        {breadcrumb}
        <div className="block-display-card">
          {header()}
          <div className="card-content">
            <p className="text-error margin-0">{t("txsPage.loadError", { message: error })}</p>
          </div>
        </div>
      </div>
    );
  }

  const messageValues = {
    from: formatNumber(transactions.length > 0 ? startIndex + 1 : 0),
    to: formatNumber(startIndex + displayed.length),
    total: formatNumber(transactions.length),
    block: formatNumber(currentHeight),
  };

  const pagination = (
    <div className="pagination-container no-margin-top">
      <button
        type="button"
        onClick={() => navigate(buildUrl(null))}
        disabled={isAtLatest}
        className="pagination-btn"
        title={t("txsPage.latestTitle")}
      >
        {t("txsPage.latestButton")}
      </button>
      <button
        type="button"
        onClick={goToNewerBlock}
        disabled={!canGoNewer}
        className="pagination-btn"
        title={t("txsPage.newerBlockTitle")}
      >
        {t("txsPage.newerBlock")}
      </button>
      <button
        type="button"
        onClick={goToOlderBlock}
        disabled={!canGoOlder}
        className="pagination-btn"
        title={t("txsPage.olderBlockTitle")}
      >
        {t("txsPage.olderBlock")}
      </button>
      {totalPages > 1 && (
        <>
          <span className="pagination-divider">|</span>
          <button
            type="button"
            onClick={() => navigate(buildUrl(currentHeight, safePage - 1))}
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
            onClick={() => navigate(buildUrl(currentHeight, safePage + 1))}
            disabled={safePage >= totalPages}
            className="pagination-btn"
            title={t("txsPage.nextTitle")}
          >
            {t("txsPage.next")}
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="container-wide">
      {breadcrumb}
      <div className="block-display-card">
        {header(t(isAtLatest ? "txsPage.latest" : "txsPage.range", messageValues))}
        {pagination}

        {displayed.length === 0 ? (
          <p className="table-cell-muted">{t("txsPage.empty")}</p>
        ) : (
          <div className="table-wrapper">
            <table className="dash-table">
              {tableHead}
              <tbody>
                {displayed.map((tx) => {
                  const kind = classifyTransaction(tx);
                  const transparentOutputZat = getTransparentOutputZat(tx);
                  return (
                    <tr key={tx.txid}>
                      <td className="table-cell-mono">
                        <Link
                          to={`/${networkSlug}/tx/${tx.txid}`}
                          className="table-cell-address"
                          title={tx.txid}
                        >
                          {truncateHash(tx.txid, "long")}
                        </Link>
                      </td>
                      <td>
                        <span className={`zec-kind-badge zec-kind-${kind}`}>
                          {t(TX_KIND_LABEL_KEYS[kind])}
                        </span>
                      </td>
                      <td className="table-cell-value hide-mobile">
                        {t("txsPage.ioCount", { inputs: tx.vin.length, outputs: tx.vout.length })}
                      </td>
                      <td className="table-cell-text">
                        {transparentOutputZat > 0 ? (
                          <span className="tx-value-highlight">
                            {formatZEC(transparentOutputZat, currency)}
                          </span>
                        ) : (
                          <span className="text-muted">{t("transactions.shieldedValue")}</span>
                        )}
                      </td>
                      <td className="table-cell-muted hide-mobile">{formatSize(tx.size)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination}
      </div>
    </div>
  );
}
