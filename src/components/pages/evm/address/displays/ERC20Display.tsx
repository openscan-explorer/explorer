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
import { hexToUtf8 } from "../../../../../utils/erc20Utils";
import { logger } from "../../../../../utils/logger";
import AIAnalysis from "../../../../common/AIAnalysis";
import { AddressHeader } from "../shared";
import ContractInfoCard from "../shared/ContractInfoCard";
import ContractInfoCards from "../shared/ContractInfoCards";
import ERC20TokenInfoCard from "../shared/ERC20TokenInfoCard";

interface ERC20DisplayProps {
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

const ERC20Display: React.FC<ERC20DisplayProps> = ({
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
    name?: string;
    symbol?: string;
    decimals?: number;
    totalSupply?: string;
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

  // Fetch on-chain token data
  useEffect(() => {
    const fetchOnChainData = async () => {
      const chainId = Number(networkId);
      const rpcNetworkId = `eip155:${chainId}`;
      const rpcUrlsForChain = rpcUrls[rpcNetworkId];
      if (!rpcUrlsForChain) return;

      const rpcUrl = Array.isArray(rpcUrlsForChain) ? rpcUrlsForChain[0] : rpcUrlsForChain;
      if (!rpcUrl) return;

      const calls = [
        { selector: "0x06fdde03", key: "name" }, // name()
        { selector: "0x95d89b41", key: "symbol" }, // symbol()
        { selector: "0x313ce567", key: "decimals" }, // decimals()
        { selector: "0x18160ddd", key: "totalSupply" }, // totalSupply()
      ];

      const results: Record<string, string> = {};

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
            results[call.key] = data.result;
          }
        } catch {
          // Continue
        }
      }

      // Decode results
      const decoded: typeof onChainData = {};

      // Decode string (name, symbol)
      const decodeString = (hex: string): string => {
        try {
          // Remove 0x prefix
          const data = hex.slice(2);
          // Check if it's dynamic string (offset + length + data)
          if (data.length >= 128) {
            const lengthHex = data.slice(64, 128);
            const length = parseInt(lengthHex, 16);
            const strHex = data.slice(128, 128 + length * 2);
            return hexToUtf8(strHex);
          }
          return "";
        } catch {
          return "";
        }
      };

      if (results.name) {
        decoded.name = decodeString(results.name);
      }
      if (results.symbol) {
        decoded.symbol = decodeString(results.symbol);
      }
      if (results.decimals) {
        decoded.decimals = parseInt(results.decimals, 16);
      }
      if (results.totalSupply) {
        decoded.totalSupply = BigInt(results.totalSupply).toString();
      }

      setOnChainData(decoded);
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

  // Combine token data from metadata and on-chain
  const tokenName = tokenMetadata?.name || onChainData?.name;
  const tokenSymbol = tokenMetadata?.symbol || onChainData?.symbol;
  const tokenDecimals = tokenMetadata?.decimals ?? onChainData?.decimals;
  const tokenTotalSupply = onChainData?.totalSupply;
  const tokenLogo = tokenMetadata?.logo
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
      accountType: "erc20",
      hasCode: true,
      ensName: ensName ?? undefined,
      tokenName: tokenName ?? undefined,
      tokenSymbol: tokenSymbol ?? undefined,
      tokenDecimals: tokenDecimals ?? undefined,
      tokenTotalSupply: tokenTotalSupply ?? undefined,
      isVerified: hasVerifiedContract,
      contractName: contractData?.name ?? undefined,
    }),
    [
      addressHash,
      address.balance,
      address.txCount,
      ensName,
      tokenName,
      tokenSymbol,
      tokenDecimals,
      tokenTotalSupply,
      hasVerifiedContract,
      contractData?.name,
    ],
  );

  return (
    <div className="page-with-analysis">
      <div className="block-display-card">
        <AddressHeader
          addressHash={addressHash}
          addressType="erc20"
          ensName={ensName || reverseResult?.ensName}
          metadata={metadata}
          selectedProvider={selectedProvider}
          onProviderSelect={onProviderSelect}
          tokenSymbol={tokenSymbol}
          tokenName={tokenName}
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

          {/* Token Info Card */}
          <ERC20TokenInfoCard
            tokenName={tokenName}
            tokenSymbol={tokenSymbol}
            tokenDecimals={tokenDecimals}
            tokenTotalSupply={tokenTotalSupply}
            tokenLogo={tokenLogo}
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

export default ERC20Display;
