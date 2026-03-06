import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Breadcrumb from "../../common/Breadcrumb";
import { getNetworkBySlug } from "../../../config/networks";
import { useDataService } from "../../../hooks/useDataService";
import type { BitcoinTransaction } from "../../../types";
import { formatBTC, formatTimeAgo, truncateHash } from "../../../utils/bitcoinFormatters";
import { calculateTotalOutput } from "../../../utils/bitcoinUtils";
import { logger } from "../../../utils/logger";
const TXS_PER_PAGE = 100;
const SKELETON_ROWS = 10;

export default function BitcoinTransactionsPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Extract network slug from path (e.g., "/tbtc/txs" → "tbtc")
  const networkSlug = location.pathname.split("/")[1] || "btc";
  const dataService = useDataService(networkSlug);
  const networkConfig = getNetworkBySlug(networkSlug);
  const networkName = networkConfig?.name ?? networkSlug;
  const networkLabel = networkConfig?.shortName || networkConfig?.name || networkSlug.toUpperCase();

  const [transactions, setTransactions] = useState<BitcoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestBlockHeight, setLatestBlockHeight] = useState<number | null>(null);
  const [currentBlock, setCurrentBlock] = useState<number | null>(null);

  const { t } = useTranslation("transaction");

  // Get block and page from URL params
  const blockParam = searchParams.get("block");
  const requestedBlock = blockParam ? Number(blockParam) : null;
  const pageParam = searchParams.get("page");
  const page = pageParam ? Math.max(1, Number(pageParam)) : 1;

  // Pagination computed values
  const totalTxs = transactions.length;
  const totalPages = Math.max(1, Math.ceil(totalTxs / TXS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * TXS_PER_PAGE;
  const endIndex = Math.min(startIndex + TXS_PER_PAGE, totalTxs);
  const displayedTxs = transactions.slice(startIndex, endIndex);

  useEffect(() => {
    if (!dataService || !dataService.isBitcoin()) {
      setLoading(false);
      return;
    }

    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);

      try {
        const adapter = dataService.getBitcoinAdapter();

        // Get the latest block height
        const latestHeight = await adapter.getLatestBlockNumber();
        setLatestBlockHeight(latestHeight);

        // Determine which block to fetch
        const blockHeight = requestedBlock !== null ? requestedBlock : latestHeight;
        setCurrentBlock(blockHeight);

        // Fetch all transactions from this block
        const txs = await adapter.getBlockTransactions(blockHeight);
        setTransactions(txs);
      } catch (err) {
        logger.error("Error fetching Bitcoin transactions:", err);
        setError(err instanceof Error ? err.message : t("btcTxs.failedToFetch"));
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [dataService, requestedBlock, t]);

  // Block navigation handlers (reset to page 1)
  const goToNewerBlock = () => {
    if (currentBlock === null || latestBlockHeight === null) return;
    const newBlock = currentBlock + 1;

    if (newBlock >= latestBlockHeight) {
      navigate(`/${networkSlug}/txs`);
    } else {
      navigate(`/${networkSlug}/txs?block=${newBlock}`);
    }
  };

  const goToOlderBlock = () => {
    if (currentBlock === null) return;
    const newBlock = currentBlock - 1;

    if (newBlock >= 0) {
      navigate(`/${networkSlug}/txs?block=${newBlock}`);
    }
  };

  const goToLatest = () => {
    navigate(`/${networkSlug}/txs`);
  };

  // Page navigation handlers
  const buildPageUrl = (targetPage: number) => {
    const blockPart = requestedBlock !== null ? `block=${requestedBlock}` : `block=${currentBlock}`;
    if (targetPage <= 1) return `/${networkSlug}/txs?${blockPart}`;
    return `/${networkSlug}/txs?${blockPart}&page=${targetPage}`;
  };

  const goToPrevPage = () => {
    if (safePage <= 1) return;
    navigate(buildPageUrl(safePage - 1));
  };

  const goToNextPage = () => {
    if (safePage >= totalPages) return;
    navigate(buildPageUrl(safePage + 1));
  };

  // Determine if we can navigate
  const canGoNewer =
    currentBlock !== null && latestBlockHeight !== null && currentBlock < latestBlockHeight;
  const canGoOlder = currentBlock !== null && currentBlock > 0;
  const isAtLatest = requestedBlock === null;
  const canGoPrev = safePage > 1;
  const canGoNext = safePage < totalPages;

  if (loading) {
    return (
      <div className="container-wide">
        <Breadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: networkLabel, to: `/${networkSlug}` },
            { label: "Transactions" },
          ]}
        />
        <div className="block-display-card">
          <div className="blocks-header">
            <span className="block-label">{t("btcTxs.title", { network: networkName })}</span>
          </div>
          <div className="table-wrapper">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>{t("btcTxs.txId")}</th>
                  <th>{t("btcTxs.block")}</th>
                  <th className="hide-mobile">{t("btcTxs.time")}</th>
                  <th>{t("btcTxs.inputs")}</th>
                  <th>{t("btcTxs.outputs")}</th>
                  <th>{t("btcTxs.value")}</th>
                  <th className="hide-mobile">{t("btcTxs.size")}</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
                  <tr key={i}>
                    <td>
                      <span className="skeleton-pulse" style={{ width: "120px", height: 14 }} />
                    </td>
                    <td>
                      <span className="skeleton-pulse" style={{ width: "70px", height: 14 }} />
                    </td>
                    <td className="hide-mobile">
                      <span className="skeleton-pulse" style={{ width: "60px", height: 14 }} />
                    </td>
                    <td>
                      <span className="skeleton-pulse" style={{ width: "40px", height: 14 }} />
                    </td>
                    <td>
                      <span className="skeleton-pulse" style={{ width: "40px", height: 14 }} />
                    </td>
                    <td>
                      <span className="skeleton-pulse" style={{ width: "80px", height: 14 }} />
                    </td>
                    <td className="hide-mobile">
                      <span className="skeleton-pulse" style={{ width: "60px", height: 14 }} />
                    </td>
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
        <Breadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: networkLabel, to: `/${networkSlug}` },
            { label: "Transactions" },
          ]}
        />
        <div className="block-display-card">
          <div className="blocks-header">
            <span className="block-label">{t("btcTxs.title", { network: networkName })}</span>
          </div>
          <div className="card-content">
            <p className="text-error margin-0">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  const Pagination = () => {
    return (
      <div className="pagination-container no-margin-top">
        {/** biome-ignore lint/a11y/useButtonType: <TODO> */}
        <button
          onClick={goToLatest}
          disabled={isAtLatest}
          className="pagination-btn"
          title={t("btcTxs.pagination.latestTitle")}
          aria-label={t("btcTxs.pagination.latestTitle")}
        >
          {t("btcTxs.pagination.latest")}
        </button>

        {/** biome-ignore lint/a11y/useButtonType: <TODO> */}
        <button
          onClick={goToNewerBlock}
          disabled={!canGoNewer}
          className="pagination-btn"
          title={t("btcTxs.pagination.newerBlockTitle")}
          aria-label={t("btcTxs.pagination.newerBlockTitle")}
        >
          {t("btcTxs.pagination.newerBlock")}
        </button>

        {/** biome-ignore lint/a11y/useButtonType: <TODO> */}
        <button
          onClick={goToOlderBlock}
          disabled={!canGoOlder}
          className="pagination-btn"
          title={t("btcTxs.pagination.olderBlockTitle")}
          aria-label={t("btcTxs.pagination.olderBlockTitle")}
        >
          {t("btcTxs.pagination.olderBlock")}
        </button>

        {totalPages > 1 && (
          <>
            <span className="pagination-divider">|</span>

            {/** biome-ignore lint/a11y/useButtonType: <TODO> */}
            <button
              onClick={goToPrevPage}
              disabled={!canGoPrev}
              className="pagination-btn"
              title={t("btcTxs.pagination.prevTitle")}
              aria-label={t("btcTxs.pagination.prevTitle")}
            >
              {t("btcTxs.pagination.prev")}
            </button>

            <span className="pagination-page-info">
              {t("btcTxs.pagination.pageInfo", { page: safePage, totalPages })}
            </span>

            {/** biome-ignore lint/a11y/useButtonType: <TODO> */}
            <button
              onClick={goToNextPage}
              disabled={!canGoNext}
              className="pagination-btn"
              title={t("btcTxs.pagination.nextTitle")}
              aria-label={t("btcTxs.pagination.nextTitle")}
            >
              {t("btcTxs.pagination.next")}
            </button>
          </>
        )}
      </div>
    );
  };

  const formattedBlock = currentBlock !== null ? currentBlock.toLocaleString() : "";
  const from = totalTxs > 0 ? (startIndex + 1).toLocaleString() : "0";
  const to = endIndex.toLocaleString();
  const total = totalTxs.toLocaleString();

  const message = isAtLatest
    ? t("btcTxs.latest", { from, to, total, block: formattedBlock })
    : t("btcTxs.range", { from, to, total, block: formattedBlock });

  return (
    <div className="container-wide">
      <Breadcrumb
        items={[
          { label: "Home", to: "/" },
          { label: networkLabel, to: `/${networkSlug}` },
          { label: "Transactions" },
        ]}
      />
      <div className="block-display-card">
        <div className="blocks-header">
          <div className="blocks-header-main">
            <span className="block-label">{t("btcTxs.title", { network: networkName })}</span>
            <span className="block-header-divider">•</span>
            <span className="blocks-header-info">{message}</span>
          </div>
        </div>

        <Pagination />

        {displayedTxs.length === 0 ? (
          <p className="table-cell-muted">{t("btcTxs.notFound")}</p>
        ) : (
          <div className="table-wrapper">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>{t("btcTxs.txId")}</th>
                  <th>{t("btcTxs.block")}</th>
                  <th className="hide-mobile">{t("btcTxs.time")}</th>
                  <th>{t("btcTxs.inputs")}</th>
                  <th>{t("btcTxs.outputs")}</th>
                  <th>{t("btcTxs.value")}</th>
                  <th className="hide-mobile">{t("btcTxs.size")}</th>
                </tr>
              </thead>
              <tbody>
                {displayedTxs.map((tx) => {
                  const isCoinbase = tx.vin.length === 1 && !tx.vin[0]?.txid;
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
                        <Link
                          to={`/${networkSlug}/block/${currentBlock}`}
                          className="table-cell-number"
                        >
                          {formattedBlock}
                        </Link>
                      </td>
                      <td className="table-cell-text hide-mobile">
                        {tx.blocktime ? formatTimeAgo(tx.blocktime) : "—"}
                      </td>
                      <td className="table-cell-value">
                        {isCoinbase ? (
                          <span className="btc-flag-yes" title={t("btcTxs.coinbase")}>
                            {t("btcTxs.coinbase")}
                          </span>
                        ) : (
                          tx.vin.length
                        )}
                      </td>
                      <td className="table-cell-value">{tx.vout.length}</td>
                      <td className="table-cell-text tx-value-highlight">
                        {formatBTC(calculateTotalOutput(tx))}
                      </td>
                      <td className="table-cell-muted hide-mobile">
                        {tx.vsize.toLocaleString()} vB
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination />
      </div>
    </div>
  );
}
