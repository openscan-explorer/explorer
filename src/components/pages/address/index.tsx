import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { AppContext } from "../../../context";
import { useDataService } from "../../../hooks/useDataService";
import { useENS } from "../../../hooks/useENS";
import { useProviderSelection } from "../../../hooks/useProviderSelection";
import { ENSService } from "../../../services/ENS/ENSService";
import type { Address as AddressData, AddressType, DataWithMetadata } from "../../../types";
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
  const [loading, setLoading] = useState(true);
  const [typeLoading, setTypeLoading] = useState(true);
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

  // Provider selection state - store metadata from address data fetch
  const [addressDataResult, setAddressDataResult] = useState<DataWithMetadata<AddressData> | null>(
    null,
  );
  const [selectedProvider, setSelectedProvider] = useProviderSelection(
    `address_${numericNetworkId}_${address}`,
  );

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
    if (!address || !dataService) {
      setLoading(false);
      setTypeLoading(false);
      return;
    }

    setLoading(true);
    setTypeLoading(true);
    setError(null);

    // Use DataService to fetch address data with metadata support
    dataService.networkAdapter
      .getAddress(address)
      .then((result) => {
        // Store the full result with metadata
        setAddressDataResult(result);

        // Extract the address data
        const addressData = result.data;
        setAddressData(addressData);

        // Detect address type using the utility
        const rpcUrlsForChain = rpcUrls[numericNetworkId as keyof typeof rpcUrls];
        const rpcUrl = Array.isArray(rpcUrlsForChain) ? rpcUrlsForChain[0] : rpcUrlsForChain;

        if (rpcUrl) {
          fetchAddressWithType({
            addressHash: address,
            chainId: numericNetworkId,
            rpcUrl,
          })
            .then((typeResult) => {
              setAddressType(typeResult.addressType);
            })
            .catch(() => {
              // Fallback to account if type detection fails
              setAddressType("account");
            })
            .finally(() => {
              setTypeLoading(false);
            });
        } else {
          setTypeLoading(false);
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch address data");
        setTypeLoading(false);
      })
      .finally(() => setLoading(false));
  }, [address, dataService, numericNetworkId, rpcUrls]);

  // Show ENS resolving state (must come first before other checks)
  if (isEnsName && (ensResolving || (!resolvedAddress && !ensError))) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
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
          <div className="card-content">
            <p className="text-error margin-0">
              Could not resolve ENS name "{addressParam}": {ensError}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading || typeLoading) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="card-content-loading">
            <Loader text={loading ? "Loading address data..." : "Detecting address type..."} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
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
    ensName,
    reverseResult,
    ensRecords,
    decodedContenthash,
    ensLoading,
    isMainnet,
    metadata: addressDataResult?.metadata,
    selectedProvider,
    onProviderSelect: setSelectedProvider,
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
