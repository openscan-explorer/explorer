import { useLocation } from "react-router-dom";
import { useBitcoinDashboard } from "../../../hooks/useBitcoinDashboard";
import { resolveNetwork } from "../../../utils/networkResolver";
import { getAllNetworks } from "../../../config/networks";
import type { NetworkConfig } from "../../../types";
import Loader from "../../common/Loader";
import SearchBox from "../../common/SearchBox";
import BitcoinDashboardStats from "./BitcoinDashboardStats";
import BitcoinBlocksTable from "./BitcoinBlocksTable";
import BitcoinTransactionsTable from "./BitcoinTransactionsTable";

// Default Bitcoin network config for fallback
const DEFAULT_BITCOIN_NETWORK: NetworkConfig = {
  type: "bitcoin",
  networkId: "bip122:000000000019d6689c085ae165831e93",
  slug: "btc",
  name: "Bitcoin Mainnet",
  shortName: "Bitcoin",
  currency: "BTC",
  color: "#F7931A",
};

export default function BitcoinNetwork() {
  const location = useLocation();

  // Extract network slug from path (e.g., "/tbtc/..." → "tbtc", "/btc" → "btc")
  const pathSlug = location.pathname.split("/")[1] || "btc";
  const network = resolveNetwork(pathSlug, getAllNetworks()) || DEFAULT_BITCOIN_NETWORK;
  const dashboard = useBitcoinDashboard(network);

  const networkName = network.name.toUpperCase();
  const networkColor = network.color || "#F7931A";

  return (
    <div className="container-wide">
      <div className="block-display-card">
        <h1 className="home-title network-title">
          <span
            className="network-title-name"
            style={{ "--network-color": networkColor } as React.CSSProperties}
          >
            {networkName}
          </span>
        </h1>
        {network.description && <p className="network-description">{network.description}</p>}
        <SearchBox />

        {dashboard.loading && dashboard.latestBlocks.length === 0 && (
          <Loader text="Loading Bitcoin network data..." />
        )}

        {dashboard.error && <p className="error-text-center">Error: {dashboard.error}</p>}

        <BitcoinDashboardStats
          stats={dashboard.stats}
          btcPrice={dashboard.btcPrice}
          feeEstimates={dashboard.feeEstimates}
          loading={dashboard.loading}
        />

        <div className="dashboard-tables-row">
          <BitcoinBlocksTable
            blocks={dashboard.latestBlocks}
            loading={dashboard.loading}
            networkId={network.slug}
          />
          <BitcoinTransactionsTable
            transactions={dashboard.latestTransactions}
            loading={dashboard.loading && dashboard.latestTransactions.length === 0}
            networkId={network.slug}
          />
        </div>

        {network.links && network.links.length > 0 && (
          <div className="profile-links">
            <div className="profile-links-list">
              {network.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="profile-link-item"
                  title={link.description}
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
