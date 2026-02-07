import type React from "react";
import { useCallback, useContext, useEffect, useState } from "react";
import { AppContext } from "../../../../../context";
import { fetchToken, getAssetUrl } from "../../../../../services/MetadataService";
import { useTranslation } from "react-i18next";
import {
  fetchERC20TokenInfo,
  formatTokenBalance,
  isValidAddress,
  type ERC20TokenInfo,
} from "../../../../../utils/erc20Utils";
import type { TokenHolding } from "./TokenHoldings";

interface CustomTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerAddress: string;
  networkId: number;
  onTokenFetched: (token: TokenHolding) => void;
}

const CustomTokenModal: React.FC<CustomTokenModalProps> = ({
  isOpen,
  onClose,
  ownerAddress,
  networkId,
  onTokenFetched,
}) => {
  const { rpcUrls } = useContext(AppContext);
  const { t } = useTranslation("address");
  const [tokenAddress, setTokenAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<ERC20TokenInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const getRpcUrl = useCallback((): string | null => {
    const rpcNetworkId = `eip155:${networkId}`;
    const rpcUrlsForChain = rpcUrls[rpcNetworkId];
    if (!rpcUrlsForChain) return null;
    const url = Array.isArray(rpcUrlsForChain) ? rpcUrlsForChain[0] : rpcUrlsForChain;
    return url ?? null;
  }, [rpcUrls, networkId]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTokenAddress("");
      setTokenInfo(null);
      setError(null);
      setValidationError(null);
    }
  }, [isOpen]);

  // Fetch token info when a valid address is entered
  useEffect(() => {
    if (!tokenAddress || !isValidAddress(tokenAddress)) {
      setTokenInfo(null);
      if (tokenAddress && tokenAddress.length > 0) {
        setValidationError("Invalid address format");
      } else {
        setValidationError(null);
      }
      return;
    }

    setValidationError(null);
    const fetchInfo = async () => {
      const rpcUrl = getRpcUrl();
      if (!rpcUrl) {
        setError("No RPC URL available for this network");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const info = await fetchERC20TokenInfo(tokenAddress, ownerAddress, rpcUrl);

        // Check if this is actually an ERC20 token
        if (!info.decimals && !info.symbol && !info.name) {
          setError("This address does not appear to be an ERC20 token");
          setTokenInfo(null);
        } else {
          setTokenInfo(info);
        }
      } catch (err) {
        console.error("Error fetching token info:", err);
        setError("Failed to fetch token information");
        setTokenInfo(null);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchInfo, 500);
    return () => clearTimeout(debounceTimer);
  }, [tokenAddress, ownerAddress, getRpcUrl]);

  const handleAddToken = async () => {
    if (!tokenInfo || !isValidAddress(tokenAddress)) return;

    // Try to get additional metadata from the metadata service
    const metadata = await fetchToken(networkId, tokenAddress).catch(() => null);

    const decimals = tokenInfo.decimals ?? 18;
    const holding: TokenHolding = {
      tokenAddress: tokenAddress.toLowerCase(),
      name: metadata?.name || tokenInfo.name || "Unknown Token",
      symbol: metadata?.symbol || tokenInfo.symbol || "",
      decimals,
      balance: tokenInfo.balance || "0",
      formattedBalance: tokenInfo.balance ? formatTokenBalance(tokenInfo.balance, decimals) : "0",
      logo: metadata?.logo
        ? getAssetUrl(metadata.logo)
        : getAssetUrl(`assets/tokens/${networkId}/${tokenAddress.toLowerCase()}.png`),
      isCustom: true,
    };

    onTokenFetched(holding);
  };

  const handleBackdropClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Modal overlay click-to-close is a common pattern
    <div
      className="modal-overlay"
      role="presentation"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div className="modal custom-token-modal">
        <div className="modal-header">
          <h3 className="modal-title">{t("fetchCustomToken")}</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="token-address" className="form-label">
              {t("tokenContractAddress")}
            </label>
            <input
              id="token-address"
              type="text"
              className="input-primary custom-token-input"
              placeholder="0x..."
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value.trim())}
            />
            {validationError && (
              <div className="custom-token-validation-error">{validationError}</div>
            )}
          </div>

          {loading && <div className="custom-token-loading">{t("fetchingTokenInfo")}</div>}

          {error && <div className="custom-token-error">{error}</div>}

          {tokenInfo && !error && (
            <div className="custom-token-preview">
              <div className="custom-token-preview-header">{t("tokenDetails")}</div>
              <div className="custom-token-preview-row">
                <span className="custom-token-preview-label">{t("nameLabel")}</span>
                <span className="custom-token-preview-value">{tokenInfo.name || t("unknown")}</span>
              </div>
              <div className="custom-token-preview-row">
                <span className="custom-token-preview-label">{t("symbolLabel")}</span>
                <span className="custom-token-preview-value">
                  {tokenInfo.symbol || t("unknown")}
                </span>
              </div>
              <div className="custom-token-preview-row">
                <span className="custom-token-preview-label">{t("decimalsLabel")}</span>
                <span className="custom-token-preview-value">
                  {tokenInfo.decimals ?? t("unknown")}
                </span>
              </div>
              <div className="custom-token-preview-row">
                <span className="custom-token-preview-label">{t("yourBalance")}</span>
                <span className="custom-token-preview-value custom-token-balance">
                  {tokenInfo.balance
                    ? `${formatTokenBalance(tokenInfo.balance, tokenInfo.decimals ?? 18)} ${tokenInfo.symbol || ""}`
                    : "0"}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            {t("cancel")}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleAddToken}
            disabled={!tokenInfo || loading || !!error}
          >
            {t("addToken")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomTokenModal;
