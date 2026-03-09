import { useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import { getNetworkById } from "../../../../config/networks";
import { AppContext } from "../../../../context";
import { useDataService } from "../../../../hooks/useDataService";
import { useENS } from "../../../../hooks/useENS";
import { useKlerosTag } from "../../../../hooks/useKlerosTag";
import { useProviderSelection } from "../../../../hooks/useProviderSelection";
import { ENSService } from "../../../../services/ENS/ENSService";
import type { Address as AddressData, AddressType, DataWithMetadata } from "../../../../types";
import { fetchAddressWithType, hasContractCode } from "../../../../utils/addressTypeDetection";
import Breadcrumb from "../../../common/Breadcrumb";
import LoaderWithTimeout from "../../../common/LoaderWithTimeout";
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
  const networkConfigData = getNetworkById(networkId ?? numericNetworkId);
  const networkLabel =
    networkConfigData?.shortName || networkConfigData?.name || `Chain ${networkId}`;
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

  const klerosTag = useKlerosTag(address, numericNetworkId);

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
          })
            .then((typeResult) => {
              setAddressType(typeResult.addressType);
            })
            .catch(() => {
              // If detection fails, infer from already-fetched address code instead of forcing account
              setAddressType(hasContractCode(addressData?.code) ? "contract" : "account");
            })
            .finally(() => {
              setTypeLoading(false);
            });
        } else {
          // No RPC available for type detection: still infer type from fetched address code
          setAddressType(hasContractCode(addressData?.code) ? "contract" : "account");
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
            <LoaderWithTimeout
              text={t("resolvingEns", { name: addressParam })}
              onRetry={() => window.location.reload()}
            />
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

  if (loading || typeLoading) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="card-content-loading">
            <LoaderWithTimeout
              text={loading ? t("loadingAddressData") : t("detectingAddressType")}
              onRetry={() => window.location.reload()}
            />
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
  const truncatedAddr = address ? `${address.slice(0, 10)}...${address.slice(-6)}` : "";

  return (
    <div className="container-wide">
      <Breadcrumb
        items={[
          { label: "Home", to: "/" },
          { label: networkLabel, to: `/${networkId}` },
          { label: truncatedAddr },
        ]}
      />
      {addressType === "account" && <AccountDisplay {...displayProps} />}
      {addressType === "contract" && <ContractDisplay {...displayProps} />}
      {addressType === "erc20" && <ERC20Display {...displayProps} />}
      {addressType === "erc721" && <ERC721Display {...displayProps} />}
      {addressType === "erc1155" && <ERC1155Display {...displayProps} />}
    </div>
  );
}
