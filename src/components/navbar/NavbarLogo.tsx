import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { NetworkConfig } from "../../config/networks";
import { getSubdomainForNetwork, subdomainConfig } from "../../config/subdomains";
import { useNetworks } from "../../context/AppContext";
import { getBaseDomainUrl, getSubdomain, getSubdomainRedirect } from "../../utils/subdomainUtils";
import NetworkIcon from "../common/NetworkIcon";

// OpenScan cube SVG component
const OpenScanCube = () => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: decorative icon
  <svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Top face - brightest */}
    <polygon points="20,6 34,14 20,22 6,14" fill="#067455ff" />
    {/* Left face - medium */}
    <polygon points="6,14 20,22 20,36 6,28" fill="#07634aff" />
    {/* Right face - darkest */}
    <polygon points="20,22 34,14 34,28 20,36" fill="#065743ff" />
  </svg>
);

// Arrow icon for dropdown toggle
const ChevronDown = ({ size = 12 }: { size?: number }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: decorative icon
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6 9l6 6 6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function NavbarLogo() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Get current subdomain info
  const subdomain = getSubdomain();
  const subdomainRedirect = getSubdomainRedirect();

  // Extract network ID from subdomain redirect path (e.g., "/1" -> 1)
  const networkIdFromSubdomain =
    subdomainRedirect && /^\/\d+$/.test(subdomainRedirect)
      ? Number(subdomainRedirect.slice(1))
      : null;

  // Extract network ID from URL path (e.g., "/1/blocks" -> 1)
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const networkIdFromPath =
    pathSegments[0] && /^\d+$/.test(pathSegments[0]) ? Number(pathSegments[0]) : null;

  // Check if the network from path has a configured subdomain
  const networkFromPathHasSubdomain = networkIdFromPath
    ? getSubdomainForNetwork(networkIdFromPath)
    : null;

  // Determine which network to show:
  // 1. If on a subdomain, use that network
  // 2. If on a network page (from path) that has a subdomain configured, use that
  const activeNetworkId =
    networkIdFromSubdomain ?? (networkFromPathHasSubdomain ? networkIdFromPath : null);

  // Get network config from enabled networks only
  const { enabledNetworks } = useNetworks();
  const network = useMemo(() => {
    if (!activeNetworkId) return undefined;
    return enabledNetworks.find((n) => n.networkId === activeNetworkId);
  }, [activeNetworkId, enabledNetworks]);

  // Get all networks that have subdomain support (enabled networks with subdomain config)
  const networksWithSubdomain = useMemo(() => {
    const networkSubdomains = subdomainConfig.filter(
      (config) => config.enabled && /^\/\d+$/.test(config.redirect),
    );

    const networks: NetworkConfig[] = [];
    for (const config of networkSubdomains) {
      const networkId = Number(config.redirect.slice(1));
      const networkConfig = enabledNetworks.find((n) => n.networkId === networkId);
      if (networkConfig) {
        networks.push(networkConfig);
      }
    }
    return networks;
  }, [enabledNetworks]);

  // Other networks (not the current one) for the dropdown
  const otherNetworks = useMemo(() => {
    return networksWithSubdomain.filter((n) => n.networkId !== activeNetworkId);
  }, [networksWithSubdomain, activeNetworkId]);

  // Determine if we're currently on the subdomain for this network
  const isOnSubdomain = Boolean(subdomain && networkIdFromSubdomain);

  // Only show network logo if we have a valid enabled network with subdomain support
  const showNetworkLogo = activeNetworkId && network;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleGoToHome = useCallback(() => {
    if (isOnSubdomain) {
      // If on subdomain, go to base domain
      const baseDomainUrl = getBaseDomainUrl();
      if (baseDomainUrl) {
        window.location.href = baseDomainUrl;
      }
    } else {
      // If on path, just go to root
      window.location.href = "/";
    }
    setIsDropdownOpen(false);
  }, [isOnSubdomain]);

  const handleGoToNetwork = useCallback(
    (networkId?: number) => {
      const targetNetworkId = networkId ?? activeNetworkId;
      if (!targetNetworkId) return;

      // Navigate to network page path
      window.location.href = `/${targetNetworkId}`;
      setIsDropdownOpen(false);
    },
    [activeNetworkId],
  );

  // If not on a network subdomain, show the regular OpenScan cube
  if (!showNetworkLogo) {
    return (
      <Link to="/" className="home-cube-link" title="Home">
        <OpenScanCube />
      </Link>
    );
  }

  // On a network subdomain - show network icon with dropdown
  return (
    <div className="navbar-logo-container" ref={dropdownRef}>
      <div className="navbar-logo-group">
        <button
          type="button"
          className="navbar-logo-arrow"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          aria-label="Toggle menu"
          title="Toggle menu"
        >
          <ChevronDown size={14} />
        </button>

        <button
          type="button"
          className="navbar-logo-network"
          onClick={() => handleGoToNetwork()}
          title={`Go to ${network.name}`}
        >
          <NetworkIcon network={network} size={28} />
        </button>
      </div>

      {isDropdownOpen && (
        <div className="navbar-logo-dropdown">
          {/* Current network first */}
          <button
            type="button"
            className="navbar-logo-dropdown-item active"
            onClick={() => handleGoToNetwork()}
          >
            <NetworkIcon network={network} size={24} />
            <span>{network.name}</span>
          </button>

          {/* Other networks with subdomain support */}
          {otherNetworks.map((otherNetwork) => (
            <button
              key={otherNetwork.networkId}
              type="button"
              className="navbar-logo-dropdown-item"
              onClick={() => handleGoToNetwork(otherNetwork.networkId)}
            >
              <NetworkIcon network={otherNetwork} size={24} />
              <span>{otherNetwork.name}</span>
            </button>
          ))}

          {/* Divider */}
          <div className="navbar-logo-dropdown-divider" />

          {/* OpenScan home */}
          <button type="button" className="navbar-logo-dropdown-item" onClick={handleGoToHome}>
            <OpenScanCube />
            <span>OpenScan</span>
          </button>
        </div>
      )}
    </div>
  );
}
