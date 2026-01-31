import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useNetworks } from "../../context/AppContext";
import { getBaseDomainUrl, getSubdomain, getSubdomainRedirect } from "../../utils/subdomainUtils";
import { getNetworkUrlPath, resolveNetwork } from "../../utils/networkResolver";
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
  const navigate = useNavigate();

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
  const networkIdFromPath = pathSegments[0] || null;

  // Get network config from enabled networks
  const { networks } = useNetworks();

  // Resolve the current network from path or subdomain
  const currentNetwork = useMemo(() => {
    // First try subdomain
    if (networkIdFromSubdomain) {
      return resolveNetwork(String(networkIdFromSubdomain), networks);
    }
    // Then try path
    if (networkIdFromPath) {
      return resolveNetwork(networkIdFromPath, networks);
    }
    return null;
  }, [networkIdFromSubdomain, networkIdFromPath, networks]);

  // Determine if we're currently on the subdomain for this network
  const isOnSubdomain = Boolean(subdomain && networkIdFromSubdomain);

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

  const handleGoToNetwork = useCallback(() => {
    if (!currentNetwork) return;
    const networkId = getNetworkUrlPath(currentNetwork);
    navigate(`/${networkId}`);
    setIsDropdownOpen(false);
  }, [currentNetwork, navigate]);

  // If not on a network page, show the regular OpenScan cube
  if (!currentNetwork) {
    return (
      <Link to="/" className="home-cube-link" title="Home">
        <OpenScanCube />
      </Link>
    );
  }

  // On a network page - show network icon with dropdown
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: container for hover dropdown
    <div
      className="navbar-logo-container"
      ref={dropdownRef}
      onMouseEnter={() => setIsDropdownOpen(true)}
      onMouseLeave={() => setIsDropdownOpen(false)}
    >
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
          onClick={handleGoToNetwork}
          title={`Go to ${currentNetwork.name}`}
        >
          <NetworkIcon network={currentNetwork} size={28} />
        </button>
      </div>

      {isDropdownOpen && (
        <div className="navbar-logo-dropdown">
          {/* Current network home */}
          <button
            type="button"
            className="navbar-logo-dropdown-item active"
            onClick={handleGoToNetwork}
          >
            <NetworkIcon network={currentNetwork} size={24} />
            <span>{currentNetwork.name}</span>
          </button>

          {/* Divider */}
          <div className="navbar-logo-dropdown-divider" />

          {/* Blocks link */}
          <Link
            to={`/${getNetworkUrlPath(currentNetwork)}/blocks`}
            className="navbar-logo-dropdown-item"
            onClick={() => setIsDropdownOpen(false)}
          >
            <span>Blocks</span>
          </Link>

          {/* Transactions link */}
          <Link
            to={`/${getNetworkUrlPath(currentNetwork)}/txs`}
            className="navbar-logo-dropdown-item"
            onClick={() => setIsDropdownOpen(false)}
          >
            <span>Transactions</span>
          </Link>

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
