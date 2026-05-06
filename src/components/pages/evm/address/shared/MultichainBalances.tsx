import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getNetworkLogoUrlById } from "../../../../../config/networks";
import { useMultichainBalances } from "../../../../../hooks/useMultichainBalances";
import type { NetworkConfig } from "../../../../../types";
import { getChainIdFromNetwork } from "../../../../../utils/networkResolver";
import { formatNativeFromWei } from "../../../../../utils/unitFormatters";
import OpenScanCubeLoader from "../../../../LoadingLogo";

interface NetworkLogoProps {
  src?: string;
  name: string;
  shortName: string;
}

const NetworkLogo: React.FC<NetworkLogoProps> = ({ src, name, shortName }) => {
  const [hasError, setHasError] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: src is intentionally a dependency to reset error on URL change
  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError || !src) {
    const letter = (shortName || name || "?").charAt(0).toUpperCase();
    return (
      <div className="token-logo token-logo-placeholder" title={name || shortName}>
        {letter}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name || shortName}
      className="token-logo"
      onError={() => setHasError(true)}
    />
  );
};

function getRouteSegment(network: NetworkConfig): string {
  const chainId = getChainIdFromNetwork(network);
  if (chainId !== undefined) return String(chainId);
  if (network.slug) return network.slug;
  return network.networkId;
}

function formatUsd(value: number | null): string | null {
  if (value === null || value === undefined) return null;
  if (value === 0) return "$0.00";
  if (value >= 1000) {
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (value >= 0.01) return `$${value.toFixed(2)}`;
  return "<$0.01";
}

interface MultichainBalancesProps {
  address: string;
  currentChainId: number;
  defaultCollapsed?: boolean;
  compact?: boolean;
}

const MultichainBalances: React.FC<MultichainBalancesProps> = ({
  address,
  currentChainId,
  defaultCollapsed = false,
  compact = false,
}) => {
  const { t } = useTranslation("address");
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const lowerAddress = useMemo(() => address.toLowerCase(), [address]);

  const { rows, loading } = useMultichainBalances(lowerAddress, currentChainId);

  const sortedRows = useMemo(() => {
    const usdKnown = rows.filter((r) => r.usdValue !== null && r.usdValue !== undefined);
    const usdUnknown = rows.filter((r) => r.usdValue === null || r.usdValue === undefined);

    usdKnown.sort((a, b) => {
      const diff = (b.usdValue ?? 0) - (a.usdValue ?? 0);
      if (diff !== 0) return diff;
      return a.network.name.localeCompare(b.network.name);
    });

    usdUnknown.sort((a, b) => {
      const aBal = a.balance ? BigInt(a.balance) : 0n;
      const bBal = b.balance ? BigInt(b.balance) : 0n;
      if (aBal > bBal) return -1;
      if (aBal < bBal) return 1;
      return a.network.name.localeCompare(b.network.name);
    });

    return [...usdKnown, ...usdUnknown];
  }, [rows]);

  const nonZeroRows = useMemo(
    () => rows.filter((r) => r.balance !== null && BigInt(r.balance) > 0n),
    [rows],
  );

  // Hide the section entirely when the user has no other EVM mainnets enabled
  // (e.g. OPENSCAN_NETWORKS=1) — there is nothing meaningful to show.
  if (rows.length === 0) {
    return null;
  }

  if (compact && isCollapsed) {
    return (
      <div className="token-holdings-compact">
        <button
          type="button"
          className="token-holdings-toggle"
          onClick={() => setIsCollapsed(false)}
        >
          <span className="token-holdings-toggle-label">{t("multichainBalances")}</span>
          <span className="token-holdings-toggle-count">
            {loading
              ? t("loading")
              : nonZeroRows.length === 0
                ? t("noMultichainBalances")
                : t("multichainNetworksCount", { count: nonZeroRows.length })}
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
        <span className="tx-section-title">{t("multichainBalances")}</span>
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

      {loading && rows.every((r) => r.loading) ? (
        <div className="token-holdings-loading">
          <OpenScanCubeLoader size={40} />
          <span>{t("loadingMultichainBalances")}</span>
        </div>
      ) : nonZeroRows.length === 0 && !loading ? (
        <div className="tx-row">
          <span className="tx-value token-holdings-empty">{t("noMultichainBalances")}</span>
        </div>
      ) : (
        <div className="token-holdings-list">
          {sortedRows.map((row) => {
            const formattedBalance =
              row.balance !== null
                ? formatNativeFromWei(row.balance, row.network.currency, 6)
                : null;
            const formattedUsd = formatUsd(row.usdValue);
            const logoSrc = getNetworkLogoUrlById(row.chainId);
            const segment = getRouteSegment(row.network);

            return (
              <Link
                key={row.chainId}
                to={`/${segment}/address/${lowerAddress}`}
                className="token-holding-row"
              >
                <div className="token-holding-info">
                  <NetworkLogo
                    src={logoSrc}
                    name={row.network.name}
                    shortName={row.network.shortName}
                  />
                  <div className="token-holding-details">
                    <span className="token-name">{row.network.shortName}</span>
                    <span className="token-symbol">({row.network.currency})</span>
                  </div>
                </div>
                <div className="token-holding-balance">
                  {row.loading ? (
                    <span className="account-card-loading">{t("loading")}</span>
                  ) : row.error ? (
                    <span
                      className="account-card-empty"
                      title={t("multichainBalanceErrorTooltip", { error: row.error })}
                    >
                      —
                    </span>
                  ) : (
                    <>
                      <span>{formattedBalance ?? `0 ${row.network.currency}`}</span>
                      {formattedUsd && <span> · {formattedUsd}</span>}
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MultichainBalances;
