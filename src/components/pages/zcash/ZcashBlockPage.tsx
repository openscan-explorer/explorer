import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import { LOADER_TIMEOUT_MS } from "../../../config/zcashConstants";
import { useDataService } from "../../../hooks/useDataService";
import { usePersistentCache } from "../../../hooks/usePersistentCache";
import { useZcashNetworkFromPath } from "../../../hooks/useZcashNetworkFromPath";
import type { ZcashBlock } from "../../../types";
import Breadcrumb from "../../common/Breadcrumb";
import LoaderWithTimeout from "../../common/LoaderWithTimeout";
import ZcashBlockDisplay from "./ZcashBlockDisplay";

export default function ZcashBlockPage() {
  const { t } = useTranslation("zcash");
  const { filter } = useParams<{ filter?: string }>();
  // The transaction page hands over a block it already fetched while resolving a hash
  const handedOver = (useLocation().state as { block?: ZcashBlock } | null)?.block;
  const {
    slug: networkSlug,
    label: networkLabel,
    currency,
    cacheNetworkId,
  } = useZcashNetworkFromPath();
  const dataService = useDataService(networkSlug);
  const { getCached, setCached } = usePersistentCache();

  const [block, setBlock] = useState<ZcashBlock | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt re-runs the fetch on retry
  useEffect(() => {
    if (!dataService || !dataService.isZcash() || !filter) return;

    const controller = new AbortController();
    const { signal } = controller;
    const adapter = dataService.getZcashAdapter();

    const fetchBlock = async () => {
      setLoading(true);
      setError(null);
      setFromCache(false);

      try {
        if (handedOver && String(handedOver.height) === filter) {
          setBlock(handedOver);
          return;
        }

        let blockId: string | number = filter;
        if (filter === "latest") {
          blockId = await adapter.getLatestBlockNumber({ signal });
        } else if (/^\d+$/.test(filter)) {
          const cached = getCached<ZcashBlock>(cacheNetworkId, "block", filter);
          if (cached) {
            setBlock(cached);
            setFromCache(true);
            return;
          }
        }

        // A single getblock call returns the header, transactions and value pools
        const { data } = await adapter.getBlock(blockId, { signal });
        if (signal.aborted) return;
        setBlock(data.block);
        // The tip still changes (next block link, confirmations), so only cache blocks that
        // already have a successor
        if (data.block.nextBlockHash) {
          setCached(cacheNetworkId, "block", String(data.block.height), data.block);
        }
      } catch (err) {
        if (!signal.aborted) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    fetchBlock();
    return () => controller.abort();
  }, [dataService, filter, getCached, setCached, cacheNetworkId, attempt, handedOver]);

  if (loading) {
    return (
      <div className="container-wide page-container-padded">
        <div className="page-card">
          <div className="block-display-header">
            <span className="block-label">{t("block.title")}</span>
            <span className="tx-mono header-subtitle">{filter}</span>
          </div>
          <div className="card-content-loading">
            <LoaderWithTimeout
              key={attempt}
              text={t("block.loading")}
              timeoutMs={LOADER_TIMEOUT_MS}
              onRetry={() => setAttempt((count) => count + 1)}
            />
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
          currency={currency}
          confirmationsAtLeast={fromCache}
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
