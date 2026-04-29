import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { getNetworkBySlug } from "../../../config/networks";
import { useDataService } from "../../../hooks/useDataService";
import type { SolanaEpochInfo, SolanaValidator } from "../../../types";
import {
  calculateEpochProgress,
  formatStake,
  shortenSolanaAddress,
} from "../../../utils/solanaUtils";
import Breadcrumb from "../../common/Breadcrumb";
import LoaderWithTimeout from "../../common/LoaderWithTimeout";

export default function SolanaValidatorsPage() {
  const location = useLocation();
  const { t } = useTranslation("solana");

  const networkSlug = location.pathname.split("/")[1] || "sol";
  const dataService = useDataService(networkSlug);
  const networkConfig = getNetworkBySlug(networkSlug);
  const networkLabel = networkConfig?.shortName || networkConfig?.name || networkSlug.toUpperCase();

  const [current, setCurrent] = useState<SolanaValidator[]>([]);
  const [delinquent, setDelinquent] = useState<SolanaValidator[]>([]);
  const [epochInfo, setEpochInfo] = useState<SolanaEpochInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataService || !dataService.isSolana()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchValidators = async () => {
      setLoading(true);
      setError(null);
      try {
        const adapter = dataService.getSolanaAdapter();
        const [voteAccounts, epoch] = await Promise.all([
          adapter.getVoteAccounts(),
          adapter.getEpochInfo(),
        ]);
        if (!cancelled) {
          const sortedCurrent = [...voteAccounts.current].sort(
            (a, b) => b.activatedStake - a.activatedStake,
          );
          setCurrent(sortedCurrent);
          setDelinquent(voteAccounts.delinquent);
          setEpochInfo(epoch);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch validators");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchValidators();
    return () => {
      cancelled = true;
    };
  }, [dataService]);

  const totalStake = useMemo(
    () => current.reduce((sum, v) => sum + v.activatedStake, 0),
    [current],
  );

  const breadcrumbItems = [
    { label: "Home", to: "/" },
    { label: networkLabel, to: `/${networkSlug}` },
    { label: t("validators.title") },
  ];

  if (loading) {
    return (
      <div className="container-wide page-container-padded">
        <Breadcrumb items={breadcrumbItems} />
        <div className="page-card">
          <div className="block-display-header">
            <span className="block-label">{t("validators.title")}</span>
          </div>
          <div className="card-content-loading">
            <LoaderWithTimeout
              text="Loading validators..."
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
            <span className="block-label">{t("validators.title")}</span>
          </div>
          <div className="card-content">
            <p className="text-error margin-0">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  const epochProgress = epochInfo
    ? calculateEpochProgress(epochInfo.slotIndex, epochInfo.slotsInEpoch)
    : 0;

  const renderValidatorTable = (validators: SolanaValidator[]) => (
    <div className="table-wrapper">
      <table className="dash-table">
        <thead>
          <tr>
            <th>#</th>
            <th>{t("validators.identity")}</th>
            <th>{t("validators.voteAccount")}</th>
            <th>{t("validators.stake")}</th>
            <th>{t("validators.commission")}</th>
            <th className="hide-mobile">{t("validators.lastVote")}</th>
          </tr>
        </thead>
        <tbody>
          {validators.map((v, idx) => (
            <tr key={v.votePubkey}>
              <td className="table-cell-muted">{idx + 1}</td>
              <td className="table-cell-mono">
                <Link
                  to={`/${networkSlug}/account/${v.nodePubkey}`}
                  className="table-cell-address"
                  title={v.nodePubkey}
                >
                  {shortenSolanaAddress(v.nodePubkey, 6, 6)}
                </Link>
              </td>
              <td className="table-cell-mono">
                <Link
                  to={`/${networkSlug}/account/${v.votePubkey}`}
                  className="table-cell-address"
                  title={v.votePubkey}
                >
                  {shortenSolanaAddress(v.votePubkey, 6, 6)}
                </Link>
              </td>
              <td className="table-cell-value">{formatStake(v.activatedStake)}</td>
              <td className="table-cell-text">{v.commission}%</td>
              <td className="table-cell-muted hide-mobile">{v.lastVote.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="container-wide page-container-padded">
      <Breadcrumb items={breadcrumbItems} />
      <div className="block-display-card">
        <div className="block-display-header">
          <span className="block-label">{t("validators.title")}</span>
        </div>

        {epochInfo && (
          <div className="tx-details">
            <div className="tx-row">
              <span className="tx-label">{t("validators.currentEpoch")}:</span>
              <span className="tx-value tx-value-highlight">{epochInfo.epoch}</span>
            </div>
            <div className="tx-row">
              <span className="tx-label">{t("validators.epochProgress")}:</span>
              <span className="tx-value">{epochProgress.toFixed(2)}%</span>
            </div>
            <div className="tx-row">
              <span className="tx-label">{t("validators.totalStake")}:</span>
              <span className="tx-value">{formatStake(totalStake)}</span>
            </div>
            <div className="tx-row">
              <span className="tx-label">{t("validators.validatorCount")}:</span>
              <span className="tx-value">{current.length.toLocaleString()}</span>
            </div>
          </div>
        )}

        <div className="block-display-section">
          <h3 className="block-display-section-title">
            {t("validators.currentValidators")} ({current.length})
          </h3>
          {current.length > 0 ? (
            renderValidatorTable(current)
          ) : (
            <div className="card-content">
              <p className="text-muted margin-0">{t("validators.noValidators")}</p>
            </div>
          )}
        </div>

        {delinquent.length > 0 && (
          <div className="block-display-section">
            <h3 className="block-display-section-title">
              {t("validators.delinquentValidators")} ({delinquent.length})
            </h3>
            {renderValidatorTable(delinquent)}
          </div>
        )}
      </div>
    </div>
  );
}
