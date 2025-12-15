import { useSearch } from "../../hooks/useSearch";

const SearchBox = () => {
  const { searchTerm, setSearchTerm, isResolving, error, clearError, handleSearch } = useSearch();

  return (
    <div className="search-box-container">
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          className="search-input"
          placeholder="Search by Address / Txn Hash / Block / ENS Name"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            clearError();
          }}
          disabled={isResolving}
        />
        <button type="submit" className="search-button" disabled={isResolving}>
          {isResolving ? "..." : "Scan"}
        </button>
      </form>
      {error && <div className="search-error">{error}</div>}
    </div>
  );
};

export default SearchBox;
