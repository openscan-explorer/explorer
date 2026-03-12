import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useDataService } from "../../../hooks/useDataService";
import type { BitcoinAddress, DataWithMetadata } from "../../../types";
import Breadcrumb from "../../common/Breadcrumb";
import LoaderWithTimeout from "../../common/LoaderWithTimeout";
import BitcoinAddressDisplay from "./BitcoinAddressDisplay";

export default function BitcoinAddressPage() {
  const { address } = useParams<{ address?: string }>();
  const location = useLocation();

  // Extract network slug from path (e.g., "/tbtc/address/..." → "tbtc")
  const networkSlug = location.pathname.split("/")[1] || "btc";
  const dataService = useDataService(networkSlug);

  const [addressResult, setAddressResult] = useState<DataWithMetadata<BitcoinAddress> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataService || !dataService.isBitcoin() || !address) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const adapter = dataService.getBitcoinAdapter();

    adapter
      .getAddress(address)
      .then(setAddressResult)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to fetch address"))
      .finally(() => setLoading(false));
  }, [dataService, address]);

  if (loading) {
    return (
      <div className="container-wide page-container-padded">
        <div className="page-card">
          <div className="block-display-header">
            <span className="block-label">Bitcoin Address</span>
          </div>
          <div className="card-content-loading">
            <LoaderWithTimeout
              text="Loading address data..."
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

  const truncatedAddr = address ? `${address.slice(0, 10)}...${address.slice(-6)}` : "";

  return (
    <div className="container-wide page-container-padded">
      <Breadcrumb
        items={[
          { label: "Home", to: "/" },
          { label: networkSlug === "tbtc" ? "Bitcoin Testnet" : "Bitcoin", to: `/${networkSlug}` },
          { label: truncatedAddr },
        ]}
      />
      {addressResult?.data ? (
        <BitcoinAddressDisplay address={addressResult.data} networkId={networkSlug} />
      ) : (
        <div className="page-card">
          <div className="card-content">
            <p className="text-muted margin-0">Address not found</p>
          </div>
        </div>
      )}
    </div>
  );
}
