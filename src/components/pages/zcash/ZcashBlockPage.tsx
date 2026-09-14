import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import { getNetworkBySlug } from "../../../config/networks";
import { useDataService } from "../../../hooks/useDataService";
import { usePersistentCache } from "../../../hooks/usePersistentCache";
import type { ZcashBlock } from "../../../types";
import Breadcrumb from "../../common/Breadcrumb";
import LoaderWithTimeout from "../../common/LoaderWithTimeout";
import ZcashBlockDisplay from "./ZcashBlockDisplay";

export default function ZcashBlockPage() {
  const { t } = useTranslation("zcash");
  const { filter } = useParams<{ filter?: string }>();
  const location = useLocation();

  // Extract network slug from path (e.g., "/tzec/block/123" → "tzec")
  const networkSlug = location.pathname.split("/")[1] || "zec";
  const dataService = useDataService(networkSlug);
  const network = getNetworkBySlug(networkSlug);
  const networkLabel = network?.shortName || networkSlug.toUpperCase();
  const cacheNetworkId = network?.networkId ?? networkSlug;
  const { getCached, setCached } = usePersistentCache();

  const [block, setBlock] = useState<ZcashBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataService || !dataService.isZcash() || !filter) return;

    let cancelled = false;
    const adapter = dataService.getZcashAdapter();

    const fetchBlock = async () => {
      setLoading(true);
      setError(null);

      try {
        let blockId: string | number = filter;
        if (filter === "latest") {
          blockId = await adapter.getLatestBlockNumber();
        } else if (/^\d+$/.test(filter)) {
          const cached = getCached<ZcashBlock>(cacheNetworkId, "block", filter);
          if (cached) {
            if (!cancelled) setBlock(cached);
            return;
          }
        }

        // A single getblock call returns the header, transactions and value pools
        const { data } = await adapter.getBlock(blockId);
        if (cancelled) return;
        setBlock(data.block);
        setCached(cacheNetworkId, "block", String(data.block.height), data.block);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBlock();
    return () => {
      cancelled = true;
    };
  }, [dataService, filter, getCached, setCached, cacheNetworkId]);

  if (loading) {
    return (
      <div className="container-wide page-container-padded">
        <div className="page-card">
          <div className="block-display-header">
            <span className="block-label">{t("block.title")}</span>
            <span className="tx-mono header-subtitle">{filter}</span>
          </div>
          <div className="card-content-loading">
            <LoaderWithTimeout text={t("block.loading")} onRetry={() => window.location.reload()} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-wide page-container-padded">
        <div className="page-card">
          <div className="block-display-header">
            <span className="block-label">{t("block.title")}</span>
          </div>
          <div className="card-content">
            <p className="text-error margin-0">{t("block.loadError", { message: error })}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-wide page-container-padded">
      <Breadcrumb
        items={[
          { label: t("breadcrumb.home"), to: "/" },
          { label: networkLabel, to: `/${networkSlug}` },
          { label: t("breadcrumb.blocks"), to: `/${networkSlug}/blocks` },
          { label: t("breadcrumb.block", { height: block?.height.toLocaleString() ?? filter }) },
        ]}
      />
      {block ? (
        <ZcashBlockDisplay
          block={block}
          networkId={networkSlug}
          currency={network?.currency ?? "ZEC"}
        />
      ) : (
        <div className="page-card">
          <div className="card-content">
            <p className="text-muted margin-0">{t("block.notFound")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
