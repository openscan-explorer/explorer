import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { NetworkConfig } from "../../../config/networks";
import { useNetworks } from "../../../context/AppContext";
import NetworkIcon from "../../common/NetworkIcon";
import TierBadge from "../../common/TierBadge";
import HomeSearchBar from "./HomeSearchBar";

interface NetworkCardProps {
  network: NetworkConfig;
}

const NetworkCard: React.FC<NetworkCardProps> = ({ network }) => {
  return (
    <Link
      to={`/${network.networkId}`}
      className="network-card-link"
      style={{ "--network-color": network.color } as React.CSSProperties}
    >
      <div className="network-card">
        <div className="network-card-header">
          <div className="network-card-icon">
            <NetworkIcon network={network} size={32} />
          </div>
          <div className="network-card-info">
            <div className="network-card-title-row">
              <h3 className="network-card-title">{network.name}</h3>
              <TierBadge subscription={network.subscription} size="small" />
            </div>
            <div className="network-card-chain-id">Network ID: {network.networkId}</div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default function Home() {
  const { enabledNetworks: allNetworks, isLoading } = useNetworks();

  const displayNetworks = useMemo(() => {
    const environment = process.env.REACT_APP_ENVIRONMENT;
    const isDevelopment = environment === "development";
    const envNetworks = process.env.REACT_APP_OPENSCAN_NETWORKS;

    // Check if Hardhat (31337) is explicitly enabled in REACT_APP_OPENSCAN_NETWORKS
    const hardhatNetworkId = 31337;
    const isHardhatExplicitlyEnabled = envNetworks
      ?.split(",")
      .map((id) => parseInt(id.trim(), 10))
      .includes(hardhatNetworkId);

    // Filter out Hardhat from home page if not in development and not explicitly enabled
    if (!isDevelopment && !isHardhatExplicitlyEnabled) {
      return allNetworks.filter((n) => n.networkId !== hardhatNetworkId);
    }

    return allNetworks;
  }, [allNetworks]);

  return (
    <div className="home-container">
      <div className="home-content page-card">
        <h1 className="home-title">OPENSCAN</h1>
        <p className="subtitle">Select a blockchain network to explore</p>

        <HomeSearchBar networks={displayNetworks} />

        <div className="network-grid">
          {isLoading && displayNetworks.length === 0 ? (
            <p className="loading-text">Loading networks...</p>
          ) : (
            displayNetworks.map((network) => (
              <NetworkCard key={network.networkId} network={network} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
