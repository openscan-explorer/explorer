import type React from "react";
import { useState } from "react";
import type { ABI } from "../../../../../types";
import { useTranslation } from "react-i18next";
import ContractInteraction from "./ContractInteraction";

interface ContractData {
  name?: string;
  compilerVersion?: string;
  evmVersion?: string;
  chainId?: string;
  verifiedAt?: string;
  match?: "perfect" | "partial" | null;
  metadata?: {
    compiler?: { version: string };
    language?: string;
  };
  creation_match?: string | null;
  runtime_match?: string | null;
  abi?: ABI[];
  files?: Array<{ name: string; path: string; content: string }>;
  sources?: Record<string, { content: string }>;
}

interface ContractDetailsProps {
  addressHash: string;
  networkId: string;
  code: string;
  contractData: ContractData;
  isLocalArtifact?: boolean;
  sourcifyUrl?: string;
}

const ContractDetails: React.FC<ContractDetailsProps> = ({
  addressHash,
  networkId,
  code,
  contractData,
  isLocalArtifact = false,
  sourcifyUrl,
}) => {
  const { t } = useTranslation("address");
  const [showContractDetails, setShowContractDetails] = useState(false);

  // Prepare source files array
  const sourceFiles =
    contractData.files && contractData.files.length > 0
      ? contractData.files
      : contractData.sources
        ? Object.entries(contractData.sources).map(([path, source]) => ({
            name: path,
            path: path,
            content: source.content || "",
          }))
        : [];

  return (
    <div className="tx-details">
      <button
        type="button"
        className="tx-section btn-toggle-section"
        onClick={() => setShowContractDetails(!showContractDetails)}
      >
        <span className="tx-section-title">{t("contractDetails")}</span>
        <span className="contract-section-toggle">{showContractDetails ? " ▼" : " ▶"}</span>
      </button>

      {showContractDetails && (
        <>
          {contractData.compilerVersion && (
            <div className="tx-row">
              <span className="tx-label">{t("compilerVersion")}</span>
              <span className="tx-value tx-mono">{contractData.compilerVersion}</span>
            </div>
          )}

          {contractData.evmVersion && (
            <div className="tx-row">
              <span className="tx-label">{t("evmVersionLabel")}</span>
              <span className="tx-value">{contractData.evmVersion}</span>
            </div>
          )}

          {contractData.chainId && (
            <div className="tx-row">
              <span className="tx-label">{t("networkIdLabel")}</span>
              <span className="tx-value">{contractData.chainId}</span>
            </div>
          )}

          {contractData.name && (
            <div className="tx-row">
              <span className="tx-label">{t("contractName")}</span>
              <span className="tx-value tx-value-success">{contractData.name}</span>
            </div>
          )}

          {contractData.verifiedAt && (
            <div className="tx-row">
              <span className="tx-label">{t("verifiedAtLabel")}</span>
              <span className="tx-value">{new Date(contractData.verifiedAt).toLocaleString()}</span>
            </div>
          )}

          {contractData.match && (
            <div className="tx-row">
              <span className="tx-label">{t("matchType")}</span>
              <span
                className={`tx-value font-weight-600 ${contractData.match === "perfect" ? "text-success" : "text-warning"}`}
              >
                {isLocalArtifact ? "Local JSON" : contractData.match.toUpperCase()}
              </span>
            </div>
          )}

          {contractData.metadata?.compiler && (
            <div className="tx-row">
              <span className="tx-label">{t("compiler")}</span>
              <span className="tx-value tx-mono">{contractData.metadata.compiler.version}</span>
            </div>
          )}

          {contractData.creation_match && (
            <div className="tx-row">
              <span className="tx-label">{t("creationMatch")}</span>
              <span
                className={`tx-value font-weight-600 ${contractData.creation_match === "perfect" ? "text-success" : "text-warning"}`}
              >
                {contractData.creation_match.toUpperCase()}
              </span>
            </div>
          )}

          {contractData.runtime_match && (
            <div className="tx-row">
              <span className="tx-label">{t("runtimeMatch")}</span>
              <span
                className={`tx-value font-weight-600 ${contractData.runtime_match === "perfect" ? "text-success" : "text-warning"}`}
              >
                {contractData.runtime_match.toUpperCase()}
              </span>
            </div>
          )}

          {/* Contract Bytecode */}
          <div className="tx-row-vertical">
            <button
              type="button"
              className="source-toggle-container btn-reset-block"
              onClick={() => {
                const elem = document.getElementById("bytecode-content");
                const icon = document.getElementById("bytecode-icon");
                if (elem && icon) {
                  const isHidden = elem.style.display === "none";
                  elem.style.display = isHidden ? "block" : "none";
                  icon.textContent = isHidden ? "▼" : "▶";
                }
              }}
            >
              <span className="tx-label">{t("contractBytecode")}</span>
              <span id="bytecode-icon" className="source-toggle-icon">
                ▶
              </span>
            </button>
            <div id="bytecode-content" className="tx-input-data hidden">
              <code>{code}</code>
            </div>
          </div>

          {/* Source Code */}
          {sourceFiles.length > 0 && (
            <div className="tx-row-vertical">
              <button
                type="button"
                className="source-toggle-container btn-reset-block"
                onClick={() => {
                  const elem = document.getElementById("source-code-content");
                  const icon = document.getElementById("source-code-icon");
                  if (elem && icon) {
                    const isHidden = elem.style.display === "none";
                    elem.style.display = isHidden ? "block" : "none";
                    icon.textContent = isHidden ? "▼" : "▶";
                  }
                }}
              >
                <span className="tx-label">{t("sourceCode")}</span>
                <span id="source-code-icon" className="source-toggle-icon">
                  ▶
                </span>
              </button>
              <div id="source-code-content" className="margin-top-8 hidden">
                {sourceFiles.map((file) => (
                  <div key={file.path} className="source-file-container">
                    <div className="source-file-header">📄 {file.name || file.path}</div>
                    <pre className="source-file-code">{file.content}</pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw ABI */}
          {contractData.abi && contractData.abi.length > 0 && (
            <div className="tx-row-vertical">
              <button
                type="button"
                className="source-toggle-container btn-reset-block"
                onClick={() => {
                  const elem = document.getElementById("raw-abi-content");
                  const icon = document.getElementById("raw-abi-icon");
                  if (elem && icon) {
                    const isHidden = elem.style.display === "none";
                    elem.style.display = isHidden ? "block" : "none";
                    icon.textContent = isHidden ? "▼" : "▶";
                  }
                }}
              >
                <span className="tx-label">{t("rawAbi")}</span>
                <span id="raw-abi-icon" className="source-toggle-icon">
                  ▶
                </span>
              </button>
              <div id="raw-abi-content" className="tx-input-data hidden">
                <code>{JSON.stringify(contractData.abi, null, 2)}</code>
              </div>
            </div>
          )}

          {/* Contract Functions */}
          {contractData.abi && contractData.abi.length > 0 && (
            <ContractInteraction
              addressHash={addressHash}
              networkId={networkId}
              abi={contractData.abi}
            />
          )}

          {sourcifyUrl && (
            <div className="tx-row">
              <span className="tx-label">{t("sourcify")}</span>
              <a
                href={sourcifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="sourcify-link"
              >
                {t("sourcifyLink")} ↗
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ContractDetails;
