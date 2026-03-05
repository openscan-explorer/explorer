import type React from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { Address, ABI } from "../../../../../types";
import { useTranslation } from "react-i18next";
import ContractInteraction from "./ContractInteraction";
import type { ProxyInfo } from "../../../../../utils/proxyDetection";
import type { SourcifyContractDetails } from "../../../../../hooks/useSourcify";

interface ContractData {
  name?: string;
  compilerVersion?: string;
  evmVersion?: string;
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

interface ContractInfoCardProps {
  address: Address;
  addressHash: string;
  networkId: string;
  contractData?: ContractData | null;
  hasVerifiedContract: boolean;
  sourcifyLoading: boolean;
  isLocalArtifact: boolean;
  sourcifyUrl?: string;
  proxyInfo?: ProxyInfo | null;
  implementationContractData?: SourcifyContractDetails | null;
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
  sourcifyUrl,
  proxyInfo,
  implementationContractData,
}) => {
  const { t } = useTranslation("address");
  const [showBytecode, setShowBytecode] = useState(false);
  const [showContractDetails, setShowContractDetails] = useState(false);
  const [showSourceCode, setShowSourceCode] = useState(false);
  const [showRawAbi, setShowRawAbi] = useState(false);
  const [abiView, setAbiView] = useState<AbiView>("implementation");

  const getMatchBadgeText = () => {
    if (isLocalArtifact) return "Local JSON";
    if (contractData?.match === "perfect") return "Perfect Match";
    if (contractData?.match === "partial") return "Partial Match";
    return null;
  };

  const matchBadgeText = getMatchBadgeText();

  // Determine the active ABI based on tab selection
  const hasImplAbi = !!(
    implementationContractData?.abi && implementationContractData.abi.length > 0
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
              {matchBadgeText && <span className="contract-match-badge">{matchBadgeText}</span>}
            </span>
          ) : (
            <span className="contract-not-verified">{t("notVerified")}</span>
          )}
        </span>
      </div>

      {/* Contract Name */}
      {contractData?.name && (
        <div className="account-card-row">
          <span className="account-card-label">{t("contractName")}:</span>
          <span className="account-card-value contract-name">{contractData.name}</span>
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
              to={`/address/${proxyInfo.implementationAddress}?network=${networkId}`}
              className="account-card-link"
            >
              {proxyInfo.implementationAddress}
            </Link>
            {implementationContractData?.name && (
              <span className="contract-match-badge">{implementationContractData.name}</span>
            )}
          </span>
        </div>
      )}

      {/* Sourcify Link */}
      {sourcifyUrl && (
        <div className="account-card-row">
          <span className="account-card-label">Sourcify:</span>
          <span className="account-card-value">
            <a
              href={sourcifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="account-card-link"
            >
              View on Sourcify ↗
            </a>
          </span>
        </div>
      )}

      {/* Contract Details Section - for verified contracts */}
      {hasVerifiedContract && contractData && (
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
      )}

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
