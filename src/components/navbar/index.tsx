import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";
import { useSearch } from "../../hooks/useSearch";
import NavbarLogo from "./NavbarLogo";
import { NetworkBlockIndicator } from "./NetworkBlockIndicator";
import BuildWarningIcon from "./BuildWarningIcon";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { searchTerm, setSearchTerm, isResolving, error, clearError, handleSearch, networkId } =
    useSearch();
  const { isDarkMode, toggleTheme, isSuperUser, toggleSuperUserMode } = useSettings();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check if we should show the search box (on any network page including home)
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const isOnNetworkPage =
    pathSegments.length >= 1 &&
    (pathSegments.length === 1 || // Network home page (e.g., /btc, /1)
      (pathSegments[1] && ["blocks", "block", "txs", "tx", "address"].includes(pathSegments[1])));
  const shouldShowSearch = networkId && isOnNetworkPage;

  // Close mobile menu on route change
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-run on pathname change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const goToSettings = () => {
    navigate("/settings");
  };

  const handleMobileNavigation = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          {/* Left side - Logo and Search */}
          <div className="navbar-left">
            <NavbarLogo />
            {/* Search Box - hidden on mobile */}
            {shouldShowSearch && (
              <form onSubmit={handleSearch} className="search-form hide-mobile">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    clearError();
                  }}
                  placeholder="Search by Address / Tx Hash / Block"
                  className="search-input"
                  disabled={isResolving}
                />
                <button
                  type="submit"
                  className="search-button"
                  aria-label="Search"
                  title="Search"
                  disabled={isResolving}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <title>Search</title>
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2.5" />
                    <path
                      d="M21 21l-4.35-4.35"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </form>
            )}
          </div>

          {/* Right side - Icons and hamburger */}
          <div className="navbar-right">
            <NetworkBlockIndicator />
            <BuildWarningIcon />

            {/* Desktop icons - hidden on mobile */}
            <ul className="hide-mobile">
              <li>
                <button
                  type="button"
                  onClick={toggleSuperUserMode}
                  className={`navbar-toggle-btn ${isSuperUser ? "navbar-toggle-active" : ""}`}
                  aria-label={isSuperUser ? "Disable Super User Mode" : "Enable Super User Mode"}
                  title={isSuperUser ? "Disable Super User Mode" : "Enable Super User Mode"}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <title>Super User Mode</title>
                    <polyline
                      points="4 17 10 11 4 5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <line
                      x1="12"
                      y1="19"
                      x2="20"
                      y2="19"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </li>
              {isSuperUser && (
                <li>
                  <button
                    type="button"
                    onClick={() => navigate("/devtools")}
                    className="navbar-toggle-btn"
                    aria-label="Dev Tools"
                    title="Dev Tools"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <title>Dev Tools</title>
                      <path
                        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </li>
              )}
              <li>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="navbar-toggle-btn"
                  aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                  title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {isDarkMode ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <title>Light mode</title>
                      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
                      <path
                        d="M12 1v2"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M12 21v2"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M4.22 4.22l1.42 1.42"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M18.36 18.36l1.42 1.42"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M1 12h2"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M21 12h2"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M4.22 19.78l1.42-1.42"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M18.36 5.64l1.42-1.42"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <title>Dark mode</title>
                      <path
                        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => goToSettings()}
                  className="navbar-toggle-btn"
                  aria-label="Settings"
                  title="Settings"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <title>Settings</title>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                    <path
                      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </button>
              </li>
            </ul>

            {/* Hamburger button - shown only on mobile */}
            <button
              type="button"
              className="navbar-hamburger"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={isMobileMenuOpen}
            >
              <div className="navbar-hamburger-icon">
                <span />
                <span />
                <span />
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`navbar-mobile-menu ${isMobileMenuOpen ? "is-open" : ""}`}>
        <div className="navbar-mobile-menu-header">
          <NavbarLogo />
          <button
            type="button"
            className="navbar-mobile-menu-close"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <title>Close</title>
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Mobile Search */}
        {shouldShowSearch && (
          <div className="navbar-mobile-search">
            <form
              onSubmit={(e) => {
                handleSearch(e);
                setIsMobileMenuOpen(false);
              }}
              className="search-form"
            >
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  clearError();
                }}
                placeholder="Search address, tx, block, ENS..."
                className="search-input"
                disabled={isResolving}
              />
              <button
                type="submit"
                className="search-button"
                aria-label="Search"
                disabled={isResolving}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <title>Search</title>
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M21 21l-4.35-4.35"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </form>
          </div>
        )}

        <nav className="navbar-mobile-menu-items">
          {/* Network-specific links */}
          {networkId && (
            <>
              <button
                type="button"
                className="navbar-mobile-menu-item"
                onClick={() => handleMobileNavigation(`/${networkId}/blocks`)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <title>Blocks</title>
                  <rect
                    x="3"
                    y="3"
                    width="7"
                    height="7"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <rect
                    x="14"
                    y="3"
                    width="7"
                    height="7"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <rect
                    x="3"
                    y="14"
                    width="7"
                    height="7"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <rect
                    x="14"
                    y="14"
                    width="7"
                    height="7"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
                <span>Blocks</span>
              </button>
              <button
                type="button"
                className="navbar-mobile-menu-item"
                onClick={() => handleMobileNavigation(`/${networkId}/txs`)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <title>Transactions</title>
                  <path
                    d="M12 2v20M2 12h20"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M17 7l5 5-5 5M7 17l-5-5 5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Transactions</span>
              </button>
            </>
          )}

          {networkId && <div className="navbar-mobile-menu-divider" />}

          {/* Global links */}
          <button
            type="button"
            className="navbar-mobile-menu-item"
            onClick={() => handleMobileNavigation("/")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <title>Home</title>
              <path
                d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9 22V12h6v10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Home</span>
          </button>
          {isSuperUser && (
            <button
              type="button"
              className="navbar-mobile-menu-item"
              onClick={() => handleMobileNavigation("/devtools")}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <title>Dev Tools</title>
                <path
                  d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Dev Tools</span>
            </button>
          )}
          <button
            type="button"
            className="navbar-mobile-menu-item"
            onClick={() => handleMobileNavigation("/settings")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <title>Settings</title>
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            <span>Settings</span>
          </button>

          <div className="navbar-mobile-menu-divider" />

          {/* Theme toggle */}
          <button
            type="button"
            className="navbar-mobile-menu-item"
            onClick={() => {
              toggleTheme();
            }}
          >
            {isDarkMode ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <title>Light mode</title>
                <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
                <path d="M12 1v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M12 21v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path
                  d="M4.22 4.22l1.42 1.42"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M18.36 18.36l1.42 1.42"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path d="M1 12h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M21 12h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path
                  d="M4.22 19.78l1.42-1.42"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M18.36 5.64l1.42-1.42"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <title>Dark mode</title>
                <path
                  d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>

          {/* Super User Mode toggle */}
          <button
            type="button"
            className={`navbar-mobile-menu-item ${isSuperUser ? "navbar-mobile-menu-item-active" : ""}`}
            onClick={toggleSuperUserMode}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <title>Super User Mode</title>
              <polyline
                points="4 17 10 11 4 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="12"
                y1="19"
                x2="20"
                y2="19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span>{isSuperUser ? "Disable Super User Mode" : "Enable Super User Mode"}</span>
          </button>

          <div className="navbar-mobile-menu-divider" />

          {/* Social links */}
          <div className="navbar-mobile-social-links">
            <a
              href="https://github.com/openscan-explorer/explorer"
              target="_blank"
              rel="noopener noreferrer"
              className="navbar-mobile-social-btn"
              title="View on GitHub"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <title>GitHub</title>
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </a>
            <a
              href="https://x.com/openscan_eth"
              target="_blank"
              rel="noopener noreferrer"
              className="navbar-mobile-social-btn"
              title="Follow on X"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <title>X (Twitter)</title>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>X (Twitter)</span>
            </a>
          </div>
        </nav>
      </div>

      {/* Error bar */}
      {error && (
        <div className="navbar-error-bar">
          <span>{error}</span>
          <button type="button" onClick={clearError} aria-label="Dismiss error">
            &times;
          </button>
        </div>
      )}
    </>
  );
};

export default Navbar;
