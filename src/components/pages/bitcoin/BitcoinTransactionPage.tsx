import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { getAllNetworks } from "../../../config/networks";
import { AppContext } from "../../../context/AppContext";
import { useDataService } from "../../../hooks/useDataService";
import { usePersistentCache } from "../../../hooks/usePersistentCache";
import { getBTCPrice } from "../../../services/PriceService";
import type { BitcoinTransaction, DataWithMetadata } from "../../../types";
import { resolveNetwork } from "../../../utils/networkResolver";
import Breadcrumb from "../../common/Breadcrumb";
import LoaderWithTimeout from "../../common/LoaderWithTimeout";
import BitcoinTransactionDisplay from "./BitcoinTransactionDisplay";

export default function BitcoinTransactionPage() {
  const { filter: txid } = useParams<{ filter?: string }>();
  const location = useLocation();
  const { rpcUrls } = useContext(AppContext);

  // Extract network slug from path (e.g., "/tbtc/tx/..." → "tbtc")
  const networkSlug = location.pathname.split("/")[1] || "btc";
  const dataService = useDataService(networkSlug);
  const { getCached, setCached } = usePersistentCache();
  const cacheNetworkId = useMemo(
    () => resolveNetwork(networkSlug, getAllNetworks())?.networkId ?? networkSlug,
    [networkSlug],
  );

  const [txResult, setTxResult] = useState<DataWithMetadata<BitcoinTransaction> | null>(null);
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get Ethereum mainnet RPC URL for fetching BTC price
  const mainnetRpcUrl = rpcUrls["eip155:1"]?.[0] || null;

  useEffect(() => {
    if (!dataService || !dataService.isBitcoin() || !txid) {
      setLoading(false);
      return;
    }

    // Check persistent cache for the transaction
    const cached = getCached<BitcoinTransaction>(cacheNetworkId, "transaction", txid);
    if (cached) {
      setTxResult({ data: cached });
      // Still fetch BTC price (live market data)
      if (mainnetRpcUrl) {
        getBTCPrice(mainnetRpcUrl)
          .then((price) => setBtcPrice(price))
          .catch(() => {});
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const adapter = dataService.getBitcoinAdapter();

    // Fetch transaction and BTC price in parallel
    Promise.all([
      adapter.getTransaction(txid),
      mainnetRpcUrl ? getBTCPrice(mainnetRpcUrl) : Promise.resolve(null),
    ])
      .then(([txData, price]) => {
        setTxResult(txData);
        setBtcPrice(price);
        // Only cache confirmed transactions
        if (txData.data.confirmations) {
          setCached(cacheNetworkId, "transaction", txid, txData.data);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to fetch transaction"))
      .finally(() => setLoading(false));
  }, [dataService, txid, mainnetRpcUrl, getCached, setCached, cacheNetworkId]);

  if (loading) {
    return (
      <div className="container-wide page-container-padded">
        <div className="page-card">
          <div className="block-display-header">
            <span className="block-label">Bitcoin Transaction</span>
          </div>
          <div className="card-content-loading">
            <LoaderWithTimeout
              text="Loading transaction..."
              onRetry={() => window.location.reload()}
            />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-wide page-container-padded">
        <div className="page-card">
          <div className="card-content">
            <p className="text-error margin-0">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  const truncatedTxid = txid ? `${txid.slice(0, 10)}...${txid.slice(-6)}` : "";

  return (
    <div className="container-wide page-container-padded">
      <Breadcrumb
        items={[
          { label: "Home", to: "/" },
          { label: networkSlug === "tbtc" ? "Bitcoin Testnet" : "Bitcoin", to: `/${networkSlug}` },
          { label: "Transactions", to: `/${networkSlug}/txs` },
          { label: truncatedTxid },
        ]}
      />
      {txResult?.data ? (
        <BitcoinTransactionDisplay
          transaction={txResult.data}
          networkId={networkSlug}
          btcPrice={btcPrice}
        />
      ) : (
        <div className="page-card">
          <div className="card-content">
            <p className="text-muted margin-0">Transaction not found</p>
          </div>
        </div>
      )}
    </div>
  );
}
