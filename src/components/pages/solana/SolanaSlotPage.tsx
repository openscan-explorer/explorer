import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import { getNetworkBySlug } from "../../../config/networks";
import { useDataService } from "../../../hooks/useDataService";
import type { DataWithMetadata, SolanaBlock } from "../../../types";
import Breadcrumb from "../../common/Breadcrumb";
import LoaderWithTimeout from "../../common/LoaderWithTimeout";
import SolanaSlotDisplay from "./SolanaSlotDisplay";

export default function SolanaSlotPage() {
  const { filter } = useParams<{ filter: string }>();
  const location = useLocation();
  const { t } = useTranslation("solana");

  const networkSlug = location.pathname.split("/")[1] || "sol";
  const dataService = useDataService(networkSlug);
  const networkConfig = getNetworkBySlug(networkSlug);
  const networkLabel = networkConfig?.shortName || networkConfig?.name || networkSlug.toUpperCase();

  const [blockResult, setBlockResult] = useState<DataWithMetadata<SolanaBlock> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataService || !dataService.isSolana() || !filter) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchBlock = async () => {
      setLoading(true);
      setError(null);
      try {
        const adapter = dataService.getSolanaAdapter();
        const slot = Number(filter);
        if (Number.isNaN(slot)) {
          throw new Error(`Invalid slot: ${filter}`);
        }
        const result = await adapter.getBlock(slot);
        if (!cancelled) setBlockResult(result);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch block");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBlock();
    return () => {
      cancelled = true;
    };
  }, [dataService, filter]);

  const breadcrumbItems = [
    { label: "Home", to: "/" },
    { label: networkLabel, to: `/${networkSlug}` },
    { label: t("blocks.blocksTitle"), to: `/${networkSlug}/slots` },
    { label: `${t("block.title")} #${filter}` },
  ];

  if (loading) {
    return (
      <div className="container-wide page-container-padded">
        <Breadcrumb items={breadcrumbItems} />
        <div className="page-card">
          <div className="block-display-header">
            <span className="block-label">{t("block.title")}</span>
            <span className="tx-mono header-subtitle">#{filter}</span>
          </div>
          <div className="card-content-loading">
            <LoaderWithTimeout
              text="Loading block data..."
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
            <span className="block-label">{t("block.title")}</span>
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
      {blockResult?.data ? (
        <SolanaSlotDisplay block={blockResult.data} networkId={networkSlug} />
      ) : (
        <div className="page-card">
          <div className="card-content">
            <p className="text-muted margin-0">{t("blocks.noBlocks")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
