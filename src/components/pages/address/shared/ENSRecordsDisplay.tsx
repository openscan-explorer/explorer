import type React from "react";
import { useState } from "react";
import type { DecodedContenthash, ENSRecords, ENSReverseResult } from "../../../../types";

interface ENSRecordsDisplayProps {
  ensName: string | null;
  reverseResult?: ENSReverseResult | null;
  records?: ENSRecords | null;
  decodedContenthash?: DecodedContenthash | null;
  loading?: boolean;
  isMainnet?: boolean;
}

const TEXT_RECORD_LABELS: Record<string, string> = {
  avatar: "Avatar",
  email: "Email",
  url: "Website",
  description: "Description",
  "com.twitter": "Twitter",
  "com.github": "GitHub",
  "com.discord": "Discord",
  "org.telegram": "Telegram",
  notice: "Notice",
  keywords: "Keywords",
  location: "Location",
};

const ENSRecordsDisplay: React.FC<ENSRecordsDisplayProps> = ({
  ensName,
  reverseResult,
  records,
  decodedContenthash,
  loading = false,
  isMainnet = true,
}) => {
  const [showAllRecords, setShowAllRecords] = useState(false);

  // If not on mainnet, show a notice
  if (!isMainnet) {
    return (
      <div className="tx-details">
        <div className="tx-section">
          <span className="tx-section-title">ENS Records</span>
        </div>
        <div className="ens-notice-warning">ENS records are only available on Ethereum Mainnet</div>
      </div>
    );
  }

  // If loading
  if (loading) {
    return (
      <div className="tx-details">
        <div className="tx-section">
          <span className="tx-section-title">ENS Records</span>
        </div>
        <div className="ens-loading">Loading ENS records...</div>
      </div>
    );
  }

  // No ENS name found
  if (!ensName && !reverseResult?.ensName) {
    return null; // Don't show the section if there's no ENS name
  }

  const displayName = ensName || reverseResult?.ensName;
  const hasTextRecords = records?.textRecords && Object.keys(records.textRecords).length > 0;

  return (
    <div className="tx-details">
      <div className="tx-section">
        <span className="tx-section-title">ENS Records</span>
      </div>

      {/* Primary ENS Name */}
      <div className="tx-row">
        <span className="tx-label">ENS Name:</span>
        <span className="tx-value">
          <span className="ens-name-wrapper">
            <span className="ens-name">{displayName}</span>
            {reverseResult && (
              <span
                className={`ens-badge ${reverseResult.verified ? "ens-badge--verified" : "ens-badge--unverified"}`}
              >
                {reverseResult.verified ? "Primary Name" : "Unverified"}
              </span>
            )}
          </span>
        </span>
      </div>

      {/* Avatar */}
      {records?.textRecords?.avatar && (
        <div className="tx-row">
          <span className="tx-label">Avatar:</span>
          <span className="tx-value">
            {records.textRecords.avatar.startsWith("http") ||
            records.textRecords.avatar.startsWith("ipfs") ? (
              <div className="flex items-center gap-3">
                <img
                  src={records.textRecords.avatar.replace("ipfs://", "https://ipfs.io/ipfs/")}
                  alt="ENS Avatar"
                  className="ens-avatar"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <a
                  href={records.textRecords.avatar}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-primary"
                >
                  {records.textRecords.avatar.length > 50
                    ? `${records.textRecords.avatar.slice(0, 50)}...`
                    : records.textRecords.avatar}
                </a>
              </div>
            ) : (
              <span className="tx-mono">{records.textRecords.avatar}</span>
            )}
          </span>
        </div>
      )}

      {/* Contenthash */}
      {records?.contenthash && (
        <div className="tx-row">
          <span className="tx-label">Content Hash:</span>
          <span className="tx-value">
            {decodedContenthash ? (
              <div className="flex items-center gap-2">
                <span className="ens-badge ens-badge--contenthash">{decodedContenthash.type}</span>
                <a
                  href={decodedContenthash.url.replace("ipfs://", "https://ipfs.io/ipfs/")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-primary"
                >
                  {decodedContenthash.url.length > 60
                    ? `${decodedContenthash.url.slice(0, 60)}...`
                    : decodedContenthash.url}
                </a>
              </div>
            ) : (
              <span className="tx-mono text-sm">{records.contenthash.slice(0, 20)}...</span>
            )}
          </span>
        </div>
      )}

      {/* Text Records */}
      {hasTextRecords && (
        <>
          <button
            type="button"
            className="tx-row btn-ens-toggle cursor-pointer"
            onClick={() => setShowAllRecords(!showAllRecords)}
          >
            <span className="tx-label">
              Text Records ({Object.keys(records.textRecords).length}):
            </span>
            <span className="tx-value text-blue">
              {showAllRecords ? "Hide" : "Show"} {showAllRecords ? "▼" : "▶"}
            </span>
          </button>

          {showAllRecords && (
            <div className="ens-text-records-wrapper">
              {Object.entries(records.textRecords)
                .filter(([key]) => key !== "avatar") // Avatar is displayed separately
                .map(([key, value]) => (
                  <div className="tx-row" key={key}>
                    <span className="tx-label min-w-120">{TEXT_RECORD_LABELS[key] || key}:</span>
                    <span className="tx-value">
                      {value.startsWith("http") ? (
                        <a
                          href={value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link-primary"
                        >
                          {value.length > 50 ? `${value.slice(0, 50)}...` : value}
                        </a>
                      ) : key === "com.twitter" ? (
                        <a
                          href={`https://twitter.com/${value.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link-primary"
                        >
                          @{value.replace("@", "")}
                        </a>
                      ) : key === "com.github" ? (
                        <a
                          href={`https://github.com/${value}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link-primary"
                        >
                          {value}
                        </a>
                      ) : key === "email" ? (
                        <a href={`mailto:${value}`} className="link-primary">
                          {value}
                        </a>
                      ) : (
                        <span>{value}</span>
                      )}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {/* Link to ENS app */}
      {displayName && (
        <div className="tx-row">
          <span className="tx-label">ENS App:</span>
          <span className="tx-value">
            <a
              href={`https://app.ens.domains/name/${displayName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ens-app-link"
            >
              View on ENS App ↗
            </a>
          </span>
        </div>
      )}
    </div>
  );
};

export default ENSRecordsDisplay;
