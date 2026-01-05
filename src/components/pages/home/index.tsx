import { useMemo, useState } from "react";
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
  const { enabledNetworks, isLoading } = useNetworks();
  const [showTestnets, setShowTestnets] = useState(false);

  const { productionNetworks, testnetNetworks } = useMemo(() => {
    const isDevelopment = process.env.REACT_APP_ENVIRONMENT === "development";
    const localhostNetworkId = 31337;

    // In development, treat localhost as a production network (show with other networks)
    const isProductionNetwork = (n: (typeof enabledNetworks)[0]) => {
      if (isDevelopment && n.networkId === localhostNetworkId) {
        return true;
      }
      return !n.isTestnet;
    };

    const productionNetworks = enabledNetworks.filter(isProductionNetwork);
    const testnetNetworks = enabledNetworks.filter((n) => !isProductionNetwork(n));

    return { productionNetworks, testnetNetworks };
  }, [enabledNetworks]);

  return (
    <div className="home-container">
      <div className="home-content page-card">
        <h1 className="home-title">OPENSCAN</h1>
        <p className="subtitle">Select a blockchain network to explore</p>

        <HomeSearchBar networks={enabledNetworks} />

        <div className="network-grid">
          {isLoading && productionNetworks.length === 0 ? (
            <p className="loading-text">Loading networks...</p>
          ) : (
            productionNetworks.map((network) => (
              <NetworkCard key={network.networkId} network={network} />
            ))
          )}
        </div>

        {testnetNetworks.length > 0 && (
          <>
            {showTestnets && (
              <div className="network-grid testnet-grid">
                {testnetNetworks.map((network) => (
                  <NetworkCard key={network.networkId} network={network} />
                ))}
              </div>
            )}
            <div className="testnet-toggle-container">
              <button
                type="button"
                className="testnet-toggle-btn"
                onClick={() => setShowTestnets(!showTestnets)}
              >
                {showTestnets ? "Hide testnets" : "Show testnets"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
