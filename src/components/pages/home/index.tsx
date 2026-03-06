import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { NetworkConfig } from "../../../config/networks";
import { useNetworks } from "../../../context/AppContext";
import { useSettings } from "../../../context/SettingsContext";
import { getChainIdFromNetwork } from "../../../utils/networkResolver";
import NetworkIcon from "../../common/NetworkIcon";
import TierBadge from "../../common/TierBadge";
import HomeSearchBar from "./HomeSearchBar";

interface NetworkCardProps {
  network: NetworkConfig;
  showChainId?: boolean;
}

const NetworkCard: React.FC<NetworkCardProps> = ({ network, showChainId = false }) => {
  const chainId = getChainIdFromNetwork(network);
  const { t } = useTranslation("home");
  return (
    <Link
      to={`/${chainId ?? network.slug}`}
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
              {network.networkId !== "eip155:1" && (
                <TierBadge subscription={network.subscription} size="small" />
              )}
            </div>
            {showChainId && chainId !== undefined && (
              <div className="network-card-chain-id">
                {t("chainID")}: {chainId}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default function Home() {
  const { t } = useTranslation("home");
  const { enabledNetworks, isLoading } = useNetworks();
  const { isSuperUser } = useSettings();
  const [showTestnets, setShowTestnets] = useState(false);

  const { featuredNetworks, productionNetworks, testnetNetworks } = useMemo(() => {
    const isDevelopment = process.env.REACT_APP_ENVIRONMENT === "development";
    const localhostChainId = 31337;

    // In development, treat localhost as a production network (show with other networks)
    const isProductionNetwork = (n: (typeof enabledNetworks)[0]) => {
      if (isDevelopment && getChainIdFromNetwork(n) === localhostChainId) {
        return true;
      }
      return !n.isTestnet;
    };

    const allProduction = enabledNetworks.filter(isProductionNetwork);
    const testnetNetworks = enabledNetworks.filter((n) => !isProductionNetwork(n));

    // Featured on top: Ethereum Mainnet + Bitcoin Mainnet
    const ethMainnet = allProduction.find((n) => n.networkId === "eip155:1");
    const btcMainnet = allProduction.find((n) => n.type === "bitcoin" && !n.isTestnet);
    const featuredNetworks = [ethMainnet, btcMainnet].filter((n): n is NetworkConfig => Boolean(n));

    const featuredIds = new Set(featuredNetworks.map((n) => n.networkId));
    const productionNetworks = allProduction.filter((n) => !featuredIds.has(n.networkId));

    return { featuredNetworks, productionNetworks, testnetNetworks };
  }, [enabledNetworks]);

  return (
    <div className="home-container">
      <div className="home-content page-card">
        <h1 className="home-title">{t("title")}</h1>

        <HomeSearchBar networks={enabledNetworks} />

        {featuredNetworks.length > 0 && (
          <div className="network-grid network-grid-featured">
            {featuredNetworks.map((network) => (
              <NetworkCard
                key={network.networkId}
                network={network}
                showChainId={isSuperUser}
              />
            ))}
          </div>
        )}

        <div className="network-grid">
          {isLoading && productionNetworks.length === 0 && featuredNetworks.length === 0 ? (
            <p className="loading-text">{t("loading")}</p>
          ) : (
            productionNetworks.map((network) => (
              <NetworkCard
                key={network.networkId}
                network={network}
                showChainId={isSuperUser}
              />
            ))
          )}
        </div>

        {isSuperUser && testnetNetworks.length > 0 && (
          <>
            {showTestnets && (
              <div className="network-grid testnet-grid">
                {testnetNetworks.map((network) => (
                  <NetworkCard key={network.networkId} network={network} showChainId={isSuperUser} />
                ))}
              </div>
            )}
            <div className="testnet-toggle-container">
              <button
                type="button"
                className="testnet-toggle-btn"
                onClick={() => setShowTestnets(!showTestnets)}
              >
                {showTestnets ? t("hideTestnets") : t("showTestnets")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
