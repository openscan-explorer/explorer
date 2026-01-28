import type React from "react";
import type { ENSReverseResult } from "../../../../types";
import TokenHoldings from "./TokenHoldings";

interface ContractMoreInfoCardProps {
  ensName?: string | null;
  reverseResult?: ENSReverseResult | null;
  ownerAddress: string;
  networkId: number;
  isMainnet?: boolean;
}

const ContractMoreInfoCard: React.FC<ContractMoreInfoCardProps> = ({
  ensName,
  reverseResult,
  ownerAddress,
  networkId,
  isMainnet = true,
}) => {
  const displayName = ensName || reverseResult?.ensName;

  return (
    <div className="account-card">
      <div className="account-card-title">More Info</div>

      {/* ENS Name Row */}
      {isMainnet && (
        <div className="account-card-row">
          <span className="account-card-label">ENS Name:</span>
          <span className="account-card-value">
            {displayName ? (
              <span className="ens-name-wrapper">
                <span className="ens-name">{displayName}</span>
                {reverseResult && (
                  <span
                    className={`ens-badge-small ${reverseResult.verified ? "ens-badge--verified" : "ens-badge--unverified"}`}
                  >
                    {reverseResult.verified ? "Primary" : "Unverified"}
                  </span>
                )}
              </span>
            ) : (
              <span className="account-card-empty">Not set</span>
            )}
          </span>
        </div>
      )}

      {/* ENS App Link */}
      {isMainnet && displayName && (
        <div className="account-card-row">
          <span className="account-card-label">ENS App:</span>
          <span className="account-card-value">
            <a
              href={`https://app.ens.domains/name/${displayName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ens-app-link"
            >
              View on ENS App
            </a>
          </span>
        </div>
      )}

      {/* Token Holdings - Collapsible */}
      <div className="account-card-token-holdings">
        <TokenHoldings ownerAddress={ownerAddress} networkId={networkId} defaultCollapsed compact />
      </div>
    </div>
  );
};

export default ContractMoreInfoCard;
