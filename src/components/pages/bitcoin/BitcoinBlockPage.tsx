import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDataService } from "../../../hooks/useDataService";
import type { BitcoinBlock, DataWithMetadata } from "../../../types";
import Loader from "../../common/Loader";
import BitcoinBlockDisplay from "./BitcoinBlockDisplay";

export default function BitcoinBlockPage() {
  const { networkId, filter } = useParams<{ networkId?: string; filter?: string }>();
  const dataService = useDataService(networkId || "btc");

  const [blockResult, setBlockResult] = useState<DataWithMetadata<BitcoinBlock> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataService || !dataService.isBitcoin() || !filter) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const adapter = dataService.getBitcoinAdapter();

    const fetchBlock = async () => {
      try {
        let blockId: string | number = filter;

        // Handle "latest" by getting current block height
        if (filter === "latest") {
          blockId = await adapter.getLatestBlockNumber();
        } else if (/^\d+$/.test(filter)) {
          // Numeric height
          blockId = Number(filter);
        }

        const result = await adapter.getBlock(blockId);
        setBlockResult(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch block");
      } finally {
        setLoading(false);
      }
    };

    fetchBlock();
  }, [dataService, filter]);

  if (loading) {
    return (
      <div className="container-wide page-container-padded">
        <div className="page-card">
          <div className="block-display-header">
            <span className="block-label">Bitcoin Block</span>
            <span className="tx-mono header-subtitle">{filter}</span>
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
      <div className="container-wide page-container-padded">
        <div className="page-card">
          <div className="block-display-header">
            <span className="block-label">Bitcoin Block</span>
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
      {blockResult?.data ? (
        <BitcoinBlockDisplay block={blockResult.data} networkId={networkId} />
      ) : (
        <div className="page-card">
          <div className="card-content">
            <p className="text-muted margin-0">Block not found</p>
          </div>
        </div>
      )}
    </div>
  );
}
