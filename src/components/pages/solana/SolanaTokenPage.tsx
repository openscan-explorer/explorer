import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "react-router-dom";
import { getNetworkBySlug } from "../../../config/networks";
import { useDataService } from "../../../hooks/useDataService";
import type { SolanaTokenAmount, SolanaTokenLargestAccount } from "../../../types";
import { shortenSolanaAddress } from "../../../utils/solanaUtils";
import Breadcrumb from "../../common/Breadcrumb";
import CopyButton from "../../common/CopyButton";
import LoaderWithTimeout from "../../common/LoaderWithTimeout";

export default function SolanaTokenPage() {
  const { mint } = useParams<{ mint: string }>();
  const location = useLocation();
  const { t } = useTranslation("solana");

  const networkSlug = location.pathname.split("/")[1] || "sol";
  const dataService = useDataService(networkSlug);
  const networkConfig = getNetworkBySlug(networkSlug);
  const networkLabel = networkConfig?.shortName || networkConfig?.name || networkSlug.toUpperCase();

  const [supply, setSupply] = useState<SolanaTokenAmount | null>(null);
  const [holders, setHolders] = useState<SolanaTokenLargestAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataService || !dataService.isSolana() || !mint) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchToken = async () => {
      setLoading(true);
      setError(null);
      try {
        const adapter = dataService.getSolanaAdapter();
        const [supplyResult, holdersResult] = await Promise.all([
          adapter.getTokenSupply(mint),
          adapter.getTokenLargestAccounts(mint),
        ]);
        if (!cancelled) {
          setSupply(supplyResult);
          setHolders(holdersResult);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch token");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchToken();
    return () => {
      cancelled = true;
    };
  }, [dataService, mint]);

  const breadcrumbItems = [
    { label: "Home", to: "/" },
    { label: networkLabel, to: `/${networkSlug}` },
    { label: t("token.title") },
    { label: mint ? shortenSolanaAddress(mint, 6, 6) : "" },
  ];

  if (loading) {
    return (
      <div className="container-wide page-container-padded">
        <Breadcrumb items={breadcrumbItems} />
        <div className="page-card">
          <div className="block-display-header">
            <span className="block-label">{t("token.title")}</span>
          </div>
          <div className="card-content-loading">
            <LoaderWithTimeout
              text="Loading token data..."
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
            <span className="block-label">{t("token.title")}</span>
          </div>
          <div className="card-content">
            <p className="text-error margin-0">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  const totalSupplyNum = supply ? Number(supply.amount) : 0;

  return (
    <div className="container-wide page-container-padded">
      <Breadcrumb items={breadcrumbItems} />
      <div className="page-with-analysis">
        <div className="block-display-card">
          <div className="block-display-header">
            <span className="block-label">{t("token.title")}</span>
            <span className="block-status-badge block-status-finalized">SPL</span>
          </div>

          <div className="tx-details">
            <div className="tx-row">
              <span className="tx-label">{t("token.mint")}:</span>
              <span
                className="tx-value tx-mono"
                style={{ display: "inline-flex", alignItems: "center" }}
              >
                {mint}
                {mint && <CopyButton value={mint} />}
              </span>
            </div>
            {supply && (
              <>
                <div className="tx-row">
                  <span className="tx-label">{t("token.totalSupply")}:</span>
                  <span className="tx-value tx-value-highlight">{supply.uiAmountString}</span>
                </div>
                <div className="tx-row">
                  <span className="tx-label">{t("token.decimals")}:</span>
                  <span className="tx-value">{supply.decimals}</span>
                </div>
              </>
            )}
          </div>

          <div className="block-display-section">
            <h3 className="block-display-section-title">
              {t("token.topHolders")} {holders.length > 0 ? `(${holders.length})` : ""}
            </h3>
            {holders.length > 0 ? (
              <div className="table-wrapper">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>{t("token.holderRank")}</th>
                      <th>{t("token.holderAddress")}</th>
                      <th>{t("token.amount")}</th>
                      <th>{t("token.percentage")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holders.map((holder, idx) => {
                      const pct =
                        totalSupplyNum > 0 ? (Number(holder.amount) / totalSupplyNum) * 100 : 0;
                      return (
                        <tr key={holder.address}>
                          <td className="table-cell-muted">#{idx + 1}</td>
                          <td className="table-cell-mono">
                            <Link
                              to={`/${networkSlug}/account/${holder.address}`}
                              className="table-cell-address"
                              title={holder.address}
                            >
                              {shortenSolanaAddress(holder.address, 8, 8)}
                            </Link>
                          </td>
                          <td className="table-cell-value">{holder.uiAmountString}</td>
                          <td className="table-cell-text">{pct.toFixed(2)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card-content">
                <p className="text-muted margin-0">{t("token.noHolders")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
