import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import { getNetworkBySlug } from "../../../config/networks";
import { useDataService } from "../../../hooks/useDataService";
import type { DataWithMetadata, SolanaTransaction } from "../../../types";
import { shortenSolanaAddress } from "../../../utils/solanaUtils";
import Breadcrumb from "../../common/Breadcrumb";
import LoaderWithTimeout from "../../common/LoaderWithTimeout";
import SolanaTransactionDisplay from "./SolanaTransactionDisplay";

export default function SolanaTransactionPage() {
  const { filter: signature } = useParams<{ filter: string }>();
  const location = useLocation();
  const { t } = useTranslation("solana");

  const networkSlug = location.pathname.split("/")[1] || "sol";
  const dataService = useDataService(networkSlug);
  const networkConfig = getNetworkBySlug(networkSlug);
  const networkLabel = networkConfig?.shortName || networkConfig?.name || networkSlug.toUpperCase();

  const [txResult, setTxResult] = useState<DataWithMetadata<SolanaTransaction> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataService || !dataService.isSolana() || !signature) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchTx = async () => {
      setLoading(true);
      setError(null);
      try {
        const adapter = dataService.getSolanaAdapter();
        const result = await adapter.getTransaction(signature);
        if (!cancelled) setTxResult(result);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch transaction");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTx();
    return () => {
      cancelled = true;
    };
  }, [dataService, signature]);

  const breadcrumbItems = [
    { label: "Home", to: "/" },
    { label: networkLabel, to: `/${networkSlug}` },
    { label: t("transactions.txsTitle"), to: `/${networkSlug}/txs` },
    { label: signature ? shortenSolanaAddress(signature, 8, 8) : t("transaction.title") },
  ];

  if (loading) {
    return (
      <div className="container-wide page-container-padded">
        <Breadcrumb items={breadcrumbItems} />
        <div className="page-card">
          <div className="block-display-header">
            <span className="block-label">{t("transaction.title")}</span>
            <span className="tx-mono header-subtitle">
              {signature ? shortenSolanaAddress(signature, 10, 10) : ""}
            </span>
          </div>
          <div className="card-content-loading">
            <LoaderWithTimeout
              text="Loading transaction data..."
              onRetry={() => window.location.reload()}
            />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-wide page-container-padded">
        <Breadcrumb items={breadcrumbItems} />
        <div className="page-card">
          <div className="block-display-header">
            <span className="block-label">{t("transaction.title")}</span>
          </div>
          <div className="card-content">
            <p className="text-error margin-0">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-wide page-container-padded">
      <Breadcrumb items={breadcrumbItems} />
      {txResult?.data ? (
        <SolanaTransactionDisplay tx={txResult.data} networkId={networkSlug} />
      ) : (
        <div className="page-card">
          <div className="card-content">
            <p className="text-muted margin-0">{t("transactions.noTransactions")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
