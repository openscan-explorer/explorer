import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { getNetworkBySlug } from "../../../config/networks";
import { useDataService } from "../../../hooks/useDataService";
import type { SolanaTransaction } from "../../../types";
import { logger } from "../../../utils/logger";
import { formatSlotNumber, formatSol, shortenSolanaAddress } from "../../../utils/solanaUtils";
import Breadcrumb from "../../common/Breadcrumb";

const TXS_PER_PAGE = 30;
const SKELETON_ROWS = 15;

export default function SolanaTransactionsPage() {
  const location = useLocation();
  const { t } = useTranslation("solana");

  const networkSlug = location.pathname.split("/")[1] || "sol";
  const dataService = useDataService(networkSlug);
  const networkConfig = getNetworkBySlug(networkSlug);
  const networkLabel = networkConfig?.shortName || networkConfig?.name || networkSlug.toUpperCase();

  const [transactions, setTransactions] = useState<SolanaTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataService || !dataService.isSolana()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchTxs = async () => {
      setLoading(true);
      setError(null);
      try {
        const adapter = dataService.getSolanaAdapter();
        const blocks = await adapter.getLatestBlocks(3);
        const sigs: string[] = [];
        for (const b of blocks) {
          if (b.signatures) sigs.push(...b.signatures.slice(0, 15));
          if (sigs.length >= TXS_PER_PAGE) break;
        }
        const txResults = await Promise.all(
          sigs.slice(0, TXS_PER_PAGE).map((s) =>
            adapter
              .getTransaction(s)
              .then((r) => r.data)
              .catch(() => null),
          ),
        );
        const txs = txResults.filter((tx): tx is SolanaTransaction => tx !== null);
        if (!cancelled) setTransactions(txs);
      } catch (err) {
        logger.error("Error fetching Solana transactions:", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch transactions");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTxs();
    return () => {
      cancelled = true;
    };
  }, [dataService]);

  const breadcrumbItems = [
    { label: "Home", to: "/" },
    { label: networkLabel, to: `/${networkSlug}` },
    { label: t("transactions.txsTitle") },
  ];

  if (loading) {
    return (
      <div className="container-wide">
        <Breadcrumb items={breadcrumbItems} />
        <div className="block-display-card">
          <div className="blocks-header">
            <span className="block-label">{t("transactions.title")}</span>
          </div>
          <div className="table-wrapper">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>{t("transactions.signature")}</th>
                  <th>{t("transactions.status")}</th>
                  <th>{t("transactions.slot")}</th>
                  <th>{t("transactions.fee")}</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
                  <tr key={i}>
                    <td>
                      <span className="skeleton-pulse" style={{ width: "150px", height: 14 }} />
                    </td>
                    <td>
                      <span className="skeleton-pulse" style={{ width: "60px", height: 14 }} />
                    </td>
                    <td>
                      <span className="skeleton-pulse" style={{ width: "80px", height: 14 }} />
                    </td>
                    <td>
                      <span className="skeleton-pulse" style={{ width: "70px", height: 14 }} />
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
        <Breadcrumb items={breadcrumbItems} />
        <div className="block-display-card">
          <div className="blocks-header">
            <span className="block-label">{t("transactions.title")}</span>
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
      <Breadcrumb items={breadcrumbItems} />
      <div className="block-display-card">
        <div className="blocks-header">
          <div className="blocks-header-main">
            <span className="block-label">{t("transactions.title")}</span>
            <span className="block-header-divider">•</span>
            <span className="blocks-header-info">
              Showing {transactions.length} most recent transactions
            </span>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="dash-table">
            <thead>
              <tr>
                <th>{t("transactions.signature")}</th>
                <th>{t("transactions.status")}</th>
                <th>{t("transactions.slot")}</th>
                <th>{t("transactions.fee")}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.signature}>
                  <td className="table-cell-mono">
                    <Link
                      to={`/${networkSlug}/tx/${tx.signature}`}
                      className="table-cell-address"
                      title={tx.signature}
                    >
                      {shortenSolanaAddress(tx.signature, 12, 12)}
                    </Link>
                  </td>
                  <td>
                    {tx.status === "success" ? (
                      <span className="table-status-badge table-status-success">
                        ✓ {t("transactions.success")}
                      </span>
                    ) : (
                      <span className="table-status-badge table-status-failed">
                        ✗ {t("transactions.failed")}
                      </span>
                    )}
                  </td>
                  <td>
                    <Link to={`/${networkSlug}/slot/${tx.slot}`} className="table-cell-number">
                      {formatSlotNumber(tx.slot)}
                    </Link>
                  </td>
                  <td className="table-cell-value">{formatSol(tx.fee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
