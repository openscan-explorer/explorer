import type React from "react";
import { useContext, useEffect, useMemo, useState } from "react";
import { getNetworkById } from "../../../../../config/networks";
import { getX402Facilitator } from "../../../../../config/x402Facilitators";
import { AppContext } from "../../../../../context";
import { useContractVerification } from "../../../../../hooks/useContractVerification";
import { useDataService } from "../../../../../hooks/useDataService";
import { useProxyInfo } from "../../../../../hooks/useProxyInfo";
import type { KlerosTag } from "../../../../../services/KlerosService";
import type { Address, ENSReverseResult, RPCMetadata } from "../../../../../types";
import { hasContractCode } from "../../../../../utils/addressTypeDetection";
import { formatNativeFromWei } from "../../../../../utils/unitFormatters";
import type { ProxyInfo, ProxyType } from "../../../../../utils/proxyDetection";
import AIAnalysisPanel from "../../../../common/AIAnalysis/AIAnalysisPanel";
import { compactContractDataForAI } from "../../../../common/AIAnalysis/aiContext";
import { AddressHeader, TransactionHistory } from "../shared";
import ContractInfoCard from "../shared/ContractInfoCard";
import ContractInfoCards from "../shared/ContractInfoCards";
import FacilitatorInfoCard from "../shared/FacilitatorInfoCard";

/** Map Sourcify V2 proxyType string to our ProxyType enum. */
function mapSourcifyProxyType(sourcifyType: string | undefined): ProxyType {
  switch (sourcifyType) {
    case "EIP1167Proxy":
      return "EIP-1167";
    case "ZeppelinOSProxy":
      return "Transparent (Legacy)";
    default:
      return "EIP-1967 Transparent";
  }
}

interface X402FacilitatorDisplayProps {
  address: Address;
  addressHash: string;
  networkId: string;
  metadata?: RPCMetadata;
  selectedProvider?: string | null;
  onProviderSelect?: (provider: string) => void;
  ensName?: string | null;
  reverseResult?: ENSReverseResult | null;
  isMainnet?: boolean;
  klerosTag?: KlerosTag | null;
}

const X402FacilitatorDisplay: React.FC<X402FacilitatorDisplayProps> = ({
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

  const facilitator = getX402Facilitator(Number(networkId), addressHash);
  const hasCode = hasContractCode(address.code);

  // Fetch verified contract data (Sourcify -> Etherscan fallback)
  const {
    data: contractVerifiedData,
    loading: sourcifyLoading,
    isVerified,
    source: verificationSource,
  } = useContractVerification(Number(networkId), addressHash, true);

  // RPC-based proxy detection
  const rpcProxyInfo = useProxyInfo(addressHash, networkId, address.code ?? "");

  const proxyInfo = useMemo((): ProxyInfo | null => {
    const sp = contractVerifiedData?.proxyResolution;
    const implAddr = sp?.implementations?.[0]?.address;
    if (sp?.isProxy && implAddr) {
      return {
        type: rpcProxyInfo?.type ?? mapSourcifyProxyType(sp.proxyType),
        implementationAddress: implAddr,
      };
    }
    return rpcProxyInfo;
  }, [contractVerifiedData, rpcProxyInfo]);

  const sourcifyImplName = contractVerifiedData?.proxyResolution?.implementations?.[0]?.name;

  const { data: implSourcifyData, isVerified: implIsVerified } = useContractVerification(
    Number(networkId),
    proxyInfo?.implementationAddress,
    !!proxyInfo,
  );

  // Fetch implementation bytecode via RPC
  const dataService = useDataService(Number(networkId));
  const [implCode, setImplCode] = useState<string | undefined>(undefined);
  useEffect(() => {
    const implAddr = proxyInfo?.implementationAddress;
    if (!implAddr || !dataService?.networkAdapter) {
      setImplCode(undefined);
      return;
    }
    dataService.networkAdapter
      .getCode(implAddr)
      .then((code) => setImplCode(code && code !== "0x" ? code : undefined))
      .catch(() => setImplCode(undefined));
  }, [proxyInfo?.implementationAddress, dataService]);

  // Local artifact data
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
      accountType: "x402Facilitator",
      hasCode: true,
      ensName: ensName ?? undefined,
      isVerified: hasVerifiedContract,
      contractName: aiContractData?.name ?? facilitator?.name ?? undefined,
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
      facilitator?.name,
    ],
  );

  return (
    <div className="page-with-analysis">
      <div className="block-display-card">
        <AddressHeader
          addressHash={addressHash}
          addressType="x402Facilitator"
          ensName={ensName || reverseResult?.ensName}
          metadata={metadata}
          selectedProvider={selectedProvider}
          onProviderSelect={onProviderSelect}
          tokenName={facilitator?.name}
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

          {/* Facilitator Info Card */}
          {facilitator && <FacilitatorInfoCard facilitator={facilitator} />}

          {/* Transaction History */}
          <TransactionHistory
            networkId={networkId}
            addressHash={addressHash}
            txCount={Number(address.txCount)}
          />

          {/* Contract Info Card (only if address has contract code) */}
          {hasCode && (
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
              implCode={implCode}
            />
          )}
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

export default X402FacilitatorDisplay;
