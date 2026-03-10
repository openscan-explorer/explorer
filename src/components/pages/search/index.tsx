import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { getEnabledNetworks, getNetworkLogoUrlById } from "../../../config/networks";
import { ENSService } from "../../../services/ENS/ENSService";
import type { NetworkConfig } from "../../../types";
import { getChainIdFromNetwork } from "../../../utils/networkResolver";
import SearchBox from "../../common/SearchBox";

type SearchType = "address" | "transaction" | "block" | "ens" | "unknown";

interface SearchTypeConfig {
  badge: string;
  getRoute: (chainId: number, query: string) => string;
}

const SEARCH_TYPE_CONFIG: Record<SearchType, SearchTypeConfig> = {
  address: {
    badge: "Address",
    getRoute: (chainId, query) => `/${chainId}/address/${query}`,
  },
  transaction: {
    badge: "TX Hash",
    getRoute: (chainId, query) => `/${chainId}/tx/${query}`,
  },
  block: {
    badge: "Block",
    getRoute: (chainId, query) => `/${chainId}/block/${query}`,
  },
  ens: {
    badge: "ENS",
    getRoute: (chainId, query) => `/${chainId}/address/${query}`,
  },
  unknown: {
    badge: "Unknown",
    getRoute: (chainId, query) => `/${chainId}/address/${query}`,
  },
};

const SEARCH_TYPE_BADGE_KEYS = {
  address: "search.badgeAddress",
  transaction: "search.badgeTxHash",
  block: "search.badgeBlock",
  ens: "search.badgeEns",
  unknown: "search.badgeUnknown",
} as const satisfies Record<SearchType, string>;

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
  const chainId = getChainIdFromNetwork(network);
  const route = chainId ? config.getRoute(chainId, query) : "#";
  const logoUrl = chainId ? getNetworkLogoUrlById(chainId) : undefined;
  const { t } = useTranslation();

  return (
    <Link
      to={route}
      className="search-result-item"
      style={{ "--network-color": network.color || "#888" } as React.CSSProperties}
    >
      <div className="search-result-item-content">
        <span className="search-result-query">{truncateQuery(query, 12)}</span>
        <span className="search-result-in">{t("search.in")}</span>
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
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const searchType = useMemo(() => detectSearchType(query), [query]);
  const badgeKey = SEARCH_TYPE_BADGE_KEYS[searchType];

  // Get networks to display (only EVM networks with chainId)
  const networks = useMemo(() => {
    const allNetworks = getEnabledNetworks().filter((n) => getChainIdFromNetwork(n) !== undefined);

    // For ENS names, only show Ethereum mainnet
    if (searchType === "ens") {
      return allNetworks.filter((n) => getChainIdFromNetwork(n) === 1);
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
          <div
            className="search-results-container"
            style={{ textAlign: "center", padding: "40px 20px" }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ opacity: 0.4, marginBottom: 16 }}
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M21 21l-4.35-4.35"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M11 8v6M8 11h6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <h1 className="search-results-title">{t("search.title")}</h1>
            <p className="text-muted" style={{ marginBottom: 24 }}>
              {t("search.noQueryHelp")}
            </p>
            <SearchBox />
            <div style={{ marginTop: 20 }}>
              <Link to="/" className="button-secondary-inline">
                {t("search.goHome")}
              </Link>
            </div>
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
              <h1 className="search-results-title">{t("search.resultsTitle")}</h1>
              <div className="search-results-query-display">
                <span className="search-results-query-text">{query}</span>
                <span className="search-type-badge search-type-badge-error">
                  {t("search.invalidBadge")}
                </span>
              </div>
            </div>
            <p className="text-error margin-0">{t("search.invalidQuery")}</p>
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
            <h1 className="search-results-title">{t("search.resultsTitle")}</h1>
            <div className="search-results-query-display">
              <span className="search-results-query-text">{query}</span>
              <span className="search-type-badge">{t(badgeKey)}</span>
            </div>
          </div>

          {searchType === "ens" && (
            <div className="search-info-message search-info-message-centered">
              {t("search.ensInfo")}
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
