import type React from "react";
import { useContext, useMemo } from "react";
import { getNetworkById } from "../../../../../config/networks";
import { AppContext } from "../../../../../context";
import { useContractVerification } from "../../../../../hooks/useContractVerification";
import { useProxyInfo } from "../../../../../hooks/useProxyInfo";
import type { KlerosTag } from "../../../../../services/KlerosService";
import type { Address, ENSReverseResult, RPCMetadata } from "../../../../../types";
import AIAnalysisPanel from "../../../../common/AIAnalysis/AIAnalysisPanel";
import { AddressHeader } from "../shared";
import ContractInfoCard from "../shared/ContractInfoCard";
import ContractInfoCards from "../shared/ContractInfoCards";
import { logger } from "../../../../../utils";
import { compactContractDataForAI } from "../../../../common/AIAnalysis/aiContext";
import { formatNativeFromWei } from "../../../../../utils/unitFormatters";
import type { ProxyInfo, ProxyType } from "../../../../../utils/proxyDetection";

/** Map Sourcify V2 proxyType string to our ProxyType enum. */
function mapSourcifyProxyType(sourcifyType: string | undefined): ProxyType {
  switch (sourcifyType) {
    case "EIP1167Proxy":
      return "EIP-1167";
    case "ZeppelinOSProxy":
      return "Transparent (Legacy)";
    case "EIP1967Proxy":
    default:
      // RPC detection will refine Transparent vs UUPS; this is the safe default
      return "EIP-1967 Transparent";
  }
}

interface ContractDisplayProps {
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
  klerosTag?: KlerosTag | null;
}

const ContractDisplay: React.FC<ContractDisplayProps> = ({
  address,
  addressHash,
  networkId,
  metadata,
  selectedProvider,
  onProviderSelect,
  ensName,
  reverseResult,
  isMainnet = true,
  klerosTag,
}) => {
  const { jsonFiles } = useContext(AppContext);
  const network = getNetworkById(networkId);
  const networkName = network?.name ?? "Unknown Network";
  const networkCurrency = network?.currency ?? "ETH";

  // Fetch verified contract data (Sourcify → Etherscan fallback)
  const {
    data: contractVerifiedData,
    loading: sourcifyLoading,
    isVerified,
    source: verificationSource,
  } = useContractVerification(Number(networkId), addressHash, true);

  // RPC-based proxy detection — provides accurate Transparent vs UUPS distinction
  const rpcProxyInfo = useProxyInfo(addressHash, networkId, address.code ?? "");

  // Merge Sourcify proxy resolution (reliable impl address + name) with RPC detection (accurate type).
  // Sourcify is preferred for the implementation address; RPC is preferred for the proxy type.
  // For unverified contracts Sourcify has no data, so RPC detection is the only source.
  const proxyInfo = useMemo((): ProxyInfo | null => {
    const sp = contractVerifiedData?.proxyResolution;
    const implAddr = sp?.implementations?.[0]?.address;
    if (sp?.isProxy && implAddr) {
      return {
        // If RPC also detected it, use its more accurate type; otherwise fall back to Sourcify's type
        type: rpcProxyInfo?.type ?? mapSourcifyProxyType(sp.proxyType),
        implementationAddress: implAddr,
      };
    }
    return rpcProxyInfo;
  }, [contractVerifiedData, rpcProxyInfo]);

  // Implementation name from Sourcify's proxy resolution (available without a second fetch)
  const sourcifyImplName = contractVerifiedData?.proxyResolution?.implementations?.[0]?.name;

  // Fetch implementation contract data for ABI + source code (Sourcify → Etherscan fallback)
  const { data: implSourcifyData, isVerified: implIsVerified } = useContractVerification(
    Number(networkId),
    proxyInfo?.implementationAddress,
    !!proxyInfo,
  );

  // Check if we have local artifact data for this address
  const localArtifact = jsonFiles[addressHash.toLowerCase()];

  // Parse local artifact to sourcify format if it exists
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

  // Use local artifact data if available and sourcify is not verified
  const contractData = useMemo(
    () => (isVerified && contractVerifiedData ? contractVerifiedData : parsedLocalData),
    [isVerified, contractVerifiedData, parsedLocalData],
  );

  const hasVerifiedContract = isVerified || !!parsedLocalData;

  const aiContractData = useMemo(() => compactContractDataForAI(contractData), [contractData]);

  const aiContext = useMemo(
    () => ({
      address: addressHash,
      balanceNative: formatNativeFromWei(address.balance, networkCurrency, 6),
      txCount: address.txCount,
      accountType: "contract",
      hasCode: true,
      ensName: ensName ?? undefined,
      isVerified: hasVerifiedContract,
      contractName: aiContractData?.name ?? undefined,
      contractData: aiContractData,
    }),
    [
      addressHash,
      address.balance,
      address.txCount,
      ensName,
      hasVerifiedContract,
      aiContractData,
      networkCurrency,
    ],
  );

  logger.debug("contract data", contractData);
  logger.debug("implementation", implSourcifyData);
  return (
    <div className="page-with-analysis">
      <div className="block-display-card">
        <AddressHeader
          addressHash={addressHash}
          addressType="contract"
          metadata={metadata}
          selectedProvider={selectedProvider}
          onProviderSelect={onProviderSelect}
          klerosTag={klerosTag}
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

          {/* Contract Info Card (includes Contract Details) */}
          <ContractInfoCard
            address={address}
            addressHash={addressHash}
            networkId={networkId}
            contractData={contractData}
            hasVerifiedContract={hasVerifiedContract}
            sourcifyLoading={sourcifyLoading}
            isLocalArtifact={!!parsedLocalData && !isVerified}
            verificationSource={verificationSource}
            proxyInfo={proxyInfo}
            implementationContractData={implSourcifyData}
            implIsVerified={implIsVerified}
            sourcifyImplName={sourcifyImplName}
          />
        </div>
      </div>

      <AIAnalysisPanel
        analysisType="contract"
        context={aiContext}
        networkName={networkName}
        networkCurrency={networkCurrency}
        cacheKey={`openscan_ai_contract_${networkId}_${addressHash}`}
      />
    </div>
  );
};

export default ContractDisplay;
