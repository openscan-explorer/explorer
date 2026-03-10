import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { getAllNetworks } from "../../../config/networks";
import { useDataService } from "../../../hooks/useDataService";
import { usePersistentCache } from "../../../hooks/usePersistentCache";
import type { BitcoinBlock, DataWithMetadata } from "../../../types";
import { resolveNetwork } from "../../../utils/networkResolver";
import Breadcrumb from "../../common/Breadcrumb";
import LoaderWithTimeout from "../../common/LoaderWithTimeout";
import BitcoinBlockDisplay from "./BitcoinBlockDisplay";

export default function BitcoinBlockPage() {
  const { filter } = useParams<{ filter?: string }>();
  const location = useLocation();

  // Extract network slug from path (e.g., "/tbtc/block/123" → "tbtc")
  const networkSlug = location.pathname.split("/")[1] || "btc";
  const dataService = useDataService(networkSlug);
  const { getCached, setCached } = usePersistentCache();
  const cacheNetworkId = useMemo(
    () => resolveNetwork(networkSlug, getAllNetworks())?.networkId ?? networkSlug,
    [networkSlug],
  );

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
          // Check persistent cache for numeric block heights
          const cached = getCached<BitcoinBlock>(cacheNetworkId, "block", filter);
          if (cached) {
            setBlockResult({ data: cached });
            return;
          }
          blockId = Number(filter);
        }

        const result = await adapter.getBlock(blockId);
        setBlockResult(result);
        // Cache using the resolved block height
        setCached(cacheNetworkId, "block", String(result.data.height), result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch block");
      } finally {
        setLoading(false);
      }
    };

    fetchBlock();
  }, [dataService, filter, getCached, setCached, cacheNetworkId]);

  if (loading) {
    return (
      <div className="container-wide page-container-padded">
        <div className="page-card">
          <div className="block-display-header">
            <span className="block-label">Bitcoin Block</span>
            <span className="tx-mono header-subtitle">{filter}</span>
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
      <Breadcrumb
        items={[
          { label: "Home", to: "/" },
          { label: networkSlug === "tbtc" ? "Bitcoin Testnet" : "Bitcoin", to: `/${networkSlug}` },
          { label: "Blocks", to: `/${networkSlug}/blocks` },
          { label: `Block #${filter}` },
        ]}
      />
      {blockResult?.data ? (
        <BitcoinBlockDisplay block={blockResult.data} networkId={networkSlug} />
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
