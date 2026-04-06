import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { useDataService } from "../../../hooks/useDataService";
import { resolveNetwork } from "../../../utils/networkResolver";
import { getAllNetworks } from "../../../config/networks";
import type { SolanaEpochInfo, SolanaValidator } from "../../../types";
import {
  calculateEpochProgress,
  formatStake,
  shortenSolanaAddress,
} from "../../../utils/solanaUtils";

export default function SolanaValidatorsPage() {
  const location = useLocation();
  const { t } = useTranslation("solana");

  const pathSlug = location.pathname.split("/")[1] || "sol";
  const network = resolveNetwork(pathSlug, getAllNetworks());
  const dataService = useDataService(network ?? pathSlug);

  const [current, setCurrent] = useState<SolanaValidator[]>([]);
  const [delinquent, setDelinquent] = useState<SolanaValidator[]>([]);
  const [epochInfo, setEpochInfo] = useState<SolanaEpochInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchValidators() {
      if (!dataService || !dataService.isSolana()) return;
      setLoading(true);
      try {
        const adapter = dataService.getSolanaAdapter();
        const [voteAccounts, epoch] = await Promise.all([
          adapter.getVoteAccounts(),
          adapter.getEpochInfo(),
        ]);
        if (!cancelled) {
          // Sort by activated stake descending
          const sortedCurrent = [...voteAccounts.current].sort(
            (a, b) => b.activatedStake - a.activatedStake,
          );
          setCurrent(sortedCurrent);
          setDelinquent(voteAccounts.delinquent);
          setEpochInfo(epoch);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to fetch validators");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchValidators();
    return () => {
      cancelled = true;
    };
  }, [dataService]);

  const totalStake = useMemo(
    () => current.reduce((sum, v) => sum + v.activatedStake, 0),
    [current],
  );

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

  const epochProgress = epochInfo
    ? calculateEpochProgress(epochInfo.slotIndex, epochInfo.slotsInEpoch)
    : 0;

  const renderValidatorTable = (validators: SolanaValidator[]) => (
    <table className="data-table">
      <thead>
        <tr>
          <th>#</th>
          <th>{t("validators.identity")}</th>
          <th>{t("validators.voteAccount")}</th>
          <th>{t("validators.stake")}</th>
          <th>{t("validators.commission")}</th>
          <th>{t("validators.lastVote")}</th>
        </tr>
      </thead>
      <tbody>
        {validators.map((v, idx) => (
          <tr key={v.votePubkey}>
            <td>{idx + 1}</td>
            <td>
              <Link to={`/${pathSlug}/account/${v.nodePubkey}`} title={v.nodePubkey}>
                {shortenSolanaAddress(v.nodePubkey, 6, 6)}
              </Link>
            </td>
            <td>
              <Link to={`/${pathSlug}/account/${v.votePubkey}`} title={v.votePubkey}>
                {shortenSolanaAddress(v.votePubkey, 6, 6)}
              </Link>
            </td>
            <td>{formatStake(v.activatedStake)}</td>
            <td>{v.commission}%</td>
            <td>{v.lastVote.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="container-wide">
      <div className="block-display-card">
        <h1>{t("validators.title")}</h1>

        {epochInfo && (
          <div className="data-section">
            <div className="data-row">
              <span className="data-label">{t("validators.currentEpoch")}:</span>
              <span className="data-value">{epochInfo.epoch}</span>
            </div>
            <div className="data-row">
              <span className="data-label">{t("validators.epochProgress")}:</span>
              <span className="data-value">{epochProgress.toFixed(2)}%</span>
            </div>
            <div className="data-row">
              <span className="data-label">{t("validators.totalStake")}:</span>
              <span className="data-value">{formatStake(totalStake)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">{t("validators.validatorCount")}:</span>
              <span className="data-value">{current.length}</span>
            </div>
          </div>
        )}

        <div className="data-section">
          <h2>{t("validators.currentValidators")}</h2>
          {current.length > 0 ? (
            renderValidatorTable(current)
          ) : (
            <p>{t("validators.noValidators")}</p>
          )}
        </div>

        {delinquent.length > 0 && (
          <div className="data-section">
            <h2>{t("validators.delinquentValidators")}</h2>
            {renderValidatorTable(delinquent)}
          </div>
        )}
      </div>
    </div>
  );
}
