import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { useDataService } from "../../../hooks/useDataService";
import { resolveNetwork } from "../../../utils/networkResolver";
import { getAllNetworks } from "../../../config/networks";
import type { SolanaTransaction } from "../../../types";
import { formatSol, formatSlotNumber, shortenSolanaAddress } from "../../../utils/solanaUtils";

export default function SolanaTransactionsPage() {
  const location = useLocation();
  const { t } = useTranslation("solana");

  const pathSlug = location.pathname.split("/")[1] || "sol";
  const network = resolveNetwork(pathSlug, getAllNetworks());
  const dataService = useDataService(network ?? pathSlug);

  const [transactions, setTransactions] = useState<SolanaTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTxs() {
      if (!dataService || !dataService.isSolana()) return;
      setLoading(true);
      try {
        const adapter = dataService.getSolanaAdapter();
        // Get latest blocks then fetch some transactions from them
        const blocks = await adapter.getLatestBlocks(3);
        const sigs: string[] = [];
        for (const b of blocks) {
          if (b.signatures) sigs.push(...b.signatures.slice(0, 15));
          if (sigs.length >= 30) break;
        }
        const txResults = await Promise.all(
          sigs.slice(0, 30).map((s) =>
            adapter
              .getTransaction(s)
              .then((r) => r.data)
              .catch(() => null),
          ),
        );
        const txs = txResults.filter((tx): tx is SolanaTransaction => tx !== null);
        if (!cancelled) {
          setTransactions(txs);
          setError(null);
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to fetch transactions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTxs();
    return () => {
      cancelled = true;
    };
  }, [dataService]);

  return (
    <div className="container-wide">
      <div className="block-display-card">
        <h1>{t("transactions.txsTitle")}</h1>
        {error && <p className="error-text-center">{error}</p>}
        {loading && transactions.length === 0 ? (
          <p>{t("common.loading")}</p>
        ) : transactions.length === 0 ? (
          <p>{t("transactions.noTransactions")}</p>
        ) : (
          <table className="data-table">
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
                  <td>
                    <Link to={`/${pathSlug}/tx/${tx.signature}`} title={tx.signature}>
                      {shortenSolanaAddress(tx.signature, 10, 8)}
                    </Link>
                  </td>
                  <td>
                    {tx.status === "success" ? t("transactions.success") : t("transactions.failed")}
                  </td>
                  <td>
                    <Link to={`/${pathSlug}/slot/${tx.slot}`}>#{formatSlotNumber(tx.slot)}</Link>
                  </td>
                  <td>{formatSol(tx.fee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
