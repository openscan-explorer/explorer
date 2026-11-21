import type React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { ZcashTransaction } from "../../../types";
import { truncateHash } from "../../../utils/zcashFormatters";
import { classifyTransaction } from "../../../utils/zcashUtils";
import { ZcashKindBadge, ZcashOutputValue, ZcashSkeleton } from "./ZcashCells";

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
                <ZcashSkeleton width={90} />
              </div>
              <div className="dashboard-tx-details">
                <ZcashSkeleton width={60} size="small" />
              </div>
              <div className="dashboard-tx-value">
                <ZcashSkeleton width={70} />
              </div>
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="dashboard-table-empty">{t("transactions.noTransactions")}</div>
      ) : (
        <div className="dashboard-table-compact dashboard-table-scrollable">
          {transactions.map((tx) => (
            <div key={tx.txid} className="dashboard-table-row">
              <div className="dashboard-tx-info">
                <Link to={`/${networkId}/tx/${tx.txid}`} className="dashboard-tx-hash tx-mono">
                  {truncateHash(tx.txid, "medium")}
                </Link>
              </div>
              <div className="dashboard-tx-details">
                <ZcashKindBadge kind={classifyTransaction(tx)} />
              </div>
              <div className="dashboard-tx-value">
                <ZcashOutputValue transaction={tx} currency={currency} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ZcashTransactionsTable;
