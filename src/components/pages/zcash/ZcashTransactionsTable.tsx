import type React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { ZcashTransaction, ZcashTxKind } from "../../../types";
import { formatZEC, truncateHash } from "../../../utils/zcashFormatters";
import { classifyTransaction, getTransparentOutputZat } from "../../../utils/zcashUtils";

const KIND_LABEL_KEYS = {
  coinbase: "transactions.kinds.coinbase",
  transparent: "transactions.kinds.transparent",
  shielding: "transactions.kinds.shielding",
  deshielding: "transactions.kinds.deshielding",
  shielded: "transactions.kinds.shielded",
  mixed: "transactions.kinds.mixed",
} as const satisfies Record<ZcashTxKind, string>;

interface ZcashTransactionsTableProps {
  transactions: ZcashTransaction[];
  loading: boolean;
  networkId: string;
  currency: string;
}

const ZcashTransactionsTable: React.FC<ZcashTransactionsTableProps> = ({
  transactions,
  loading,
  networkId,
  currency,
}) => {
  const { t } = useTranslation("zcash");

  return (
    <div
      className="dashboard-table-section dashboard-table-section-full"
      data-testid="zcash-transactions-table"
    >
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
        <div className="dashboard-table-compact dashboard-table-scrollable">
          {Array.from({ length: 5 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
            <div key={i} className="dashboard-table-row">
              <div className="dashboard-tx-info">
                <span
                  className="skeleton-pulse"
                  style={{ width: "90px", height: 14, display: "inline-block" }}
                />
              </div>
              <div className="dashboard-tx-details">
                <span
                  className="skeleton-pulse"
                  style={{ width: "60px", height: 12, display: "inline-block" }}
                />
              </div>
              <div className="dashboard-tx-value">
                <span
                  className="skeleton-pulse"
                  style={{ width: "70px", height: 14, display: "inline-block" }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="dashboard-table-empty">{t("transactions.noTransactions")}</div>
      ) : (
        <div className="dashboard-table-compact dashboard-table-scrollable">
          {transactions.map((tx) => {
            const kind = classifyTransaction(tx);
            const transparentOutputZat = getTransparentOutputZat(tx);

            return (
              <div key={tx.txid} className="dashboard-table-row">
                <div className="dashboard-tx-info">
                  <Link to={`/${networkId}/tx/${tx.txid}`} className="dashboard-tx-hash tx-mono">
                    {truncateHash(tx.txid, "medium")}
                  </Link>
                </div>
                <div className="dashboard-tx-details">
                  <span className={`zec-kind-badge zec-kind-${kind}`}>
                    {t(KIND_LABEL_KEYS[kind])}
                  </span>
                </div>
                <div className="dashboard-tx-value">
                  {transparentOutputZat > 0 ? (
                    <span className="tx-value-highlight">
                      {formatZEC(transparentOutputZat, currency)}
                    </span>
                  ) : (
                    <span className="text-muted">{t("transactions.shieldedValue")}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ZcashTransactionsTable;
