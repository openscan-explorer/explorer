import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import { AppContext } from "../../../../context";
import { useDataService } from "../../../../hooks/useDataService";
import { useENS } from "../../../../hooks/useENS";
import { useKlerosTag } from "../../../../hooks/useKlerosTag";
import { useProviderSelection } from "../../../../hooks/useProviderSelection";
import { ENSService } from "../../../../services/ENS/ENSService";
import type { Address as AddressData, AddressType, DataWithMetadata } from "../../../../types";
import { fetchAddressWithType } from "../../../../utils/addressTypeDetection";
import Loader from "../../../common/Loader";
import {
  AccountDisplay,
  ContractDisplay,
  ERC20Display,
  ERC721Display,
  ERC1155Display,
} from "./displays";

export default function Address() {
  const { t } = useTranslation("address");
  const { networkId, address: addressParam } = useParams<{
    networkId?: string;
    address?: string;
  }>();
  const location = useLocation();
  const numericNetworkId = Number(networkId) || 1;
  const { rpcUrls } = useContext(AppContext);
  const [addressData, setAddressData] = useState<AddressData | null>(null);
  const [addressType, setAddressType] = useState<AddressType | null>(null);
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

  const klerosTag = useKlerosTag(address, numericNetworkId);

  // Track the last address for which type detection completed, so background
  // re-fetches (e.g. dataService reference change) don't reset the type and
  // unmount the active display component.
  const prevAddressRef = useRef<string | undefined>(undefined);

  // Resolve ENS name to address
  useEffect(() => {
    if (!isEnsName || !addressParam) {
      setResolvedAddress(null);
      setEnsResolving(false);
      setEnsError(null);
      return;
    }

    const mainnetRpcUrls = rpcUrls["eip155:1"];
    if (!mainnetRpcUrls || mainnetRpcUrls.length === 0) {
      setEnsError(t("noRPCForEnsResolution"));
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
          setEnsError(`${t("notResolveENS")}: ${addressParam}`);
        }
      })
      .catch((err) => {
        setEnsError(
          `${t("errorResolvingENS")}: ${err instanceof Error ? err.message : t("unknownError")}`,
        );
      })
      .finally(() => {
        setEnsResolving(false);
      });
  }, [isEnsName, addressParam, rpcUrls, t]);

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

    // Reset display state only when navigating to a different address.
    // Background re-fetches triggered by dataService reference changes must
    // not reset the type — doing so unmounts the display component and clears
    // all its child hook state (proxy detection, Sourcify data, etc.).
    if (address !== prevAddressRef.current) {
      prevAddressRef.current = address;
      setAddressType(null);
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
        const rpcNetworkId = `eip155:${numericNetworkId}`;
        const rpcUrlsForChain = rpcUrls[rpcNetworkId];
        const rpcUrl = Array.isArray(rpcUrlsForChain) ? rpcUrlsForChain[0] : rpcUrlsForChain;

        if (rpcUrl) {
          fetchAddressWithType({
            addressHash: address,
            chainId: numericNetworkId,
            rpcUrl,
            // Pass already-fetched address data to skip the redundant eth_getCode call.
            // This prevents contracts from being misclassified as EOA when the
            // secondary RPC fetch fails (rate-limit, L2 quirks, etc.).
            preloadedAddress: addressData,
          })
            .then((typeResult) => {
              setAddressType(typeResult.addressType);
            })
            .catch(() => {
              // Type detection failed — use the code we already have to distinguish
              // contract from EOA rather than blindly defaulting to "account".
              const hasCode =
                addressData.code && addressData.code.toLowerCase().replace(/^0x0*/, "").length > 0;
              setAddressType(hasCode ? "contract" : "account");
            })
            .finally(() => {
              setTypeLoading(false);
            });
        } else {
          // No RPC URL configured for type detection — derive type from pre-fetched code.
          const hasCode =
            addressData.code && addressData.code.toLowerCase().replace(/^0x0*/, "").length > 0;
          setAddressType(hasCode ? "contract" : "account");
          setTypeLoading(false);
        }
      })
      .catch((err) => {
        setError(err.message || t("failedToFetchAddressData"));
        setTypeLoading(false);
      })
      .finally(() => setLoading(false));
  }, [address, dataService, numericNetworkId, rpcUrls, t]);

  // Show ENS resolving state (must come first before other checks)
  if (isEnsName && (ensResolving || (!resolvedAddress && !ensError))) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="card-content-loading">
            <Loader text={t("resolvingEns", { name: addressParam })} />
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
              {t("notResolveENS")} "{addressParam}": {ensError}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show loader only until both the address data *and* the type are determined for
  // the first time. Background re-fetches (e.g. dataService reference change) must
  // not unmount the display component — that would reset all child hook state
  // (proxy detection, Sourcify data, etc.) and cause visible flicker.
  if (!addressData || addressType === null) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="card-content-loading">
            <Loader text={loading ? t("loadingAddressData") : t("detectingAddressType")} />
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
            <p className="text-muted margin-0">{t("noAddressProvided")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!addressData) {
    return (
      <div className="container-wide">
        <p>{t("addressDataNotFound")}</p>
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
    klerosTag,
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
