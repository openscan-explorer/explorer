import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { AppContext } from "../../../context";
import { useDataService } from "../../../hooks/useDataService";
import { useENS } from "../../../hooks/useENS";
import { ENSService } from "../../../services/ENS/ENSService";
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
  const { networkId, address: addressParam } = useParams<{
    networkId?: string;
    address?: string;
  }>();
  const location = useLocation();
  const numericNetworkId = Number(networkId) || 1;
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

  // ENS resolution state
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [ensResolving, setEnsResolving] = useState(false);
  const [ensError, setEnsError] = useState<string | null>(null);

  // Detect if the URL parameter is an ENS name
  const isEnsName = useMemo(() => {
    return addressParam ? ENSService.isENSName(addressParam) : false;
  }, [addressParam]);

  // The actual address to use (resolved from ENS or direct from URL)
  const address = isEnsName ? resolvedAddress : addressParam;

  // Get ENS name from navigation state or from URL if it's an ENS name
  const initialEnsName =
    (location.state as { ensName?: string })?.ensName || (isEnsName ? addressParam : undefined);

  // Create dataService after we know the address
  const dataService = useDataService(numericNetworkId);

  // Resolve ENS name to address
  useEffect(() => {
    if (!isEnsName || !addressParam) {
      setResolvedAddress(null);
      setEnsResolving(false);
      setEnsError(null);
      return;
    }

    const mainnetRpcUrls = rpcUrls[1];
    if (!mainnetRpcUrls || mainnetRpcUrls.length === 0) {
      setEnsError("No Ethereum mainnet RPC configured for ENS resolution");
      setEnsResolving(false);
      return;
    }

    setEnsResolving(true);
    setEnsError(null);

    const ensService = new ENSService(mainnetRpcUrls);
    ensService
      .resolve(addressParam)
      .then((resolved) => {
        if (resolved) {
          setResolvedAddress(resolved);
        } else {
          setEnsError(`Could not resolve ENS name: ${addressParam}`);
        }
      })
      .catch((err) => {
        setEnsError(`Error resolving ENS: ${err instanceof Error ? err.message : "Unknown error"}`);
      })
      .finally(() => {
        setEnsResolving(false);
      });
  }, [isEnsName, addressParam, rpcUrls]);

  // Use ENS hook to get reverse lookup and records
  const {
    ensName,
    reverseResult,
    records: ensRecords,
    decodedContenthash,
    loading: ensLoading,
    isMainnet,
  } = useENS(address ?? undefined, numericNetworkId, initialEnsName);

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

    setLoading(true);
    setError(null);

    fetchAddressWithType({
      addressHash: address,
      chainId: numericNetworkId,
      rpcUrl,
    })
      .then((result) => {
        setAddressData(result.address);
        setAddressType(result.addressType);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch address data");
      })
      .finally(() => setLoading(false));
  }, [address, numericNetworkId, rpcUrls]);

  // Fetch transactions separately (still uses dataService for caching benefits)
  useEffect(() => {
    if (!dataService || !address) return;

    dataService.networkAdapter
      .getAddressTransactions(address)
      .then(async (result) => {
        setTransactionsResult(result);

        if (result.transactions.length > 0) {
          setLoadingTxDetails(true);
          const txsToFetch = result.transactions.slice(0, 25);
          const txResults = await Promise.all(
            txsToFetch.map((hash) =>
              dataService.networkAdapter.getTransaction(hash).catch(() => null),
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
        setTransactionsResult({
          transactions: [],
          source: "none",
          isComplete: false,
          message: `Failed to fetch transaction history: ${err.message}`,
        });
      });
  }, [dataService, address]);

  // Show ENS resolving state (must come first before other checks)
  if (isEnsName && (ensResolving || (!resolvedAddress && !ensError))) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="block-display-header">
            <span className="block-label">ENS Name</span>
            <span className="tx-mono header-subtitle">{addressParam}</span>
          </div>
          <div className="card-content-loading">
            <Loader text={`Resolving ENS name: ${addressParam}...`} />
          </div>
        </div>
      </div>
    );
  }

  // Show ENS resolution error
  if (ensError) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="block-display-header">
            <span className="block-label">ENS Name</span>
            <span className="tx-mono header-subtitle">{addressParam}</span>
          </div>
          <div className="card-content">
            <p className="text-error margin-0">Error: {ensError}</p>
          </div>
        </div>
      </div>
    );
  }

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
