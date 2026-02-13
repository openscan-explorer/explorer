import type React from "react";
import { useContext, useMemo } from "react";
import { getNetworkById } from "../../../../../config/networks";
import { AppContext } from "../../../../../context";
import { useSourcify } from "../../../../../hooks/useSourcify";
import type { Address, ENSReverseResult, RPCMetadata } from "../../../../../types";
import AIAnalysisPanel from "../../../../common/AIAnalysisPanel";
import { AddressHeader } from "../shared";
import ContractInfoCard from "../shared/ContractInfoCard";
import ContractInfoCards from "../shared/ContractInfoCards";
import { logger } from "../../../../../utils";
import { compactContractDataForAI } from "../../../../../utils/aiContext";
import { formatNativeFromWei } from "../../../../../utils/unitFormatters";

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
}) => {
  const { jsonFiles } = useContext(AppContext);
  const network = getNetworkById(networkId);
  const networkName = network?.name ?? "Unknown Network";
  const networkCurrency = network?.currency ?? "ETH";

  // Fetch Sourcify data
  const {
    data: sourcifyData,
    loading: sourcifyLoading,
    isVerified,
  } = useSourcify(Number(networkId), addressHash, true);

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
    () => (isVerified && sourcifyData ? sourcifyData : parsedLocalData),
    [isVerified, sourcifyData, parsedLocalData],
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

  logger.debug(contractData);
  return (
    <div className="page-with-analysis">
      <div className="block-display-card">
        <AddressHeader
          addressHash={addressHash}
          addressType="contract"
          metadata={metadata}
          selectedProvider={selectedProvider}
          onProviderSelect={onProviderSelect}
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
            sourcifyUrl={
              sourcifyData
                ? `https://repo.sourcify.dev/contracts/full_match/${networkId}/${addressHash}/`
                : undefined
            }
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
