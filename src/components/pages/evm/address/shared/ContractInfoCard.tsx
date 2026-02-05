import type React from "react";
import { useState } from "react";
import type { Address, ABI } from "../../../../../types";
import ContractInteraction from "./ContractInteraction";

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
}

const ContractInfoCard: React.FC<ContractInfoCardProps> = ({
  address,
  addressHash,
  networkId,
  contractData,
  hasVerifiedContract,
  sourcifyLoading,
  isLocalArtifact,
  sourcifyUrl,
}) => {
  const [showBytecode, setShowBytecode] = useState(false);
  const [showContractDetails, setShowContractDetails] = useState(false);
  const [showSourceCode, setShowSourceCode] = useState(false);
  const [showRawAbi, setShowRawAbi] = useState(false);

  const getMatchBadgeText = () => {
    if (isLocalArtifact) return "Local JSON";
    if (contractData?.match === "perfect") return "Perfect Match";
    if (contractData?.match === "partial") return "Partial Match";
    return null;
  };

  const matchBadgeText = getMatchBadgeText();

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
      <div className="account-card-title">Contract Info</div>

      {/* Verification Status */}
      <div className="account-card-row">
        <span className="account-card-label">Status:</span>
        <span className="account-card-value">
          {sourcifyLoading ? (
            <span className="contract-checking">Checking Sourcify...</span>
          ) : hasVerifiedContract ? (
            <span className="contract-verification-badge">
              <span className="contract-verified-icon">✓</span>
              <span className="contract-verified-text">Verified</span>
              {matchBadgeText && <span className="contract-match-badge">{matchBadgeText}</span>}
            </span>
          ) : (
            <span className="contract-not-verified">Not Verified</span>
          )}
        </span>
      </div>

      {/* Contract Name */}
      {contractData?.name && (
        <div className="account-card-row">
          <span className="account-card-label">Contract Name:</span>
          <span className="account-card-value contract-name">{contractData.name}</span>
        </div>
      )}

      {/* Compiler Version */}
      {contractData?.compilerVersion && (
        <div className="account-card-row">
          <span className="account-card-label">Compiler:</span>
          <span className="account-card-value account-card-mono">
            {contractData.compilerVersion}
          </span>
        </div>
      )}

      {/* EVM Version */}
      {contractData?.evmVersion && (
        <div className="account-card-row">
          <span className="account-card-label">EVM Version:</span>
          <span className="account-card-value">{contractData.evmVersion}</span>
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
            <span className="account-card-label">Contract Details</span>
            <span className="contract-toggle-icon">{showContractDetails ? "−" : "+"}</span>
          </button>

          {showContractDetails && (
            <div className="contract-details-content">
              {/* Contract Bytecode */}
              {address.code && address.code !== "0x" && (
                <div className="contract-collapsible-item">
                  <button
                    type="button"
                    className="contract-collapsible-toggle"
                    onClick={() => setShowBytecode(!showBytecode)}
                  >
                    <span>Contract Bytecode</span>
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
              {contractData.abi && contractData.abi.length > 0 && (
                <div className="contract-collapsible-item">
                  <button
                    type="button"
                    className="contract-collapsible-toggle"
                    onClick={() => setShowRawAbi(!showRawAbi)}
                  >
                    <span>Raw ABI</span>
                    <span className="contract-toggle-icon-small">{showRawAbi ? "▼" : "▶"}</span>
                  </button>
                  {showRawAbi && (
                    <div className="contract-code-content">
                      <code>{JSON.stringify(contractData.abi, null, 2)}</code>
                    </div>
                  )}
                </div>
              )}

              {/* Contract Interaction */}
              {contractData.abi && contractData.abi.length > 0 && (
                <ContractInteraction
                  addressHash={addressHash}
                  networkId={networkId}
                  abi={contractData.abi}
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
            <span className="account-card-label">Contract Bytecode</span>
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
