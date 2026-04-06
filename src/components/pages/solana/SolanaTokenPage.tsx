import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "react-router-dom";
import { useDataService } from "../../../hooks/useDataService";
import { resolveNetwork } from "../../../utils/networkResolver";
import { getAllNetworks } from "../../../config/networks";
import type { SolanaTokenAmount, SolanaTokenLargestAccount } from "../../../types";
import { shortenSolanaAddress } from "../../../utils/solanaUtils";

export default function SolanaTokenPage() {
  const { mint } = useParams<{ mint: string }>();
  const location = useLocation();
  const { t } = useTranslation("solana");

  const pathSlug = location.pathname.split("/")[1] || "sol";
  const network = resolveNetwork(pathSlug, getAllNetworks());
  const dataService = useDataService(network ?? pathSlug);

  const [supply, setSupply] = useState<SolanaTokenAmount | null>(null);
  const [holders, setHolders] = useState<SolanaTokenLargestAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchToken() {
      if (!dataService || !dataService.isSolana() || !mint) return;
      setLoading(true);
      try {
        const adapter = dataService.getSolanaAdapter();
        const [supplyResult, holdersResult] = await Promise.all([
          adapter.getTokenSupply(mint),
          adapter.getTokenLargestAccounts(mint),
        ]);
        if (!cancelled) {
          setSupply(supplyResult);
          setHolders(holdersResult);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to fetch token");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchToken();
    return () => {
      cancelled = true;
    };
  }, [dataService, mint]);

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

  const totalSupplyNum = supply ? Number(supply.amount) : 0;

  return (
    <div className="container-wide">
      <div className="block-display-card">
        <h1>{t("token.title")}</h1>

        <div className="data-section">
          <div className="data-row">
            <span className="data-label">{t("token.mint")}:</span>
            <span className="data-value">{mint}</span>
          </div>
          {supply && (
            <>
              <div className="data-row">
                <span className="data-label">{t("token.totalSupply")}:</span>
                <span className="data-value">{supply.uiAmountString}</span>
              </div>
              <div className="data-row">
                <span className="data-label">{t("token.decimals")}:</span>
                <span className="data-value">{supply.decimals}</span>
              </div>
            </>
          )}
        </div>

        {holders.length > 0 ? (
          <div className="data-section">
            <h2>{t("token.topHolders")}</h2>
            <table className="data-table">
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
                      <td>#{idx + 1}</td>
                      <td>
                        <Link to={`/${pathSlug}/account/${holder.address}`} title={holder.address}>
                          {shortenSolanaAddress(holder.address, 8, 8)}
                        </Link>
                      </td>
                      <td>{holder.uiAmountString}</td>
                      <td>{pct.toFixed(2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p>{t("token.noHolders")}</p>
        )}
      </div>
    </div>
  );
}
