import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDataService } from "../../../hooks/useDataService";
import { useProviderSelection } from "../../../hooks/useProviderSelection";
import { useSelectedData } from "../../../hooks/useSelectedData";
import type { Block, DataWithMetadata } from "../../../types";
import Loader from "../../common/Loader";
import BlockDisplay from "./BlockDisplay";

export default function BlockPage() {
  const { networkId, filter } = useParams<{
    networkId?: string;
    filter?: string;
  }>();

  const blockNumber = filter === "latest" ? "latest" : Number(filter);
  const numericNetworkId = Number(networkId) || 1;

  const dataService = useDataService(numericNetworkId);
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
    if (!dataService || blockNumber === undefined) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    dataService.networkAdapter
      .getBlock(blockNumber)
      .then((result) => {
        setBlockResult(result);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch block");
      })
      .finally(() => setLoading(false));
  }, [dataService, blockNumber]);

  if (loading) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="block-display-header">
            <span className="block-label">Block</span>
            <span className="tx-mono header-subtitle">#{filter}</span>
          </div>
          <div className="card-content-loading">
            <Loader text="Loading block data..." />
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
            <span className="block-label">Block</span>
            <span className="tx-mono header-subtitle">#{filter}</span>
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
            <span className="block-label">Block</span>
          </div>
          <div className="card-content">
            <p className="text-muted margin-0">Block not found</p>
          </div>
        </div>
      )}
    </div>
  );
}
