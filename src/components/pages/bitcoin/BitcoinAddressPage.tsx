import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDataService } from "../../../hooks/useDataService";
import type { BitcoinAddress, DataWithMetadata } from "../../../types";
import Loader from "../../common/Loader";
import BitcoinAddressDisplay from "./BitcoinAddressDisplay";

export default function BitcoinAddressPage() {
  const { networkId, address } = useParams<{ networkId?: string; address?: string }>();
  const dataService = useDataService(networkId || "btc");

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
            <Loader text="Loading address data..." />
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
      {addressResult?.data ? (
        <BitcoinAddressDisplay address={addressResult.data} networkId={networkId} />
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
