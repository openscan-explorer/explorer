import type React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { SolanaTransaction } from "../../../types";
import { formatSol, shortenSolanaAddress } from "../../../utils/solanaUtils";

interface SolanaTransactionsTableProps {
  transactions: SolanaTransaction[];
  loading: boolean;
  networkId: string;
}

const SolanaTransactionsTable: React.FC<SolanaTransactionsTableProps> = ({
  transactions,
  loading,
  networkId,
}) => {
  const { t } = useTranslation("solana");

  return (
    <div className="dashboard-table-section dashboard-table-section-full">
      <div className="dashboard-table-header">
        <Link to={`/${networkId}/txs`} className="dashboard-table-title-link">
          <h3 className="dashboard-table-title">{t("transactions.title")}</h3>
          <span className="dashboard-title-arrow">↗</span>
        </Link>
        <Link to={`/${networkId}/txs`} className="dashboard-view-all">
          {t("transactions.viewAll")} →
        </Link>
      </div>

      {loading && transactions.length === 0 ? (
        <div className="dashboard-table-compact">
          {Array.from({ length: 5 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
            <div key={i} className="dashboard-table-row">
              <span
                className="skeleton-pulse"
                style={{ width: "100%", height: 14, display: "inline-block" }}
              />
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="dashboard-table-empty">{t("transactions.noTransactions")}</div>
      ) : (
        <div className="dashboard-table-compact">
          {transactions.map((tx) => (
            <div key={tx.signature} className="dashboard-table-row">
              <div className="dashboard-block-info">
                <Link
                  to={`/${networkId}/tx/${tx.signature}`}
                  className="dashboard-block-number"
                  title={tx.signature}
                >
                  {shortenSolanaAddress(tx.signature, 8, 6)}
                </Link>
                <span className="dashboard-block-time">
                  {tx.status === "success" ? t("transactions.success") : t("transactions.failed")}
                </span>
              </div>
              <div className="dashboard-block-details">
                <span className="dashboard-block-txns">{formatSol(tx.fee)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SolanaTransactionsTable;
