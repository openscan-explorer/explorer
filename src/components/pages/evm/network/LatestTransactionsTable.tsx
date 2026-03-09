import type React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { Transaction } from "../../../../types";

interface LatestTransactionsTableProps {
  transactions: Transaction[];
  networkId: number;
  currency: string;
  loading: boolean;
}

function truncateHash(hash: string): string {
  if (!hash) return "—";
  return `${hash.slice(0, 10)}...`;
}

function truncateAddress(address: string): string {
  if (!address) return "—";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatValue(value: string, currency: string): string {
  try {
    const wei = BigInt(value);
    const eth = Number(wei) / 1e18;
    if (eth === 0) return `0 ${currency}`;
    if (eth < 0.0001) return `<0.0001 ${currency}`;
    if (eth < 1) return `${eth.toFixed(4)} ${currency}`;
    return `${eth.toFixed(2)} ${currency}`;
  } catch {
    return `0 ${currency}`;
  }
}

const LatestTransactionsTable: React.FC<LatestTransactionsTableProps> = ({
  transactions,
  networkId,
  currency,
  loading,
}) => {
  const { t } = useTranslation("network");

  return (
    <div className="dashboard-table-section">
      <div className="dashboard-table-header">
        <Link to={`/${networkId}/txs`} className="dashboard-table-title-link">
          <h3 className="dashboard-table-title">{t("latestTransactions")}</h3>
          <span className="dashboard-title-arrow">↗</span>
        </Link>
        <Link to={`/${networkId}/txs`} className="dashboard-view-all">
          {t("viewAll")}
        </Link>
      </div>

      {loading && transactions.length === 0 ? (
        <div className="dashboard-table-compact">
          {Array.from({ length: 5 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
            <div key={i} className="dashboard-table-row">
              <div className="dashboard-tx-info">
                <span className="dashboard-tx-hash" style={{ pointerEvents: "none" }}>
                  <span
                    className="skeleton-pulse"
                    style={{ width: "90px", height: 14, display: "inline-block" }}
                  />
                </span>
              </div>
              <div className="dashboard-tx-addresses">
                <span className="dashboard-tx-from" style={{ pointerEvents: "none" }}>
                  <span
                    className="skeleton-pulse"
                    style={{ width: "70px", height: 12, display: "inline-block" }}
                  />
                </span>
                <span className="dashboard-tx-arrow">→</span>
                <span className="dashboard-tx-to" style={{ pointerEvents: "none" }}>
                  <span
                    className="skeleton-pulse"
                    style={{ width: "70px", height: 12, display: "inline-block" }}
                  />
                </span>
              </div>
              <div className="dashboard-tx-value">
                <span
                  className="skeleton-pulse"
                  style={{ width: "60px", height: 12, display: "inline-block" }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="dashboard-table-empty">{t("noTransactionsFound")}</div>
      ) : (
        <div className="dashboard-table-compact">
          {transactions.map((tx) => (
            <div key={tx.hash} className="dashboard-table-row">
              <div className="dashboard-tx-info">
                <Link
                  to={`/${networkId}/tx/${tx.hash}`}
                  className="dashboard-tx-hash"
                  title={tx.hash}
                >
                  {truncateHash(tx.hash)}
                </Link>
              </div>
              <div className="dashboard-tx-addresses">
                <Link
                  to={`/${networkId}/address/${tx.from}`}
                  className="dashboard-tx-from"
                  title={tx.from}
                >
                  {truncateAddress(tx.from)}
                </Link>
                <span className="dashboard-tx-arrow">→</span>
                {tx.to ? (
                  <Link
                    to={`/${networkId}/address/${tx.to}`}
                    className="dashboard-tx-to"
                    title={tx.to}
                  >
                    {truncateAddress(tx.to)}
                  </Link>
                ) : (
                  <span className="dashboard-tx-contract">{t("contractCreation")}</span>
                )}
              </div>
              <div className="dashboard-tx-value">{formatValue(tx.value, currency)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LatestTransactionsTable;
