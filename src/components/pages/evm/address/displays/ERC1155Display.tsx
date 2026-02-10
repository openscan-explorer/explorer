import type React from "react";
import { useContext, useEffect, useMemo, useState } from "react";
import { getNetworkById } from "../../../../../config/networks";
import { AppContext } from "../../../../../context";
import { useSourcify } from "../../../../../hooks/useSourcify";
import {
  fetchToken,
  getAssetUrl,
  type TokenMetadata,
} from "../../../../../services/MetadataService";
import type { Address, ENSReverseResult, RPCMetadata } from "../../../../../types";
import { decodeAbiString } from "../../../../../utils/hexUtils";
import { logger } from "../../../../../utils/logger";
import AIAnalysis from "../../../../common/AIAnalysis";
import { AddressHeader } from "../shared";
import ContractInfoCard from "../shared/ContractInfoCard";
import ContractInfoCards from "../shared/ContractInfoCards";
import NFTCollectionInfoCard from "../shared/NFTCollectionInfoCard";

interface ERC1155DisplayProps {
  address: Address;
  addressHash: string;
  networkId: string;
  metadata?: RPCMetadata;
  selectedProvider?: string | null;
  onProviderSelect?: (provider: string) => void;
  // ENS props
  ensName?: string | null;
  reverseResult?: ENSReverseResult | null;
  isMainnet?: boolean;
}

const ERC1155Display: React.FC<ERC1155DisplayProps> = ({
  address,
  addressHash,
  networkId,
  metadata,
  selectedProvider,
  onProviderSelect,
  ensName,
  reverseResult,
  isMainnet = true,
}) => {
  const { jsonFiles, rpcUrls } = useContext(AppContext);
  const [tokenMetadata, setTokenMetadata] = useState<TokenMetadata | null>(null);
  const [onChainData, setOnChainData] = useState<{
    uri?: string;
    name?: string;
    symbol?: string;
  } | null>(null);

  // Fetch Sourcify data
  const {
    data: sourcifyData,
    loading: sourcifyLoading,
    isVerified,
  } = useSourcify(Number(networkId), addressHash, true);

  // Fetch token metadata from explorer-metadata
  useEffect(() => {
    fetchToken(Number(networkId), addressHash)
      .then(setTokenMetadata)
      .catch((err) => logger.error("Failed to fetch token metadata:", err));
  }, [networkId, addressHash]);

  // Fetch on-chain ERC1155 data
  useEffect(() => {
    const fetchOnChainData = async () => {
      const chainId = Number(networkId);
      const rpcNetworkId = `eip155:${chainId}`;
      const rpcUrlsForChain = rpcUrls[rpcNetworkId];
      if (!rpcUrlsForChain) return;

      const rpcUrl = Array.isArray(rpcUrlsForChain) ? rpcUrlsForChain[0] : rpcUrlsForChain;
      if (!rpcUrl) return;

      const results: { uri?: string; name?: string; symbol?: string } = {};

      // Fetch name and symbol
      const calls = [
        { selector: "0x06fdde03", key: "name" }, // name()
        { selector: "0x95d89b41", key: "symbol" }, // symbol()
      ];

      for (const call of calls) {
        try {
          const response = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "eth_call",
              params: [{ to: addressHash, data: call.selector }, "latest"],
              id: 1,
            }),
          });
          const data = await response.json();
          if (!data.error && data.result && data.result !== "0x") {
            const decoded = decodeAbiString(data.result);
            if (decoded) {
              results[call.key as "name" | "symbol"] = decoded;
            }
          }
        } catch {
          // Continue
        }
      }

      // Try to get URI for token ID 0 as a sample
      // uri(uint256) with tokenId = 0
      const uriSelector =
        "0x0e89341c0000000000000000000000000000000000000000000000000000000000000000";

      try {
        const response = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_call",
            params: [{ to: addressHash, data: uriSelector }, "latest"],
            id: 1,
          }),
        });
        const data = await response.json();
        if (!data.error && data.result && data.result !== "0x") {
          const uri = decodeAbiString(data.result);
          if (uri) {
            results.uri = uri;
          }
        }
      } catch {
        // Continue
      }

      if (Object.keys(results).length > 0) {
        setOnChainData(results);
      }
    };

    fetchOnChainData();
  }, [networkId, addressHash, rpcUrls]);

  // Check if we have local artifact data
  const localArtifact = jsonFiles[addressHash.toLowerCase()];

  const parsedLocalData = useMemo(() => {
    if (!localArtifact) return null;
    return {
      name: localArtifact.contractName,
      compilerVersion: localArtifact.buildInfo?.solcLongVersion,
      evmVersion: localArtifact.buildInfo?.input?.settings?.evmVersion,
      abi: localArtifact.abi,
      files: localArtifact.sourceCode
        ? [
            {
              name: localArtifact.sourceName || "Contract.sol",
              path: localArtifact.sourceName || "Contract.sol",
              content: localArtifact.sourceCode,
            },
          ]
        : undefined,
      metadata: {
        language: localArtifact.buildInfo?.input?.language,
        compiler: localArtifact.buildInfo
          ? { version: localArtifact.buildInfo.solcVersion }
          : undefined,
      },
      match: "perfect" as const,
      creation_match: null,
      runtime_match: null,
      chainId: networkId,
      address: addressHash,
      verifiedAt: undefined,
    };
  }, [localArtifact, networkId, addressHash]);

  const contractData = useMemo(
    () => (isVerified && sourcifyData ? sourcifyData : parsedLocalData),
    [isVerified, sourcifyData, parsedLocalData],
  );

  const hasVerifiedContract = isVerified || !!parsedLocalData;

  // Combine token data
  const collectionName = tokenMetadata?.name || onChainData?.name || contractData?.name;
  const collectionSymbol = tokenMetadata?.symbol || onChainData?.symbol;
  const collectionLogo = tokenMetadata?.logo
    ? getAssetUrl(tokenMetadata.logo)
    : getAssetUrl(`assets/tokens/${networkId}/${addressHash.toLowerCase()}.png`);

  const network = getNetworkById(networkId);
  const networkName = network?.name ?? "Unknown Network";
  const networkCurrency = network?.currency ?? "ETH";

  const aiContext = useMemo(
    () => ({
      address: addressHash,
      balance: address.balance,
      txCount: address.txCount,
      accountType: "erc1155",
      hasCode: true,
      ensName: ensName ?? undefined,
      collectionName: collectionName ?? undefined,
      collectionSymbol: collectionSymbol ?? undefined,
      metadataUri: onChainData?.uri ?? undefined,
      isVerified: hasVerifiedContract,
      contractName: contractData?.name ?? undefined,
    }),
    [
      addressHash,
      address.balance,
      address.txCount,
      ensName,
      collectionName,
      collectionSymbol,
      onChainData?.uri,
      hasVerifiedContract,
      contractData?.name,
    ],
  );

  return (
    <div className="page-with-analysis">
      <div className="block-display-card">
        <AddressHeader
          addressHash={addressHash}
          addressType="erc1155"
          ensName={ensName || reverseResult?.ensName}
          metadata={metadata}
          selectedProvider={selectedProvider}
          onProviderSelect={onProviderSelect}
          tokenSymbol={collectionSymbol}
          tokenName={collectionName}
        />

        <div className="address-section-content">
          {/* Overview + More Info Cards */}
          <ContractInfoCards
            address={address}
            addressHash={addressHash}
            networkId={Number(networkId)}
            ensName={ensName}
            reverseResult={reverseResult}
            isMainnet={isMainnet}
          />

          {/* NFT Collection Info Card */}
          <NFTCollectionInfoCard
            collectionName={collectionName}
            collectionSymbol={collectionSymbol}
            collectionLogo={collectionLogo}
            tokenStandard="ERC-1155"
            metadataUri={onChainData?.uri}
            networkId={networkId}
            addressHash={addressHash}
          />

          {/* Contract Info Card (includes Contract Details) */}
          <ContractInfoCard
            address={address}
            addressHash={addressHash}
            networkId={networkId}
            contractData={contractData}
            hasVerifiedContract={hasVerifiedContract}
            sourcifyLoading={sourcifyLoading}
            isLocalArtifact={!!parsedLocalData && !isVerified}
            sourcifyUrl={
              sourcifyData
                ? `https://repo.sourcify.dev/contracts/full_match/${networkId}/${addressHash}/`
                : undefined
            }
          />
        </div>
      </div>
      <div className="page-analysis-panel">
        <AIAnalysis
          analysisType="contract"
          context={aiContext}
          networkName={networkName}
          networkCurrency={networkCurrency}
          cacheKey={`account_${networkId}_${addressHash}`}
        />
      </div>
    </div>
  );
};

export default ERC1155Display;
