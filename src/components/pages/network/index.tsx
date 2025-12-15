import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useNetwork } from "../../../context/AppContext";
import { useDataService } from "../../../hooks/useDataService";
import { useProviderSelection } from "../../../hooks/useProviderSelection";
import { useSelectedData } from "../../../hooks/useSelectedData";
import type { DataWithMetadata, NetworkStats } from "../../../types";
import Loader from "../../common/Loader";
import SearchBox from "../../common/SearchBox";
import ProfileDisplay from "./NetworkProfileDisplay";
import NetworkStatsDisplay from "./NetworkStatsDisplay";

export default function Network() {
  const { networkId } = useParams<{ networkId?: string }>();
  const numericNetworkId = Number(networkId) || 1;
  const networkConfig = useNetwork(numericNetworkId);
  const dataService = useDataService(numericNetworkId);
  const [networkStatsResult, setNetworkStatsResult] =
    useState<DataWithMetadata<NetworkStats> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Provider selection state
  const [selectedProvider, setSelectedProvider] = useProviderSelection(
    `networkStats_${numericNetworkId}`,
  );

  // Extract actual network stats based on selected provider
  const networkStats = useSelectedData(networkStatsResult, selectedProvider);

  useEffect(() => {
    if (!dataService) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    dataService.networkAdapter
      .getNetworkStats()
      .then((result) => {
        setNetworkStatsResult(result);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch network stats");
      })
      .finally(() => setLoading(false));
  }, [dataService]);

  // Generate title based on network
  // Strip "Ethereum" from network names (e.g., "Ethereum Mainnet" -> "MAINNET")
  const rawName = networkConfig?.name?.toUpperCase() || "OPENSCAN";
  const networkName = rawName.replace(/^ETHEREUM\s*/i, "").trim();
  const networkColor = networkConfig?.color || "#627eea";
  const hasNetworkName = networkName.length > 0;

  return (
    <div className="home-container">
      <div className="home-content page-card">
        <h1 className="home-title network-title">
          {hasNetworkName && (
            <>
              <span
                className="network-title-name"
                style={{ "--network-color": networkColor } as React.CSSProperties}
              >
                {networkName}
              </span>{" "}
            </>
          )}
        </h1>
        {networkConfig?.description && (
          <p className="network-description">{networkConfig.description}</p>
        )}
        <SearchBox />
        {loading && <Loader text="Loading network stats..." />}
        {error && <p className="error-text-center">Error: {error}</p>}
        {networkStats && (
          <NetworkStatsDisplay
            networkStats={networkStats}
            networkId={numericNetworkId}
            metadata={networkStatsResult?.metadata}
            selectedProvider={selectedProvider}
            onProviderSelect={setSelectedProvider}
          />
        )}
        <ProfileDisplay network={networkConfig} />
      </div>
    </div>
  );
}
