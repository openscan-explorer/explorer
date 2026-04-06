import { useLocation } from "react-router-dom";
import { useSolanaDashboard } from "../../../hooks/useSolanaDashboard";
import { resolveNetwork } from "../../../utils/networkResolver";
import { getAllNetworks } from "../../../config/networks";
import type { NetworkConfig } from "../../../types";
import SearchBox from "../../common/SearchBox";
import SolanaDashboardStats from "./SolanaDashboardStats";
import SolanaBlocksTable from "./SolanaBlocksTable";
import SolanaTransactionsTable from "./SolanaTransactionsTable";

// Default Solana network config for fallback
const DEFAULT_SOLANA_NETWORK: NetworkConfig = {
  type: "solana",
  networkId: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  slug: "sol",
  name: "Solana",
  shortName: "Solana",
  currency: "SOL",
  color: "#9945FF",
};

export default function SolanaNetwork() {
  const location = useLocation();

  // Extract network slug from path
  const pathSlug = location.pathname.split("/")[1] || "sol";
  const network = resolveNetwork(pathSlug, getAllNetworks()) || DEFAULT_SOLANA_NETWORK;
  const dashboard = useSolanaDashboard(network);

  const networkName = network.name.toUpperCase();
  const networkColor = network.color || "#9945FF";

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

        {dashboard.error && <p className="error-text-center">Error: {dashboard.error}</p>}

        <SolanaDashboardStats
          stats={dashboard.stats}
          solPrice={dashboard.solPrice}
          loading={dashboard.loading}
        />

        <div className="dashboard-tables-row">
          <SolanaBlocksTable
            blocks={dashboard.latestBlocks}
            loading={dashboard.loading}
            networkId={pathSlug}
          />
          <SolanaTransactionsTable
            transactions={dashboard.latestTransactions}
            loading={dashboard.loadingTransactions}
            networkId={pathSlug}
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
