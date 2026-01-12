import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { NetworkConfig } from "../../../config/networks";
import { ENSService } from "../../../services/ENS/ENSService";
import NetworkIcon from "../../common/NetworkIcon";

type SearchType = "address" | "transaction" | "block" | "ens" | null;

interface HomeSearchBarProps {
  networks: NetworkConfig[];
}

function detectSearchType(term: string): SearchType {
  const trimmed = term.trim();
  if (!trimmed) return null;
  if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) return "transaction";
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return "address";
  if (/^\d+$/.test(trimmed)) return "block";
  if (ENSService.isENSName(trimmed)) return "ens";
  return null;
}

function getSearchTypeLabel(type: SearchType): string {
  switch (type) {
    case "address":
      return "address";
    case "transaction":
      return "transaction";
    case "block":
      return "block";
    case "ens":
      return "ENS name";
    default:
      return "";
  }
}

function truncateSearchTerm(term: string): string {
  if (term.length <= 16) return term;
  return `${term.slice(0, 8)}...${term.slice(-6)}`;
}

export default function HomeSearchBar({ networks }: HomeSearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const searchType = detectSearchType(searchTerm);
  const showDropdown = isDropdownOpen && searchType !== null;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Open dropdown when valid pattern is detected
  useEffect(() => {
    if (searchType !== null) {
      setIsDropdownOpen(true);
    }
  }, [searchType]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setError(null);
  }, []);

  const handleSearchClick = useCallback(() => {
    const term = searchTerm.trim();
    if (!term) return;

    if (searchType === null) {
      setError(
        "Invalid search. Enter an address (0x...), transaction hash, block number, or ENS name.",
      );
      setIsDropdownOpen(false);
    } else {
      setIsDropdownOpen(true);
    }
  }, [searchTerm, searchType]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setIsDropdownOpen(false);
      }
      if (e.key === "Enter") {
        handleSearchClick();
      }
    },
    [handleSearchClick],
  );

  const handleNetworkSelect = useCallback(
    (network: NetworkConfig) => {
      const term = searchTerm.trim();
      if (!term || !searchType) return;

      const networkId = network.networkId;

      switch (searchType) {
        case "transaction":
          navigate(`/${networkId}/tx/${term}`);
          break;
        case "address":
          navigate(`/${networkId}/address/${term}`);
          break;
        case "block":
          navigate(`/${networkId}/block/${term}`);
          break;
        case "ens":
          // Navigate directly to the ENS URL - the address page will resolve it
          navigate(`/1/address/${term}`);
          break;
      }

      setSearchTerm("");
      setIsDropdownOpen(false);
    },
    [searchTerm, searchType, navigate],
  );

  // For ENS, only show Mainnet in dropdown
  const displayNetworks =
    searchType === "ens" ? networks.filter((n) => n.networkId === 1) : networks;

  return (
    <div className="home-search-container" ref={containerRef}>
      <div className="home-search-input-wrapper">
        <input
          type="text"
          className="home-search-input"
          placeholder="Search by Address / Tx Hash / Block / ENS Name"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="home-search-button"
          onClick={handleSearchClick}
          aria-label="Search"
          title="Search"
        >
          {/* biome-ignore lint/a11y/noSvgWithoutTitle: button has aria-label */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
            <path
              d="M21 21l-4.35-4.35"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {error && <div className="home-search-error">{error}</div>}

      {showDropdown && (
        <div className="home-search-dropdown">
          <div className="home-search-dropdown-header">
            Search {getSearchTypeLabel(searchType)}{" "}
            <span className="home-search-term">{truncateSearchTerm(searchTerm.trim())}</span> on:
          </div>
          <div className="home-search-dropdown-list">
            {displayNetworks.map((network) => (
              <button
                key={network.networkId}
                type="button"
                className="home-search-dropdown-item"
                onClick={() => handleNetworkSelect(network)}
                style={
                  {
                    "--network-color": network.color,
                  } as React.CSSProperties
                }
              >
                <NetworkIcon network={network} size={20} />
                <span className="home-search-network-name">{network.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
