import { Link, useParams } from "react-router-dom";

export default function Mempool() {
  const { networkId } = useParams<{
    networkId?: string;
  }>();

  return (
    <div className="container-wide page-container-padded">
      <div className="page-card">
        <div className="text-center" style={{ padding: "40px 20px" }}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ opacity: 0.4, marginBottom: 16 }}
            aria-hidden="true"
          >
            <rect x="2" y="2" width="20" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 8h10M7 12h7M7 16h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <h1 className="page-heading" style={{ color: "var(--text-color, #fff)" }}>Mempool</h1>
          <p className="text-muted" style={{ marginBottom: 8 }}>
            The mempool viewer for pending transactions is under development.
          </p>
          <p className="text-muted" style={{ marginBottom: 24, fontSize: "0.85rem" }}>
            This feature will show real-time pending transactions, gas price distribution, and transaction filters.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {networkId && (
              <Link to={`/${networkId}/gastracker`} className="button-primary-inline">
                View Gas Tracker
              </Link>
            )}
            {networkId && (
              <Link to={`/${networkId}`} className="button-secondary-inline">
                Back to Dashboard
              </Link>
            )}
            <Link to="/" className="button-secondary-inline">
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
