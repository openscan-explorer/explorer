import type React from "react";
import { useCallback, useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppContext } from "../../../../../context";
import { logger } from "../../../../../utils/logger";

interface TokenLogoProps {
  src?: string;
  symbol: string;
  name: string;
}

const TokenLogo: React.FC<TokenLogoProps> = ({ src, symbol, name }) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state when src changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: src is intentionally a dependency to reset error on URL change
  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError || !src) {
    // Show placeholder with first letter of symbol or name
    const letter = (symbol || name || "?").charAt(0).toUpperCase();
    return (
      <div className="token-logo token-logo-placeholder" title={name || symbol}>
        {letter}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={symbol || "Token"}
      className="token-logo"
      onError={() => setHasError(true)}
    />
  );
};
import {
  fetchToken,
  fetchTokenList,
  getAssetUrl,
  getTokenSupportersByChain,
  type Supporter,
  type TokenListItem,
} from "../../../../../services/MetadataService";
import { fetchERC20Balances, formatTokenBalance } from "../../../../../utils/erc20Utils";
import { useTranslation } from "react-i18next";
import CustomTokenModal from "./CustomTokenModal";

export interface TokenHolding {
  tokenAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
  formattedBalance: string;
  logo?: string;
  tier?: 1 | 2 | 3;
  isCustom?: boolean;
  isPopular?: boolean;
}

interface TokenHoldingsProps {
  ownerAddress: string;
  networkId: number;
  defaultCollapsed?: boolean;
  compact?: boolean;
}

const TokenHoldings: React.FC<TokenHoldingsProps> = ({
  ownerAddress,
  networkId,
  defaultCollapsed = false,
  compact = false,
}) => {
  const { t } = useTranslation("address");
  const { rpcUrls } = useContext(AppContext);
  const [holdings, setHoldings] = useState<TokenHolding[]>([]);
  const [loading, setLoading] = useState(false);
  const [popularLoading, setPopularLoading] = useState(false);
  const [popularLoaded, setPopularLoaded] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const getRpcUrl = useCallback((): string | null => {
    const rpcNetworkId = `eip155:${networkId}`;
    const rpcUrlsForChain = rpcUrls[rpcNetworkId];
    if (!rpcUrlsForChain) return null;
    const url = Array.isArray(rpcUrlsForChain) ? rpcUrlsForChain[0] : rpcUrlsForChain;
    return url ?? null;
  }, [rpcUrls, networkId]);

  const fetchSupporterTokenBalances = useCallback(
    async (tokens: Supporter[], rpcUrl: string): Promise<TokenHolding[]> => {
      const addresses = tokens.map((t) => t.tokenAddress || t.id);

      // Batch fetch balances AND metadata in parallel
      const [balances, metadataResults] = await Promise.all([
        fetchERC20Balances(addresses, ownerAddress, rpcUrl),
        Promise.all(addresses.map((addr) => fetchToken(networkId, addr).catch(() => null))),
      ]);

      return tokens
        .map((token, i) => {
          const addr = (token.tokenAddress || token.id).toLowerCase();
          const balance = balances.get(addr);
          const metadata = metadataResults[i];
          const decimals = metadata?.decimals ?? 18;

          return {
            tokenAddress: addr,
            name: metadata?.name || token.name,
            symbol: metadata?.symbol || "",
            decimals,
            balance: balance || "0",
            formattedBalance: balance ? formatTokenBalance(balance, decimals) : "0",
            logo: metadata?.logo
              ? getAssetUrl(metadata.logo)
              : getAssetUrl(`assets/tokens/${networkId}/${addr}.png`),
            tier: token.currentTier,
          };
        })
        .filter((h) => h.balance !== "0");
    },
    [ownerAddress, networkId],
  );

  const fetchPopularTokenBalances = useCallback(
    async (tokens: TokenListItem[], rpcUrl: string): Promise<TokenHolding[]> => {
      const addresses = tokens.map((t) => t.address);

      // Batch fetch balances
      const balances = await fetchERC20Balances(addresses, ownerAddress, rpcUrl);

      return tokens
        .map((token) => {
          const addr = token.address.toLowerCase();
          const balance = balances.get(addr);

          return {
            tokenAddress: addr,
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals,
            balance: balance || "0",
            formattedBalance: balance ? formatTokenBalance(balance, token.decimals) : "0",
            logo: getAssetUrl(`assets/tokens/${networkId}/${addr}.png`),
            isPopular: true,
          };
        })
        .filter((h) => h.balance !== "0");
    },
    [ownerAddress, networkId],
  );

  // Auto-fetch ALL supporter tokens on mount (sorted by tier, highest first)
  useEffect(() => {
    const fetchSupporterTokens = async () => {
      const rpcUrl = getRpcUrl();
      if (!rpcUrl) return;

      setLoading(true);
      setError(null);

      try {
        // Get all supporter tokens for this chain (already sorted by tier, highest first)
        const tokens = await getTokenSupportersByChain(networkId);
        if (tokens.length === 0) {
          setLoading(false);
          return;
        }

        const tokenHoldings = await fetchSupporterTokenBalances(tokens, rpcUrl);
        setHoldings(tokenHoldings);
      } catch (err) {
        logger.error("Error fetching supporter tokens:", err);
        setError("Failed to fetch token holdings");
      } finally {
        setLoading(false);
      }
    };

    fetchSupporterTokens();
  }, [networkId, getRpcUrl, fetchSupporterTokenBalances]);

  const handleFetchPopularTokens = async () => {
    const rpcUrl = getRpcUrl();
    if (!rpcUrl || popularLoading || popularLoaded) return;

    setPopularLoading(true);
    setError(null);

    try {
      // Fetch the token list from metadata
      const tokenList = await fetchTokenList(networkId);

      if (!tokenList || tokenList.tokens.length === 0) {
        setPopularLoaded(true);
        setPopularLoading(false);
        return;
      }

      // Filter out tokens we already have and only get ERC20 tokens
      const existingAddresses = new Set(holdings.map((h) => h.tokenAddress.toLowerCase()));
      const newTokens = tokenList.tokens.filter(
        (t) =>
          !existingAddresses.has(t.address.toLowerCase()) &&
          t.type !== "ERC721" &&
          t.type !== "ERC1155",
      );

      if (newTokens.length === 0) {
        setPopularLoaded(true);
        setPopularLoading(false);
        return;
      }

      const tokenHoldings = await fetchPopularTokenBalances(newTokens, rpcUrl);

      // Merge with existing holdings
      setHoldings((prev) => {
        const existingSet = new Set(prev.map((h) => h.tokenAddress.toLowerCase()));
        const uniqueNew = tokenHoldings.filter(
          (h) => !existingSet.has(h.tokenAddress.toLowerCase()),
        );
        return [...prev, ...uniqueNew];
      });

      setPopularLoaded(true);
    } catch (err) {
      logger.error("Error fetching popular tokens:", err);
      setError("Failed to fetch popular tokens");
    } finally {
      setPopularLoading(false);
    }
  };

  const handleCustomTokenFetched = (token: TokenHolding) => {
    // Add custom token, avoiding duplicates
    setHoldings((prev) => {
      const exists = prev.some(
        (h) => h.tokenAddress.toLowerCase() === token.tokenAddress.toLowerCase(),
      );
      if (exists) {
        // Update existing entry
        return prev.map((h) =>
          h.tokenAddress.toLowerCase() === token.tokenAddress.toLowerCase() ? token : h,
        );
      }
      return [...prev, token];
    });
    setShowCustomModal(false);
  };

  const getTierBadge = (tier?: 1 | 2 | 3) => {
    if (!tier) return null;
    const tierNames: Record<number, string> = {
      1: t("backer"),
      2: t("partner"),
      3: t("ally"),
    };
    return (
      <span className={`token-tier-badge tier-${tier}`} title={`Tier ${tier}: ${tierNames[tier]}`}>
        {tierNames[tier]}
      </span>
    );
  };

  const nonZeroHoldings = holdings.filter((h) => h.balance !== "0");
  const hasAnyTokens = nonZeroHoldings.length > 0;

  // Compact collapsed view
  if (compact && isCollapsed) {
    return (
      <div className="token-holdings-compact">
        <button
          type="button"
          className="token-holdings-toggle"
          onClick={() => setIsCollapsed(false)}
        >
          <span className="token-holdings-toggle-label">{t("tokenHoldings")}</span>
          <span className="token-holdings-toggle-count">
            {loading ? t("loading") : t("tokensCount", { count: nonZeroHoldings.length })}
          </span>
          <span className="token-holdings-toggle-arrow">+</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`tx-details token-holdings-section ${compact ? "token-holdings-compact-expanded" : ""}`}
    >
      <div className="tx-section">
        <span className="tx-section-title">{t("tokenHoldings")}</span>
        {compact && (
          <button
            type="button"
            className="token-holdings-collapse-btn"
            onClick={() => setIsCollapsed(true)}
          >
            -
          </button>
        )}
      </div>

      {error && <div className="token-holdings-error">{error}</div>}

      {loading ? (
        <div className="tx-row">
          <span className="tx-value token-holdings-loading">{t("loadingTokenHoldings")}</span>
        </div>
      ) : hasAnyTokens ? (
        <div className="token-holdings-list">
          {nonZeroHoldings.map((holding) => (
            <Link
              key={holding.tokenAddress}
              to={`/${networkId}/address/${holding.tokenAddress}`}
              className="token-holding-row"
            >
              <div className="token-holding-info">
                <TokenLogo src={holding.logo} symbol={holding.symbol} name={holding.name} />
                <div className="token-holding-details">
                  <span className="token-name">{holding.name || t("unknownToken")}</span>
                  {holding.symbol && <span className="token-symbol">({holding.symbol})</span>}
                  {getTierBadge(holding.tier)}
                  {holding.isCustom && <span className="token-custom-badge">{t("custom")}</span>}
                </div>
              </div>
              <div className="token-holding-balance">
                {holding.formattedBalance} {holding.symbol}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="tx-row">
          <span className="tx-value token-holdings-empty">{t("noTokenHoldings")}</span>
        </div>
      )}

      <div className="token-holdings-actions">
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={handleFetchPopularTokens}
          disabled={popularLoading || popularLoaded}
        >
          {popularLoading
            ? t("loading")
            : popularLoaded
              ? t("popularTokensLoaded")
              : t("fetchPopularTokens")}
        </button>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() => setShowCustomModal(true)}
        >
          {t("fetchCustomToken")}
        </button>
      </div>

      {showCustomModal && (
        <CustomTokenModal
          isOpen={showCustomModal}
          onClose={() => setShowCustomModal(false)}
          ownerAddress={ownerAddress}
          networkId={networkId}
          onTokenFetched={handleCustomTokenFetched}
        />
      )}
    </div>
  );
};

export default TokenHoldings;
