import type React from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { Address, ABI } from "../../../../../types";
import { useTranslation } from "react-i18next";
import ContractInteraction from "./ContractInteraction";
import type { VerificationSource } from "../../../../../hooks/useContractVerification";
import type { SourcifyContractDetails } from "../../../../../hooks/useSourcify";
import type { ProxyInfo } from "../../../../../utils/proxyDetection";

interface ContractData {
  name?: string;
  compilerVersion?: string;
  evmVersion?: string;
  language?: string;
  optimizerEnabled?: boolean;
  optimizerRuns?: number;
  match?: "perfect" | "partial" | null;
  abi?: ABI[];
  chainId?: string;
  verifiedAt?: string;
  metadata?: {
    compiler?: { version: string };
    language?: string;
  };
  creation_match?: string | null;
  runtime_match?: string | null;
  files?: Array<{ name: string; path: string; content: string }>;
  sources?: Record<string, { content: string }>;
}

const ETHERSCAN_EXPLORERS: Record<number, string> = {
  1: "https://etherscan.io",
  42161: "https://arbiscan.io",
  10: "https://optimistic.etherscan.io",
  8453: "https://basescan.org",
  56: "https://bscscan.com",
  137: "https://polygonscan.com",
  11155111: "https://sepolia.etherscan.io",
  97: "https://testnet.bscscan.com",
};

interface ContractInfoCardProps {
  address: Address;
  addressHash: string;
  networkId: string;
  contractData?: ContractData | null;
  hasVerifiedContract: boolean;
  sourcifyLoading: boolean;
  isLocalArtifact: boolean;
  verificationSource?: VerificationSource;
  proxyInfo?: ProxyInfo | null;
  implementationContractData?: SourcifyContractDetails | null;
  implIsVerified?: boolean;
  /** Implementation contract name from Sourcify's proxyResolution — available immediately without a second fetch. */
  sourcifyImplName?: string;
}

type AbiView = "implementation" | "proxy";

const ContractInfoCard: React.FC<ContractInfoCardProps> = ({
  address,
  addressHash,
  networkId,
  contractData,
  hasVerifiedContract,
  sourcifyLoading,
  isLocalArtifact,
  verificationSource,
  proxyInfo,
  implementationContractData,
  implIsVerified = false,
  sourcifyImplName,
}) => {
  const { t } = useTranslation("address");
  const [showBytecode, setShowBytecode] = useState(false);
  const [showContractDetails, setShowContractDetails] = useState(false);
  const [showSourceCode, setShowSourceCode] = useState(false);
  const [showRawAbi, setShowRawAbi] = useState(false);
  const [abiView, setAbiView] = useState<AbiView>("implementation");

  // Compute verification source URLs
  const sourcifyMatchPath = contractData?.match === "partial" ? "partial_match" : "full_match";
  const sourcifyTagUrl = verificationSource?.includes("sourcify")
    ? `https://repo.sourcify.dev/contracts/${sourcifyMatchPath}/${networkId}/${addressHash}/`
    : null;
  const etherscanBase = ETHERSCAN_EXPLORERS[Number(networkId)];
  const etherscanTagUrl =
    verificationSource?.includes("etherscan") && etherscanBase
      ? `${etherscanBase}/address/${addressHash}#code`
      : null;

  // Only use implementation ABI when the implementation is actually verified
  const hasImplAbi = !!(
    implIsVerified &&
    implementationContractData?.abi &&
    implementationContractData.abi.length > 0
  );
  const hasProxyAbi = !!(contractData?.abi && contractData.abi.length > 0);
  const showAbiTabSwitcher = !!(proxyInfo && hasImplAbi && hasProxyAbi);

  const activeAbi: ABI[] | undefined = showAbiTabSwitcher
    ? abiView === "implementation"
      ? ((implementationContractData?.abi as ABI[] | undefined) ?? contractData?.abi)
      : contractData?.abi
    : proxyInfo && hasImplAbi
      ? (implementationContractData?.abi as ABI[] | undefined)
      : contractData?.abi;

  // Prepare source files array
  const sourceFiles =
    contractData?.files && contractData.files.length > 0
      ? contractData.files
      : contractData?.sources
        ? Object.entries(contractData.sources).map(([path, source]) => ({
            name: path,
            path: path,
            content: source.content || "",
          }))
        : [];

  return (
    <div className="contract-info-card">
      <div className="account-card-title">{t("contractInfo")}</div>

      {/* Verification Status */}
      <div className="account-card-row">
        <span className="account-card-label">{t("status")}:</span>
        <span className="account-card-value">
          {sourcifyLoading ? (
            <span className="contract-checking">{t("checkingSourcify")}</span>
          ) : hasVerifiedContract ? (
            <span className="contract-verification-badge">
              <span className="contract-verified-icon">✓</span>
              <span className="contract-verified-text">{t("verified")}</span>
              {isLocalArtifact && <span className="contract-match-badge">Local JSON</span>}
              {sourcifyTagUrl && (
                <a
                  href={sourcifyTagUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="verification-source-tag verification-source-tag--sourcify"
                >
                  Sourcify ↗
                </a>
              )}
              {etherscanTagUrl && (
                <a
                  href={etherscanTagUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="verification-source-tag verification-source-tag--etherscan"
                >
                  Etherscan ↗
                </a>
              )}
            </span>
          ) : (
            <span className="contract-not-verified">{t("notVerified")}</span>
          )}
        </span>
      </div>

      {/* Proxy Type */}
      {proxyInfo && (
        <div className="account-card-row">
          <span className="account-card-label">{t("proxyType")}:</span>
          <span className="account-card-value">{proxyInfo.type}</span>
        </div>
      )}

      {/* Implementation Address */}
      {proxyInfo?.implementationAddress && (
        <div className="account-card-row">
          <span className="account-card-label">{t("implementationAddress")}:</span>
          <span className="account-card-value">
            <Link
              to={`/${networkId}/address/${proxyInfo.implementationAddress}`}
              className="account-card-link"
            >
              {proxyInfo.implementationAddress}
            </Link>
            {(implementationContractData?.name ?? sourcifyImplName) && (
              <span className="contract-match-badge">
                {implementationContractData?.name ?? sourcifyImplName}
              </span>
            )}
          </span>
        </div>
      )}

      {/* Implementation not verified warning */}
      {proxyInfo && !hasImplAbi && (
        <div className="account-card-row">
          <span className="account-card-label" />
          <span className="account-card-value contract-not-verified">
            {t("implementationNotVerified")}
          </span>
        </div>
      )}

      {/* Contract Name — fall back to implementation name (from full fetch or Sourcify's proxyResolution) */}
      {(contractData?.name || implementationContractData?.name || sourcifyImplName) && (
        <div className="account-card-row">
          <span className="account-card-label">{t("contractName")}:</span>
          <span className="account-card-value contract-name">
            {contractData?.name ?? implementationContractData?.name ?? sourcifyImplName}
          </span>
        </div>
      )}

      {/* Compiler Version */}
      {contractData?.compilerVersion && (
        <div className="account-card-row">
          <span className="account-card-label">{t("compiler")}:</span>
          <span className="account-card-value account-card-mono">
            {contractData.compilerVersion}
          </span>
        </div>
      )}

      {/* EVM Version */}
      {contractData?.evmVersion && (
        <div className="account-card-row">
          <span className="account-card-label">{t("evmVersion")}:</span>
          <span className="account-card-value">{contractData.evmVersion}</span>
        </div>
      )}

      {/* Language */}
      {contractData?.language && contractData.language !== "Solidity" && (
        <div className="account-card-row">
          <span className="account-card-label">{t("language")}:</span>
          <span className="account-card-value">{contractData.language}</span>
        </div>
      )}

      {/* Optimizer */}
      {contractData?.optimizerEnabled !== undefined && (
        <div className="account-card-row">
          <span className="account-card-label">{t("optimizer")}:</span>
          <span className="account-card-value">
            {contractData.optimizerEnabled
              ? t("optimizerEnabled", { runs: contractData.optimizerRuns ?? "?" })
              : t("optimizerDisabled")}
          </span>
        </div>
      )}

      {/* Contract Details Section - shown when:
          a) proxy contract itself has a verified ABI, OR
          b) proxy is detected and its implementation has a verified ABI */}
      {(hasVerifiedContract && contractData) || (proxyInfo && hasImplAbi) ? (
        <div className="contract-details-section">
          <button
            type="button"
            className="contract-details-toggle"
            onClick={() => setShowContractDetails(!showContractDetails)}
          >
            <span className="account-card-label">{t("contractDetails")}</span>
            <span className="contract-toggle-icon">{showContractDetails ? "−" : "+"}</span>
          </button>

          {showContractDetails && (
            <div className="contract-details-content">
              {/* ABI tab switcher - only shown when proxy has verified implementation */}
              {showAbiTabSwitcher && (
                <div className="abi-tab-switcher">
                  <button
                    type="button"
                    className={`abi-tab${abiView === "implementation" ? " abi-tab--active" : ""}`}
                    onClick={() => setAbiView("implementation")}
                  >
                    {t("implementationFunctions")}
                  </button>
                  <button
                    type="button"
                    className={`abi-tab${abiView === "proxy" ? " abi-tab--active" : ""}`}
                    onClick={() => setAbiView("proxy")}
                  >
                    {t("proxyFunctions")}
                  </button>
                </div>
              )}

              {/* Contract Bytecode */}
              {address.code && address.code !== "0x" && (
                <div className="contract-collapsible-item">
                  <button
                    type="button"
                    className="contract-collapsible-toggle"
                    onClick={() => setShowBytecode(!showBytecode)}
                  >
                    <span>{t("contractBytecode")}</span>
                    <span className="contract-toggle-icon-small">{showBytecode ? "▼" : "▶"}</span>
                  </button>
                  {showBytecode && (
                    <div className="contract-code-content">
                      <code>{address.code}</code>
                    </div>
                  )}
                </div>
              )}

              {/* Source Code */}
              {sourceFiles.length > 0 && (
                <div className="contract-collapsible-item">
                  <button
                    type="button"
                    className="contract-collapsible-toggle"
                    onClick={() => setShowSourceCode(!showSourceCode)}
                  >
                    <span>
                      Source Code ({sourceFiles.length} file{sourceFiles.length > 1 ? "s" : ""})
                    </span>
                    <span className="contract-toggle-icon-small">{showSourceCode ? "▼" : "▶"}</span>
                  </button>
                  {showSourceCode && (
                    <div className="contract-source-files">
                      {sourceFiles.map((file) => (
                        <div key={file.path} className="source-file-container">
                          <div className="source-file-header">📄 {file.name || file.path}</div>
                          <pre className="source-file-code">{file.content}</pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Raw ABI */}
              {activeAbi && activeAbi.length > 0 && (
                <div className="contract-collapsible-item">
                  <button
                    type="button"
                    className="contract-collapsible-toggle"
                    onClick={() => setShowRawAbi(!showRawAbi)}
                  >
                    <span>{t("rawAbi")}</span>
                    <span className="contract-toggle-icon-small">{showRawAbi ? "▼" : "▶"}</span>
                  </button>
                  {showRawAbi && (
                    <div className="contract-code-content">
                      <code>{JSON.stringify(activeAbi, null, 2)}</code>
                    </div>
                  )}
                </div>
              )}

              {/* Contract Interaction */}
              {activeAbi && activeAbi.length > 0 && (
                <ContractInteraction
                  addressHash={addressHash}
                  networkId={networkId}
                  abi={activeAbi}
                />
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* Bytecode for unverified contracts */}
      {!hasVerifiedContract && address.code && address.code !== "0x" && (
        <div className="contract-bytecode-section">
          <button
            type="button"
            className="contract-bytecode-toggle"
            onClick={() => setShowBytecode(!showBytecode)}
          >
            <span className="account-card-label">{t("contractBytecode")}</span>
            <span className="contract-toggle-icon">{showBytecode ? "−" : "+"}</span>
          </button>
          {showBytecode && (
            <div className="contract-bytecode-content">
              <code>{address.code}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContractInfoCard;
