import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BlobSidecar } from "../../types";
import CopyButton from "./CopyButton";
import LongString from "./LongString";

interface BlobDataDisplayProps {
  blob: BlobSidecar;
  index: number;
}

const BlobDataDisplay: React.FC<BlobDataDisplayProps> = React.memo(({ blob, index }) => {
  const { t } = useTranslation("transaction");
  const [showUtf8, setShowUtf8] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const effectiveSize = useMemo(() => {
    const hex = blob.blob.startsWith("0x") ? blob.blob.slice(2) : blob.blob;
    let end = hex.length;
    while (end > 0 && hex[end - 1] === "0" && hex[end - 2] === "0") {
      end -= 2;
    }
    return end / 2;
  }, [blob.blob]);

  const utf8Content = useMemo(() => {
    if (!showUtf8) return null;
    try {
      const hex = blob.blob.startsWith("0x") ? blob.blob.slice(2) : blob.blob;
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      }
      let end = bytes.length;
      while (end > 0 && bytes[end - 1] === 0) end--;
      return new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, end));
    } catch {
      return null;
    }
  }, [blob.blob, showUtf8]);

  const displayHex = expanded
    ? blob.blob
    : `${blob.blob.slice(0, 200)}${blob.blob.length > 200 ? "..." : ""}`;

  return (
    <div className="blob-sidecar-item">
      <div className="blob-sidecar-header">
        <span className="blob-sidecar-index">{t("blobData.blobIndex", { index })}</span>
        <span className="blob-sidecar-size">
          {t("blobData.effectiveSize", { bytes: effectiveSize.toLocaleString() })}
        </span>
      </div>

      <div className="blob-sidecar-meta">
        <div className="blob-meta-row">
          <span className="tx-label">{t("blobData.kzgCommitment")}</span>
          <span className="tx-value tx-mono">
            <LongString value={blob.kzg_commitment} start={16} end={12} />
            <CopyButton value={blob.kzg_commitment} />
          </span>
        </div>
        <div className="blob-meta-row">
          <span className="tx-label">{t("blobData.kzgProof")}</span>
          <span className="tx-value tx-mono">
            <LongString value={blob.kzg_proof} start={16} end={12} />
            <CopyButton value={blob.kzg_proof} />
          </span>
        </div>
      </div>

      <div className="blob-sidecar-data">
        <div className="blob-data-controls">
          <button
            type="button"
            className={`blob-data-btn ${!showUtf8 ? "blob-data-btn--active" : ""}`}
            onClick={() => setShowUtf8(false)}
          >
            {t("blobData.showHex")}
          </button>
          <button
            type="button"
            className={`blob-data-btn ${showUtf8 ? "blob-data-btn--active" : ""}`}
            onClick={() => setShowUtf8(true)}
          >
            {t("blobData.showUtf8")}
          </button>
          <button type="button" className="blob-data-btn" onClick={() => setExpanded(!expanded)}>
            {expanded ? t("blobData.collapse") : t("blobData.expand")}
          </button>
          <CopyButton value={blob.blob} />
        </div>

        {showUtf8 && utf8Content ? (
          <pre className="blob-data-content blob-data-utf8">{utf8Content}</pre>
        ) : (
          <pre className="blob-data-content blob-data-hex">{displayHex}</pre>
        )}
      </div>
    </div>
  );
});

BlobDataDisplay.displayName = "BlobDataDisplay";
export default BlobDataDisplay;
