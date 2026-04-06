import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "react-router-dom";
import { useDataService } from "../../../hooks/useDataService";
import { resolveNetwork } from "../../../utils/networkResolver";
import { getAllNetworks } from "../../../config/networks";
import type { SolanaAccount, SolanaSignatureInfo } from "../../../types";
import { formatSol, shortenSolanaAddress } from "../../../utils/solanaUtils";

export default function SolanaAccountPage() {
  const { address } = useParams<{ address: string }>();
  const location = useLocation();
  const { t } = useTranslation("solana");

  const pathSlug = location.pathname.split("/")[1] || "sol";
  const network = resolveNetwork(pathSlug, getAllNetworks());
  const dataService = useDataService(network ?? pathSlug);

  const [account, setAccount] = useState<SolanaAccount | null>(null);
  const [signatures, setSignatures] = useState<SolanaSignatureInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAccount() {
      if (!dataService || !dataService.isSolana() || !address) return;
      setLoading(true);
      try {
        const adapter = dataService.getSolanaAdapter();
        const [accountResult, sigsResult] = await Promise.all([
          adapter.getAccount(address),
          adapter.getSignaturesForAddress(address, { limit: 25 }).catch(() => []),
        ]);
        if (!cancelled) {
          setAccount(accountResult.data);
          setSignatures(sigsResult);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to fetch account");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAccount();
    return () => {
      cancelled = true;
    };
  }, [dataService, address]);

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
  if (!account)
    return (
      <div className="container-wide">
        <p>{t("account.title")}</p>
      </div>
    );

  return (
    <div className="container-wide">
      <div className="block-display-card">
        <h1>{account.executable ? t("account.program") : t("account.wallet")}</h1>

        <div className="data-section">
          <div className="data-row">
            <span className="data-label">{t("account.address")}:</span>
            <span className="data-value">{account.address}</span>
          </div>
          <div className="data-row">
            <span className="data-label">{t("account.balance")}:</span>
            <span className="data-value">{formatSol(account.lamports)}</span>
          </div>
          <div className="data-row">
            <span className="data-label">{t("account.owner")}:</span>
            <span className="data-value">
              <Link to={`/${pathSlug}/account/${account.owner}`}>{account.owner}</Link>
            </span>
          </div>
          <div className="data-row">
            <span className="data-label">{t("account.executable")}:</span>
            <span className="data-value">
              {account.executable ? t("account.yes") : t("account.no")}
            </span>
          </div>
          <div className="data-row">
            <span className="data-label">{t("account.dataSize")}:</span>
            <span className="data-value">{account.space} bytes</span>
          </div>
          <div className="data-row">
            <span className="data-label">{t("account.rentEpoch")}:</span>
            <span className="data-value">{account.rentEpoch}</span>
          </div>
        </div>

        {account.tokenAccounts && account.tokenAccounts.length > 0 ? (
          <div className="data-section">
            <h2>{t("account.tokenHoldings")}</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("token.mint")}</th>
                  <th>{t("token.amount")}</th>
                </tr>
              </thead>
              <tbody>
                {account.tokenAccounts.map((holding) => (
                  <tr key={holding.tokenAccount}>
                    <td>
                      <Link to={`/${pathSlug}/token/${holding.mint}`} title={holding.mint}>
                        {shortenSolanaAddress(holding.mint, 8, 8)}
                      </Link>
                    </td>
                    <td>{holding.amount.uiAmountString}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="data-section">
            <p>{t("account.noTokens")}</p>
          </div>
        )}

        {signatures.length > 0 && (
          <div className="data-section">
            <h2>{t("account.recentTransactions")}</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("transaction.signature")}</th>
                  <th>{t("transaction.status")}</th>
                  <th>{t("transaction.slot")}</th>
                </tr>
              </thead>
              <tbody>
                {signatures.map((sig) => (
                  <tr key={sig.signature}>
                    <td>
                      <Link to={`/${pathSlug}/tx/${sig.signature}`} title={sig.signature}>
                        {shortenSolanaAddress(sig.signature, 8, 6)}
                      </Link>
                    </td>
                    <td>{sig.err ? t("transactions.failed") : t("transactions.success")}</td>
                    <td>{sig.slot.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
