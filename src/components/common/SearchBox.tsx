import { useSearch } from "../../hooks/useSearch";

const SearchBox = () => {
  const { searchTerm, setSearchTerm, isResolving, error, clearError, handleSearch } = useSearch();

  return (
    <div className="home-search-container">
      <form onSubmit={handleSearch}>
        <div className="home-search-input-wrapper">
          <input
            type="text"
            className="home-search-input"
            placeholder="Search by Address / Txn Hash / Block / ENS Name"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              clearError();
            }}
            disabled={isResolving}
          />
          <button
            type="submit"
            className="home-search-button"
            disabled={isResolving}
            aria-label="Search"
            title="Search"
          >
            {isResolving ? (
              "..."
            ) : (
              // biome-ignore lint/a11y/noSvgWithoutTitle: button has aria-label
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
            )}
          </button>
        </div>
      </form>
      {error && <div className="home-search-error">{error}</div>}
    </div>
  );
};

export default SearchBox;
