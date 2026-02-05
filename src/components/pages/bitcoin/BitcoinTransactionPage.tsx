import { useContext, useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { AppContext } from "../../../context/AppContext";
import { useDataService } from "../../../hooks/useDataService";
import { getBTCPrice } from "../../../services/PriceService";
import type { BitcoinTransaction, DataWithMetadata } from "../../../types";
import Loader from "../../common/Loader";
import BitcoinTransactionDisplay from "./BitcoinTransactionDisplay";

export default function BitcoinTransactionPage() {
  const { filter: txid } = useParams<{ filter?: string }>();
  const location = useLocation();
  const { rpcUrls } = useContext(AppContext);

  // Extract network slug from path (e.g., "/tbtc/tx/..." → "tbtc")
  const networkSlug = location.pathname.split("/")[1] || "btc";
  const dataService = useDataService(networkSlug);

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
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to fetch transaction"))
      .finally(() => setLoading(false));
  }, [dataService, txid, mainnetRpcUrl]);

  if (loading) {
    return (
      <div className="container-wide page-container-padded">
        <div className="page-card">
          <div className="block-display-header">
            <span className="block-label">Bitcoin Transaction</span>
          </div>
          <div className="card-content-loading">
            <Loader text="Loading transaction..." />
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

  return (
    <div className="container-wide page-container-padded">
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
