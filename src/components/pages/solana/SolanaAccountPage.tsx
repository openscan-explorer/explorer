import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import { getNetworkBySlug } from "../../../config/networks";
import { useDataService } from "../../../hooks/useDataService";
import type { SolanaAccount, SolanaSignatureInfo } from "../../../types";
import { shortenSolanaAddress } from "../../../utils/solanaUtils";
import Breadcrumb from "../../common/Breadcrumb";
import LoaderWithTimeout from "../../common/LoaderWithTimeout";
import SolanaAccountDisplay from "./SolanaAccountDisplay";

export default function SolanaAccountPage() {
  const { address } = useParams<{ address: string }>();
  const location = useLocation();
  const { t } = useTranslation("solana");

  const networkSlug = location.pathname.split("/")[1] || "sol";
  const dataService = useDataService(networkSlug);
  const networkConfig = getNetworkBySlug(networkSlug);
  const networkLabel = networkConfig?.shortName || networkConfig?.name || networkSlug.toUpperCase();

  const [account, setAccount] = useState<SolanaAccount | null>(null);
  const [signatures, setSignatures] = useState<SolanaSignatureInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataService || !dataService.isSolana() || !address) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchAccount = async () => {
      setLoading(true);
      setError(null);
      try {
        const adapter = dataService.getSolanaAdapter();
        const [accountResult, sigsResult] = await Promise.all([
          adapter.getAccount(address),
          adapter.getSignaturesForAddress(address, { limit: 25 }).catch(() => []),
        ]);
        if (!cancelled) {
          setAccount(accountResult.data);
          setSignatures(sigsResult);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch account");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAccount();
    return () => {
      cancelled = true;
    };
  }, [dataService, address]);

  const breadcrumbItems = [
    { label: "Home", to: "/" },
    { label: networkLabel, to: `/${networkSlug}` },
    { label: t("account.title") },
    { label: address ? shortenSolanaAddress(address, 6, 6) : "" },
  ];

  if (loading) {
    return (
      <div className="container-wide page-container-padded">
        <Breadcrumb items={breadcrumbItems} />
        <div className="page-card">
          <div className="block-display-header">
            <span className="block-label">{t("account.title")}</span>
            <span className="tx-mono header-subtitle">
              {address ? shortenSolanaAddress(address, 8, 8) : ""}
            </span>
          </div>
          <div className="card-content-loading">
            <LoaderWithTimeout
              text="Loading account data..."
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
            <span className="block-label">{t("account.title")}</span>
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
      {account ? (
        <SolanaAccountDisplay account={account} signatures={signatures} networkId={networkSlug} />
      ) : (
        <div className="page-card">
          <div className="card-content">
            <p className="text-muted margin-0">Account not found</p>
          </div>
        </div>
      )}
    </div>
  );
}
