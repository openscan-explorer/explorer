import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getEnabledNetworks, getNetworkLogoUrlById } from "../../../config/networks";
import { ENSService } from "../../../services/ENS/ENSService";
import type { NetworkConfig } from "../../../types";

type SearchType = "address" | "transaction" | "block" | "ens" | "unknown";

interface SearchTypeConfig {
  badge: string;
  getRoute: (networkId: number, query: string) => string;
}

const SEARCH_TYPE_CONFIG: Record<SearchType, SearchTypeConfig> = {
  address: {
    badge: "Address",
    getRoute: (networkId, query) => `/${networkId}/address/${query}`,
  },
  transaction: {
    badge: "TX Hash",
    getRoute: (networkId, query) => `/${networkId}/tx/${query}`,
  },
  block: {
    badge: "Block",
    getRoute: (networkId, query) => `/${networkId}/block/${query}`,
  },
  ens: {
    badge: "ENS",
    getRoute: (networkId, query) => `/${networkId}/address/${query}`,
  },
  unknown: {
    badge: "Unknown",
    getRoute: (networkId, query) => `/${networkId}/address/${query}`,
  },
};

function detectSearchType(query: string): SearchType {
  if (!query) return "unknown";

  // Check for ENS name first
  if (ENSService.isENSName(query)) {
    return "ens";
  }

  // Transaction/Block hash (64 hex characters)
  if (/^0x[a-fA-F0-9]{64}$/.test(query)) {
    return "transaction";
  }

  // Address (40 hex characters)
  if (/^0x[a-fA-F0-9]{40}$/.test(query)) {
    return "address";
  }

  // Block number
  if (/^\d+$/.test(query)) {
    return "block";
  }

  return "unknown";
}

function truncateQuery(query: string, maxLength = 16): string {
  if (query.length <= maxLength) return query;
  const start = Math.floor((maxLength - 3) / 2);
  const end = maxLength - 3 - start;
  return `${query.slice(0, start)}...${query.slice(-end)}`;
}

interface NetworkListItemProps {
  network: NetworkConfig;
  query: string;
  searchType: SearchType;
}

function NetworkListItem({ network, query, searchType }: NetworkListItemProps) {
  const config = SEARCH_TYPE_CONFIG[searchType];
  const route = config.getRoute(network.networkId, query);
  const logoUrl = getNetworkLogoUrlById(network.networkId);

  return (
    <Link
      to={route}
      className="search-result-item"
      style={{ "--network-color": network.color || "#888" } as React.CSSProperties}
    >
      <div className="search-result-item-content">
        <span className="search-result-query">{truncateQuery(query, 12)}</span>
        <span className="search-result-in">in</span>
        <div className="search-result-network">
          {logoUrl && (
            <img
              src={logoUrl}
              alt={network.name}
              width={18}
              height={18}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <span className="search-result-network-name">{network.name}</span>
        </div>
      </div>
      <span className="search-result-item-arrow">→</span>
    </Link>
  );
}

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const searchType = useMemo(() => detectSearchType(query), [query]);
  const config = SEARCH_TYPE_CONFIG[searchType];

  // Get networks to display
  const networks = useMemo(() => {
    const allNetworks = getEnabledNetworks();

    // For ENS names, only show Ethereum mainnet
    if (searchType === "ens") {
      return allNetworks.filter((n) => n.networkId === 1);
    }

    // For unknown types, don't show any networks
    if (searchType === "unknown") {
      return [];
    }

    // For other types, show all non-testnet networks first, then testnets
    const mainnets = allNetworks.filter((n) => !n.isTestnet);
    const testnets = allNetworks.filter((n) => n.isTestnet);
    return [...mainnets, ...testnets];
  }, [searchType]);

  if (!query) {
    return (
      <div className="container-wide search-page-wrapper">
        <div className="block-display-card search-results-card">
          <div className="search-results-container">
            <div className="search-results-header">
              <h1 className="search-results-title">Search</h1>
            </div>
            <p className="text-muted margin-0">No search query provided</p>
          </div>
        </div>
      </div>
    );
  }

  if (searchType === "unknown") {
    return (
      <div className="container-wide search-page-wrapper">
        <div className="block-display-card search-results-card">
          <div className="search-results-container">
            <div className="search-results-header">
              <h1 className="search-results-title">Search Results</h1>
              <div className="search-results-query-display">
                <span className="search-results-query-text">{query}</span>
                <span className="search-type-badge search-type-badge-error">Invalid</span>
              </div>
            </div>
            <p className="text-error margin-0">
              Invalid search query. Enter an address (0x...), transaction hash, block number, or ENS
              name.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-wide search-page-wrapper">
      <div className="block-display-card search-results-card">
        <div className="search-results-container">
          <div className="search-results-header">
            <h1 className="search-results-title">Search Results</h1>
            <div className="search-results-query-display">
              <span className="search-results-query-text">{query}</span>
              <span className="search-type-badge">{config.badge}</span>
            </div>
          </div>

          {searchType === "ens" && (
            <div className="search-info-message search-info-message-centered">
              ENS names resolve to addresses on Ethereum mainnet.
            </div>
          )}

          <div className="search-results-list">
            {networks.map((network) => (
              <NetworkListItem
                key={network.networkId}
                network={network}
                query={query}
                searchType={searchType}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
