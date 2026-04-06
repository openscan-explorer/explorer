import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { useDataService } from "../../../hooks/useDataService";
import { resolveNetwork } from "../../../utils/networkResolver";
import { getAllNetworks } from "../../../config/networks";
import type { SolanaBlock } from "../../../types";
import { formatSlotNumber, shortenSolanaAddress } from "../../../utils/solanaUtils";

export default function SolanaSlotsPage() {
  const location = useLocation();
  const { t } = useTranslation("solana");

  const pathSlug = location.pathname.split("/")[1] || "sol";
  const network = resolveNetwork(pathSlug, getAllNetworks());
  const dataService = useDataService(network ?? pathSlug);

  const [blocks, setBlocks] = useState<SolanaBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchBlocks() {
      if (!dataService || !dataService.isSolana()) return;
      setLoading(true);
      try {
        const adapter = dataService.getSolanaAdapter();
        const result = await adapter.getLatestBlocks(25);
        if (!cancelled) {
          setBlocks(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch blocks");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBlocks();
    return () => {
      cancelled = true;
    };
  }, [dataService]);

  return (
    <div className="container-wide">
      <div className="block-display-card">
        <h1>{t("blocks.blocksTitle")}</h1>
        {error && <p className="error-text-center">{error}</p>}
        {loading && blocks.length === 0 ? (
          <p>{t("common.loading")}</p>
        ) : blocks.length === 0 ? (
          <p>{t("blocks.noBlocks")}</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("blocks.slot")}</th>
                <th>{t("blocks.blockHash")}</th>
                <th>{t("blocks.txCount")}</th>
                <th>{t("blocks.time")}</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((block) => (
                <tr key={block.blockhash}>
                  <td>
                    <Link to={`/${pathSlug}/slot/${block.slot}`}>
                      #{formatSlotNumber(block.slot)}
                    </Link>
                  </td>
                  <td title={block.blockhash}>{shortenSolanaAddress(block.blockhash, 8, 8)}</td>
                  <td>{block.transactionCount}</td>
                  <td>
                    {block.blockTime ? new Date(block.blockTime * 1000).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
