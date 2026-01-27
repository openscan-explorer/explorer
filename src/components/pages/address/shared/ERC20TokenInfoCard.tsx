import type React from "react";
import { useMemo } from "react";

interface ERC20TokenInfoCardProps {
  tokenName?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  tokenTotalSupply?: string;
  tokenLogo?: string;
}

const ERC20TokenInfoCard: React.FC<ERC20TokenInfoCardProps> = ({
  tokenName,
  tokenSymbol,
  tokenDecimals,
  tokenTotalSupply,
  tokenLogo,
}) => {
  // Format total supply
  const formattedTotalSupply = useMemo(() => {
    if (!tokenTotalSupply || tokenDecimals === undefined) return null;
    try {
      const supply = BigInt(tokenTotalSupply);
      const divisor = BigInt(10 ** tokenDecimals);
      const whole = supply / divisor;
      return whole.toLocaleString();
    } catch {
      return tokenTotalSupply;
    }
  }, [tokenTotalSupply, tokenDecimals]);

  return (
    <div className="erc20-token-info-card">
      <div className="account-card-title">Token Info</div>

      {/* Token with Logo */}
      <div className="account-card-row">
        <span className="account-card-label">Token:</span>
        <span className="account-card-value">
          <span className="erc20-token-display">
            {tokenLogo && (
              <img
                src={tokenLogo}
                alt={tokenSymbol || "Token"}
                className="erc20-token-logo"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <span className="erc20-token-name-symbol">
              {tokenName && <span className="erc20-token-name">{tokenName}</span>}
              {tokenSymbol && <span className="erc20-token-symbol">({tokenSymbol})</span>}
            </span>
          </span>
        </span>
      </div>

      {/* Decimals */}
      {tokenDecimals !== undefined && (
        <div className="account-card-row">
          <span className="account-card-label">Decimals:</span>
          <span className="account-card-value">{tokenDecimals}</span>
        </div>
      )}

      {/* Total Supply */}
      {formattedTotalSupply && (
        <div className="account-card-row">
          <span className="account-card-label">Total Supply:</span>
          <span className="account-card-value">
            {formattedTotalSupply} {tokenSymbol}
          </span>
        </div>
      )}
    </div>
  );
};

export default ERC20TokenInfoCard;
