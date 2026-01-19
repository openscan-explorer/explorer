import { useParams } from "react-router-dom";
import { useNetwork } from "../../../context/AppContext";
import { useNetworkDashboard } from "../../../hooks/useNetworkDashboard";
import Loader from "../../common/Loader";
import SearchBox from "../../common/SearchBox";
import DashboardStats from "./DashboardStats";
import LatestBlocksTable from "./LatestBlocksTable";
import LatestTransactionsTable from "./LatestTransactionsTable";
import ProfileDisplay from "./NetworkProfileDisplay";

export default function Network() {
  const { networkId } = useParams<{ networkId?: string }>();
  const numericNetworkId = Number(networkId) || 1;
  const networkConfig = useNetwork(numericNetworkId);
  const dashboard = useNetworkDashboard(numericNetworkId);

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
          <Loader text="Loading network data..." />
        )}

        {dashboard.error && <p className="error-text-center">Error: {dashboard.error}</p>}

        <DashboardStats
          price={dashboard.price}
          gasPrice={dashboard.gasPrice}
          blockNumber={dashboard.blockNumber}
          currency={currency}
          loading={dashboard.loading && dashboard.latestBlocks.length === 0}
        />

        <div className="dashboard-tables-row">
          <LatestBlocksTable
            blocks={dashboard.latestBlocks}
            networkId={numericNetworkId}
            loading={dashboard.loading && dashboard.latestBlocks.length === 0}
            currency={currency}
          />
          <LatestTransactionsTable
            transactions={dashboard.latestTransactions}
            networkId={numericNetworkId}
            currency={currency}
            loading={dashboard.loading && dashboard.latestTransactions.length === 0}
          />
        </div>

        <ProfileDisplay network={networkConfig} />
      </div>
    </div>
  );
}
