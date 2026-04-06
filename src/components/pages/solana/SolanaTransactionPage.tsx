import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "react-router-dom";
import { useDataService } from "../../../hooks/useDataService";
import { resolveNetwork } from "../../../utils/networkResolver";
import { getAllNetworks } from "../../../config/networks";
import type { SolanaTransaction } from "../../../types";
import { formatBlockTime, formatSol, formatSlotNumber } from "../../../utils/solanaUtils";

export default function SolanaTransactionPage() {
  const { filter: signature } = useParams<{ filter: string }>();
  const location = useLocation();
  const { t } = useTranslation("solana");

  const pathSlug = location.pathname.split("/")[1] || "sol";
  const network = resolveNetwork(pathSlug, getAllNetworks());
  const dataService = useDataService(network ?? pathSlug);

  const [tx, setTx] = useState<SolanaTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTx() {
      if (!dataService || !dataService.isSolana() || !signature) return;
      setLoading(true);
      try {
        const adapter = dataService.getSolanaAdapter();
        const result = await adapter.getTransaction(signature);
        if (!cancelled) {
          setTx(result.data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to fetch transaction");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTx();
    return () => {
      cancelled = true;
    };
  }, [dataService, signature]);

  if (loading)
    return (
      <div className="container-wide">
        <p>{t("common.loading")}</p>
      </div>
    );
  if (error)
    return (
      <div className="container-wide">
        <p className="error-text-center">{error}</p>
      </div>
    );
  if (!tx)
    return (
      <div className="container-wide">
        <p>{t("transactions.noTransactions")}</p>
      </div>
    );

  return (
    <div className="container-wide">
      <div className="block-display-card">
        <h1>{t("transaction.title")}</h1>

        <div className="data-section">
          <div className="data-row">
            <span className="data-label">{t("transaction.signature")}:</span>
            <span className="data-value">{tx.signature}</span>
          </div>
          <div className="data-row">
            <span className="data-label">{t("transaction.status")}:</span>
            <span className="data-value">
              {tx.status === "success" ? t("transactions.success") : t("transactions.failed")}
            </span>
          </div>
          <div className="data-row">
            <span className="data-label">{t("transaction.slot")}:</span>
            <span className="data-value">
              <Link to={`/${pathSlug}/slot/${tx.slot}`}>#{formatSlotNumber(tx.slot)}</Link>
            </span>
          </div>
          <div className="data-row">
            <span className="data-label">{t("transaction.blockTime")}:</span>
            <span className="data-value">{formatBlockTime(tx.blockTime)}</span>
          </div>
          <div className="data-row">
            <span className="data-label">{t("transaction.fee")}:</span>
            <span className="data-value">{formatSol(tx.fee)}</span>
          </div>
          {tx.computeUnitsConsumed !== undefined && (
            <div className="data-row">
              <span className="data-label">{t("transaction.computeUnits")}:</span>
              <span className="data-value">{tx.computeUnitsConsumed.toLocaleString()}</span>
            </div>
          )}
          {tx.version !== undefined && (
            <div className="data-row">
              <span className="data-label">{t("transaction.version")}:</span>
              <span className="data-value">{String(tx.version)}</span>
            </div>
          )}
        </div>

        {tx.signers.length > 0 && (
          <div className="data-section">
            <h2>{t("transaction.signers")}</h2>
            <ul className="data-list">
              {tx.signers.map((s) => (
                <li key={s}>
                  <Link to={`/${pathSlug}/account/${s}`}>{s}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tx.accountKeys.length > 0 && (
          <div className="data-section">
            <h2>{t("transaction.accountKeys")}</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("transaction.programId")}</th>
                  <th>{t("transaction.signer")}</th>
                  <th>{t("transaction.writable")}</th>
                </tr>
              </thead>
              <tbody>
                {tx.accountKeys.map((key) => (
                  <tr key={key.pubkey}>
                    <td>
                      <Link to={`/${pathSlug}/account/${key.pubkey}`}>{key.pubkey}</Link>
                    </td>
                    <td>{key.signer ? "✓" : ""}</td>
                    <td>{key.writable ? "✓" : t("transaction.readonly")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tx.instructions.length > 0 && (
          <div className="data-section">
            <h2>{t("transaction.instructions")}</h2>
            {tx.instructions.map((ix, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: instructions are ordered
              <div key={i} className="instruction-card">
                <div className="data-row">
                  <span className="data-label">{t("transaction.programId")}:</span>
                  <span className="data-value">{ix.programId}</span>
                </div>
                {ix.accounts.length > 0 && (
                  <div className="data-row">
                    <span className="data-label">{t("transaction.accounts")}:</span>
                    <span className="data-value">{ix.accounts.join(", ")}</span>
                  </div>
                )}
                {ix.data && (
                  <div className="data-row">
                    <span className="data-label">{t("transaction.data")}:</span>
                    <span className="data-value">{ix.data}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tx.logMessages.length > 0 && (
          <div className="data-section">
            <h2>{t("transaction.logs")}</h2>
            <pre className="log-output">{tx.logMessages.join("\n")}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
