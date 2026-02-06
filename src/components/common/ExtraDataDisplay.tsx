import type React from "react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface ExtraDataDisplayProps {
  hexData: string;
  showToggle?: boolean;
}

const ExtraDataDisplay: React.FC<ExtraDataDisplayProps> = ({ hexData, showToggle = true }) => {
  const { t } = useTranslation();
  const [showRaw, setShowRaw] = useState(false);

  const decoded = useMemo(() => {
    if (!hexData || hexData === "0x") return null;

    try {
      // Remove 0x prefix
      const hex = hexData.startsWith("0x") ? hexData.slice(2) : hexData;

      // Convert hex to bytes
      const bytes: number[] = [];
      for (let i = 0; i < hex.length; i += 2) {
        bytes.push(Number.parseInt(hex.substr(i, 2), 16));
      }

      // Check if all bytes are printable ASCII (32-126)
      const isPrintable = bytes.every((b) => b >= 32 && b <= 126);

      if (isPrintable && bytes.length > 0) {
        return String.fromCharCode(...bytes);
      }

      // Try UTF-8 decoding
      const decoder = new TextDecoder("utf-8", { fatal: true });
      const uint8Array = new Uint8Array(bytes);
      const decoded = decoder.decode(uint8Array);

      // Check if result contains mostly printable characters
      const printableCount = decoded.split("").filter((c) => c.charCodeAt(0) >= 32).length;
      if (printableCount / decoded.length > 0.8) {
        return decoded;
      }

      return null;
    } catch {
      return null;
    }
  }, [hexData]);

  const hasDecodedValue = decoded !== null && decoded.length > 0;
  const displayValue = showRaw || !hasDecodedValue ? hexData : decoded;

  return (
    <div className="extra-data-display">
      <span className={`extra-data-value ${showRaw ? "tx-mono" : ""}`}>
        {hasDecodedValue && !showRaw && (
          <span className="extra-data-decoded">"{displayValue}"</span>
        )}
        {(!hasDecodedValue || showRaw) && <span className="tx-mono">{displayValue}</span>}
      </span>
      {showToggle && hasDecodedValue && (
        <button
          type="button"
          className="extra-data-toggle"
          onClick={() => setShowRaw(!showRaw)}
          title={showRaw ? t("extraData.showDecoded") : t("extraData.showRawHex")}
        >
          {showRaw ? "UTF-8" : "Hex"}
        </button>
      )}
    </div>
  );
};

export default ExtraDataDisplay;
