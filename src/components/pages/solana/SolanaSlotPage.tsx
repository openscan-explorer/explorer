import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "react-router-dom";
import { useDataService } from "../../../hooks/useDataService";
import { resolveNetwork } from "../../../utils/networkResolver";
import { getAllNetworks } from "../../../config/networks";
import type { SolanaBlock } from "../../../types";
import { formatBlockTime, formatSol, formatSlotNumber } from "../../../utils/solanaUtils";

export default function SolanaSlotPage() {
  const { filter } = useParams<{ filter: string }>();
  const location = useLocation();
  const { t } = useTranslation("solana");

  const pathSlug = location.pathname.split("/")[1] || "sol";
  const network = resolveNetwork(pathSlug, getAllNetworks());
  const dataService = useDataService(network ?? pathSlug);

  const [block, setBlock] = useState<SolanaBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchBlock() {
      if (!dataService || !dataService.isSolana() || !filter) return;
      setLoading(true);
      try {
        const adapter = dataService.getSolanaAdapter();
        const slot = Number(filter);
        if (Number.isNaN(slot)) {
          throw new Error(`Invalid slot: ${filter}`);
        }
        const result = await adapter.getBlock(slot);
        if (!cancelled) {
          setBlock(result.data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch block");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBlock();
    return () => {
      cancelled = true;
    };
  }, [dataService, filter]);

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
  if (!block)
    return (
      <div className="container-wide">
        <p>{t("blocks.noBlocks")}</p>
      </div>
    );

  return (
    <div className="container-wide">
      <div className="block-display-card">
        <h1>
          {t("block.title")} #{formatSlotNumber(block.slot)}
        </h1>

        <div className="data-section">
          <div className="data-row">
            <span className="data-label">{t("block.blockHash")}:</span>
            <span className="data-value">{block.blockhash}</span>
          </div>
          <div className="data-row">
            <span className="data-label">{t("block.previousBlockhash")}:</span>
            <span className="data-value">{block.previousBlockhash}</span>
          </div>
          <div className="data-row">
            <span className="data-label">{t("block.parentSlot")}:</span>
            <span className="data-value">
              <Link to={`/${pathSlug}/slot/${block.parentSlot}`}>
                #{formatSlotNumber(block.parentSlot)}
              </Link>
            </span>
          </div>
          <div className="data-row">
            <span className="data-label">{t("block.blockHeight")}:</span>
            <span className="data-value">
              {block.blockHeight !== null ? formatSlotNumber(block.blockHeight) : "—"}
            </span>
          </div>
          <div className="data-row">
            <span className="data-label">{t("block.blockTime")}:</span>
            <span className="data-value">{formatBlockTime(block.blockTime)}</span>
          </div>
          <div className="data-row">
            <span className="data-label">{t("block.transactionCount")}:</span>
            <span className="data-value">{block.transactionCount}</span>
          </div>
        </div>

        {block.rewards.length > 0 && (
          <div className="data-section">
            <h2>{t("block.rewards")}</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("block.rewardType")}</th>
                  <th>{t("block.amount")}</th>
                </tr>
              </thead>
              <tbody>
                {block.rewards.map((reward) => (
                  <tr key={reward.pubkey}>
                    <td>{reward.rewardType ?? "—"}</td>
                    <td>{formatSol(reward.lamports)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {block.signatures && block.signatures.length > 0 && (
          <div className="data-section">
            <h2>{t("block.transactions")}</h2>
            <ul className="data-list">
              {block.signatures.slice(0, 50).map((sig) => (
                <li key={sig}>
                  <Link to={`/${pathSlug}/tx/${sig}`}>{sig}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
