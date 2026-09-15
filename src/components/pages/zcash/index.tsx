import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { getAllNetworks } from "../../../config/networks";
import { useZcashDashboard } from "../../../hooks/useZcashDashboard";
import { ZcashRpcError } from "../../../services/adapters/ZcashAdapter";
import type { NetworkConfig } from "../../../types";
import { resolveNetwork } from "../../../utils/networkResolver";
import SearchBox from "../../common/SearchBox";
import ZcashBlocksTable from "./ZcashBlocksTable";
import ZcashDashboardStats from "./ZcashDashboardStats";
import ZcashTransactionsTable from "./ZcashTransactionsTable";
import ZcashValuePools from "./ZcashValuePools";

// Default Zcash network config for fallback
const DEFAULT_ZCASH_NETWORK: NetworkConfig = {
  type: "zcash",
  networkId: "bip122:00040fe8ec8471911baa1db1266ea15d",
  slug: "zec",
  name: "Zcash Mainnet",
  shortName: "Zcash",
  currency: "ZEC",
  color: "#F4B728",
};

export default function ZcashNetwork() {
  const { t } = useTranslation("zcash");
  const location = useLocation();

  // Extract network slug from path (e.g., "/tzec" → "tzec", "/zec" → "zec")
  const pathSlug = location.pathname.split("/")[1] || "zec";
  const network = resolveNetwork(pathSlug, getAllNetworks()) || DEFAULT_ZCASH_NETWORK;
  const dashboard = useZcashDashboard(network);

  const networkName = network.name.toUpperCase();
  const networkColor = network.color || "#F4B728";
  const { error } = dashboard;

  return (
    <div className="container-wide">
      <div className="block-display-card">
        <h1 className="home-title network-title">
          <span
            className="network-title-name"
            style={{ "--network-color": networkColor } as React.CSSProperties}
          >
            {networkName}
          </span>
        </h1>
        {network.description && <p className="network-description">{network.description}</p>}
        <SearchBox />

        {error && (
          <p className="error-text-center">
            {error instanceof ZcashRpcError && error.kind === "rateLimited"
              ? t("dashboard.rateLimited")
              : t("dashboard.loadError", { message: error.message })}
          </p>
        )}

        <ZcashDashboardStats
          stats={dashboard.stats}
          currency={network.currency}
          loading={dashboard.loading}
        />

        <ZcashValuePools stats={dashboard.stats} currency={network.currency} />

        <div className="dashboard-tables-row">
          <ZcashBlocksTable
            blocks={dashboard.latestBlocks}
            loading={dashboard.loading}
            networkId={pathSlug}
          />
          <ZcashTransactionsTable
            transactions={dashboard.latestTransactions}
            loading={dashboard.loading}
            networkId={pathSlug}
            currency={network.currency}
          />
        </div>

        {network.links && network.links.length > 0 && (
          <div className="profile-links">
            <div className="profile-links-list">
              {network.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="profile-link-item"
                  title={link.description}
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
