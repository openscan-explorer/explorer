import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useNetwork } from "../../../../context/AppContext";
import { useNetworkDashboard } from "../../../../hooks/useNetworkDashboard";
import { resolveNetwork, getChainIdFromNetwork } from "../../../../utils/networkResolver";
import { getAllNetworks } from "../../../../config/networks";
import Loader from "../../../common/Loader";
import SearchBox from "../../../common/SearchBox";
import DashboardStats from "./DashboardStats";
import LatestBlocksTable from "./LatestBlocksTable";
import LatestTransactionsTable from "./LatestTransactionsTable";
import ProfileDisplay from "./NetworkProfileDisplay";

export default function Network() {
  const { t } = useTranslation("network");
  const { networkId } = useParams<{ networkId?: string }>();
  const network = resolveNetwork(networkId || "1", getAllNetworks());
  const networkConfig = useNetwork(networkId || "1");
  const dashboard = useNetworkDashboard(
    network || {
      type: "evm",
      networkId: "eip155:1",
      name: "Ethereum",
      shortName: "Ethereum",
      currency: "ETH",
    },
  );
  const chainId = getChainIdFromNetwork(network) || 1;

  // Generate title based on network
  // Strip "Ethereum" from network names (e.g., "Ethereum Mainnet" -> "MAINNET")
  const rawName = networkConfig?.name?.toUpperCase() || "OPENSCAN";
  const networkName = rawName.replace(/^ETHEREUM\s*/i, "").trim();
  const networkColor = networkConfig?.color || "#627eea";
  const hasNetworkName = networkName.length > 0;
  const currency = networkConfig?.currency || "ETH";

  return (
    <div className="container-wide">
      <div className="block-display-card">
        <h1 className="home-title network-title">
          {hasNetworkName && (
            <>
              <span
                className="network-title-name"
                style={{ "--network-color": networkColor } as React.CSSProperties}
              >
                {networkName}
              </span>{" "}
            </>
          )}
        </h1>
        {networkConfig?.description && (
          <p className="network-description">{networkConfig.description}</p>
        )}
        <SearchBox />

        {dashboard.loading && dashboard.latestBlocks.length === 0 && (
          <Loader text={t("loadingNetworkData")} />
        )}

        {dashboard.error && (
          <p className="error-text-center">{t("errorLoadingData", { error: dashboard.error })}</p>
        )}

        <DashboardStats
          price={dashboard.price}
          gasPrice={dashboard.gasPrice}
          gasPrices={dashboard.gasPrices}
          blockNumber={dashboard.blockNumber}
          currency={currency}
          loading={dashboard.loading && dashboard.latestBlocks.length === 0}
          networkId={chainId}
        />

        <div className="dashboard-tables-row">
          <LatestBlocksTable
            blocks={dashboard.latestBlocks}
            networkId={chainId}
            loading={dashboard.loading && dashboard.latestBlocks.length === 0}
            currency={currency}
          />
          <LatestTransactionsTable
            transactions={dashboard.latestTransactions}
            networkId={chainId}
            currency={currency}
            loading={dashboard.loading && dashboard.latestTransactions.length === 0}
          />
        </div>

        <ProfileDisplay network={networkConfig} />
      </div>
    </div>
  );
}
