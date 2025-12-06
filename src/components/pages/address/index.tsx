import { useContext, useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { AppContext } from "../../../context";
import { useDataService } from "../../../hooks/useDataService";
import { useENS } from "../../../hooks/useENS";
import type {
  Address as AddressData,
  AddressTransactionsResult,
  AddressType,
  DataWithMetadata,
  Transaction,
} from "../../../types";
import { fetchAddressWithType } from "../../../utils/addressTypeDetection";
import Loader from "../../common/Loader";
import {
  AccountDisplay,
  ContractDisplay,
  ERC20Display,
  ERC721Display,
  ERC1155Display,
} from "./displays";

export default function Address() {
  const { networkId, address } = useParams<{
    networkId?: string;
    address?: string;
  }>();
  const location = useLocation();
  const numericNetworkId = Number(networkId) || 1;
  const dataService = useDataService(numericNetworkId);
  const { rpcUrls } = useContext(AppContext);
  const [addressData, setAddressData] = useState<AddressData | null>(null);
  const [addressType, setAddressType] = useState<AddressType>("account");
  const [transactionsResult, setTransactionsResult] = useState<AddressTransactionsResult | null>(
    null,
  );
  const [transactionDetails, setTransactionDetails] = useState<Transaction[]>([]);
  const [loadingTxDetails, setLoadingTxDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get ENS name from navigation state (if user searched by ENS name)
  const initialEnsName = (location.state as { ensName?: string })?.ensName;

  // Use ENS hook to get reverse lookup and records
  const {
    ensName,
    reverseResult,
    records: ensRecords,
    decodedContenthash,
    loading: ensLoading,
    isMainnet,
  } = useENS(address, numericNetworkId, initialEnsName);

  // Fetch address data and detect type in a single flow
  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }

    const rpcUrlsForChain = rpcUrls[numericNetworkId as keyof typeof rpcUrls];
    if (!rpcUrlsForChain) {
      setError("No RPC URL configured for this network");
      setLoading(false);
      return;
    }

    const rpcUrl = Array.isArray(rpcUrlsForChain) ? rpcUrlsForChain[0] : rpcUrlsForChain;
    if (!rpcUrl) {
      setError("No RPC URL configured for this network");
      setLoading(false);
      return;
    }

    console.log("Fetching address data and type for:", address, "on chain:", numericNetworkId);
    setLoading(true);
    setError(null);

    fetchAddressWithType({
      addressHash: address,
      chainId: numericNetworkId,
      rpcUrl,
    })
      .then((result) => {
        console.log("Fetched address with type:", result);
        setAddressData(result.address);
        setAddressType(result.addressType);
      })
      .catch((err) => {
        console.error("Error fetching address:", err);
        setError(err.message || "Failed to fetch address data");
      })
      .finally(() => setLoading(false));
  }, [address, numericNetworkId, rpcUrls]);

  // Fetch transactions separately (still uses dataService for caching benefits)
  useEffect(() => {
    if (!dataService || !address) return;

    dataService
      .getAddressTransactions(address)
      .then(async (result) => {
        console.log("Fetched transactions result:", result);
        setTransactionsResult(result);

        if (result.transactions.length > 0) {
          setLoadingTxDetails(true);
          const txsToFetch = result.transactions.slice(0, 25);
          const txResults = await Promise.all(
            txsToFetch.map((hash) =>
              dataService.getTransaction(hash).catch((err) => {
                console.error(`Failed to fetch tx ${hash}:`, err);
                return null;
              }),
            ),
          );
          setTransactionDetails(
            txResults
              .filter((result): result is DataWithMetadata<Transaction> => result !== null)
              .map((result) => result.data),
          );
          setLoadingTxDetails(false);
        }
      })
      .catch((err) => {
        console.error("Error fetching address transactions:", err);
        setTransactionsResult({
          transactions: [],
          source: "none",
          isComplete: false,
          message: `Failed to fetch transaction history: ${err.message}`,
        });
      });
  }, [dataService, address]);

  if (loading) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="block-display-header">
            <span className="block-label">Address</span>
            <span className="tx-mono header-subtitle">{address}</span>
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
      <div className="container-wide">
        <div className="block-display-card">
          <div className="block-display-header">
            <span className="block-label">Address</span>
            <span className="tx-mono header-subtitle">{address}</span>
          </div>
          <div className="card-content">
            <p className="text-error margin-0">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="block-display-header">
            <span className="block-label">Address</span>
          </div>
          <div className="card-content">
            <p className="text-muted margin-0">No address provided</p>
          </div>
        </div>
      </div>
    );
  }

  if (!addressData) {
    return (
      <div className="container-wide">
        <p>Address data not found</p>
      </div>
    );
  }

  // Common props for all display components
  const displayProps = {
    address: addressData,
    addressHash: address,
    networkId: networkId || "1",
    transactionsResult,
    transactionDetails,
    loadingTxDetails,
    ensName,
    reverseResult,
    ensRecords,
    decodedContenthash,
    ensLoading,
    isMainnet,
  };

  // Render appropriate display component based on detected type
  return (
    <div className="container-wide">
      {addressType === "account" && <AccountDisplay {...displayProps} />}
      {addressType === "contract" && <ContractDisplay {...displayProps} />}
      {addressType === "erc20" && <ERC20Display {...displayProps} />}
      {addressType === "erc721" && <ERC721Display {...displayProps} />}
      {addressType === "erc1155" && <ERC1155Display {...displayProps} />}
    </div>
  );
}
