import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/SettingsContext";
import { useSearch } from "../../hooks/useSearch";
import NavbarLogo from "./NavbarLogo";
import { NetworkBlockIndicator } from "./NetworkBlockIndicator";
import BuildWarningIcon from "./BuildWarningIcon";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { searchTerm, setSearchTerm, isResolving, error, clearError, handleSearch, networkId } =
    useSearch();
  const { isDarkMode, toggleTheme } = useTheme();

  // Check if we should show the search box (on blocks, block, txs, tx pages)
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const shouldShowSearch =
    networkId &&
    pathSegments.length >= 2 &&
    pathSegments[1] &&
    ["blocks", "block", "txs", "tx", "address"].includes(pathSegments[1]);

  const goToSettings = () => {
    navigate("/settings");
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <ul>
            <li>
              <NavbarLogo />
            </li>
            {networkId && (
              <>
                <li>
                  <Link to={`/${networkId}/blocks`}>BLOCKS</Link>
                </li>
                <li>
                  <Link to={`/${networkId}/txs`}>TRANSACTIONS</Link>
                </li>
              </>
            )}
          </ul>

          {/* Search Box */}
          {shouldShowSearch && (
            <div className="search-container">
              <form onSubmit={handleSearch} className="search-form">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    clearError();
                  }}
                  placeholder="Search by Address / Tx Hash / Block / ENS"
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
                  {/** biome-ignore lint/a11y/noSvgWithoutTitle: <TODO> */}
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
              </form>
            </div>
          )}

          <div className="navbar-right">
            <NetworkBlockIndicator />
            <BuildWarningIcon />
            <ul>
              <li>
                {/** biome-ignore lint/a11y/useButtonType: <TODO> */}
                <button
                  onClick={() => navigate("/devtools")}
                  className="navbar-toggle-btn"
                  aria-label="Dev Tools"
                  title="Dev Tools"
                >
                  {/** biome-ignore lint/a11y/noSvgWithoutTitle: <TODO> */}
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
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
              <li>
                {/* biome-ignore lint/a11y/useButtonType: nav buttons don't submit forms */}
                <button
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
                {/** biome-ignore lint/a11y/useButtonType: <TODO> */}
                <button
                  onClick={() => goToSettings()}
                  className="navbar-toggle-btn"
                  aria-label="Settings"
                  title="Settings"
                >
                  {/** biome-ignore lint/a11y/noSvgWithoutTitle: <TODO> */}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
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
          </div>
        </div>
      </nav>
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
