import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { getNetworkBySlug } from "../../../config/networks";
import { useDataService } from "../../../hooks/useDataService";
import type { SolanaBlock } from "../../../types";
import { formatSlotNumber, shortenSolanaAddress } from "../../../utils/solanaUtils";
import { logger } from "../../../utils/logger";
import Breadcrumb from "../../common/Breadcrumb";

const BLOCKS_PER_PAGE = 25;

function formatBlockTimeAgo(blockTime: number | null): string {
  if (blockTime === null) return "—";
  const seconds = Math.floor(Date.now() / 1000 - blockTime);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function SolanaSlotsPage() {
  const location = useLocation();
  const { t } = useTranslation("solana");

  const networkSlug = location.pathname.split("/")[1] || "sol";
  const dataService = useDataService(networkSlug);
  const networkConfig = getNetworkBySlug(networkSlug);
  const networkLabel = networkConfig?.shortName || networkConfig?.name || networkSlug.toUpperCase();

  const [blocks, setBlocks] = useState<SolanaBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataService || !dataService.isSolana()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchBlocks = async () => {
      setLoading(true);
      setError(null);
      try {
        const adapter = dataService.getSolanaAdapter();
        const result = await adapter.getLatestBlocks(BLOCKS_PER_PAGE);
        if (!cancelled) setBlocks(result);
      } catch (err) {
        logger.error("Error fetching Solana blocks:", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch blocks");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBlocks();
    return () => {
      cancelled = true;
    };
  }, [dataService]);

  const breadcrumbItems = [
    { label: "Home", to: "/" },
    { label: networkLabel, to: `/${networkSlug}` },
    { label: t("blocks.blocksTitle") },
  ];

  if (loading) {
    return (
      <div className="container-wide">
        <Breadcrumb items={breadcrumbItems} />
        <div className="block-display-card">
          <div className="blocks-header">
            <span className="block-label">{t("blocks.title")}</span>
          </div>
          <div className="table-wrapper">
            <table className="dash-table blocks-table">
              <thead>
                <tr>
                  <th>{t("blocks.slot")}</th>
                  <th>{t("blocks.blockHash")}</th>
                  <th>{t("blocks.time")}</th>
                  <th>{t("blocks.txCount")}</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: BLOCKS_PER_PAGE }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
                  <tr key={i}>
                    <td>
                      <span className="skeleton-pulse" style={{ width: "90px", height: 18 }} />
                    </td>
                    <td>
                      <span className="skeleton-pulse" style={{ width: "140px", height: 18 }} />
                    </td>
                    <td>
                      <span className="skeleton-pulse" style={{ width: "60px", height: 18 }} />
                    </td>
                    <td>
                      <span className="skeleton-pulse" style={{ width: "40px", height: 18 }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-wide">
        <Breadcrumb items={breadcrumbItems} />
        <div className="block-display-card">
          <div className="blocks-header">
            <span className="block-label">{t("blocks.title")}</span>
          </div>
          <div className="card-content">
            <p className="text-error margin-0">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-wide">
      <Breadcrumb items={breadcrumbItems} />
      <div className="block-display-card">
        <div className="blocks-header">
          <div className="blocks-header-main">
            <span className="block-label">{t("blocks.title")}</span>
            <span className="block-header-divider">•</span>
            <span className="blocks-header-info">Showing {blocks.length} most recent blocks</span>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="dash-table blocks-table">
            <thead>
              <tr>
                <th>{t("blocks.slot")}</th>
                <th>{t("blocks.blockHash")}</th>
                <th>{t("blocks.time")}</th>
                <th>{t("blocks.txCount")}</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((block) => (
                <tr key={block.blockhash}>
                  <td>
                    <Link to={`/${networkSlug}/slot/${block.slot}`} className="table-cell-number">
                      {formatSlotNumber(block.slot)}
                    </Link>
                  </td>
                  <td className="table-cell-mono">
                    <Link
                      to={`/${networkSlug}/slot/${block.slot}`}
                      className="table-cell-address"
                      title={block.blockhash}
                    >
                      {shortenSolanaAddress(block.blockhash, 8, 8)}
                    </Link>
                  </td>
                  <td className="table-cell-text">{formatBlockTimeAgo(block.blockTime)}</td>
                  <td className="table-cell-value">{block.transactionCount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
