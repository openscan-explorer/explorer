import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { getNetworkById } from "../../../../config/networks";
import { useDataService } from "../../../../hooks/useDataService";
import { usePersistentCache } from "../../../../hooks/usePersistentCache";
import { useProviderSelection } from "../../../../hooks/useProviderSelection";
import { useSelectedData } from "../../../../hooks/useSelectedData";
import type { Block, DataWithMetadata } from "../../../../types";
import Breadcrumb from "../../../common/Breadcrumb";
import LoaderWithTimeout from "../../../common/LoaderWithTimeout";
import BlockDisplay from "./BlockDisplay";

export default function BlockPage() {
  const { t } = useTranslation("block");
  const { networkId, filter } = useParams<{
    networkId?: string;
    filter?: string;
  }>();

  const blockNumber = filter === "latest" ? "latest" : Number(filter);
  const numericNetworkId = Number(networkId) || 1;
  const networkConfig = getNetworkById(networkId ?? numericNetworkId);
  const networkLabel = networkConfig?.shortName || networkConfig?.name || `Chain ${networkId}`;

  const dataService = useDataService(numericNetworkId);
  const { getCached, setCached } = usePersistentCache();
  const cacheNetworkId = `eip155:${numericNetworkId}`;

  const [blockResult, setBlockResult] = useState<DataWithMetadata<Block> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Provider selection state
  const [selectedProvider, setSelectedProvider] = useProviderSelection(
    `block_${numericNetworkId}_${blockNumber}`,
  );

  // Extract actual block data based on selected provider
  const block = useSelectedData(blockResult, selectedProvider);

  useEffect(() => {
    if (!dataService || blockNumber === undefined || !dataService.isEVM()) {
      setLoading(false);
      return;
    }

    // Check persistent cache for non-latest blocks
    if (blockNumber !== "latest") {
      const cached = getCached<Block>(cacheNetworkId, "block", String(blockNumber));
      if (cached) {
        setBlockResult({ data: cached });
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);

    dataService.networkAdapter
      .getBlock(blockNumber)
      .then((result) => {
        setBlockResult(result);
        // Cache using the resolved block number
        setCached(cacheNetworkId, "block", String(Number(result.data.number)), result.data);
      })
      .catch((err) => {
        setError(err.message || t("errors.failedToFetchBlock"));
      })
      .finally(() => setLoading(false));
  }, [dataService, blockNumber, t, getCached, setCached, cacheNetworkId]);

  if (loading) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="block-display-header">
            <span className="block-label">{t("block")}</span>
            <span className="tx-mono header-subtitle">#{filter}</span>
          </div>
          <div className="card-content-loading">
            <LoaderWithTimeout text={t("loadingBlockData")} onRetry={() => window.location.reload()} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="block-display-header">
            <span className="block-label">{t("block")}</span>
            <span className="tx-mono header-subtitle">#{filter}</span>
          </div>
          <div className="card-content">
            <p className="text-error margin-0">{t("errorPrefix", { error })}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-wide">
      <Breadcrumb items={[
        { label: "Home", to: "/" },
        { label: networkLabel, to: `/${networkId}` },
        { label: "Blocks", to: `/${networkId}/blocks` },
        { label: `Block #${filter}` },
      ]} />
      {block ? (
        <BlockDisplay
          block={block}
          networkId={networkId}
          metadata={blockResult?.metadata}
          selectedProvider={selectedProvider}
          onProviderSelect={setSelectedProvider}
        />
      ) : (
        <div className="block-display-card">
          <div className="block-display-header">
            <span className="block-label">{t("block")}</span>
          </div>
          <div className="card-content">
            <p className="text-muted margin-0">{t("blockNotFound")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
