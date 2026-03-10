import type React from "react";
import { useTranslation } from "react-i18next";
import { getKlerosCurateItemUrl, type KlerosTag } from "../../../../../services/KlerosService";
import type { AddressType, RPCMetadata } from "../../../../../types";
import { getAddressTypeIcon, getAddressTypeLabel } from "../../../../../utils/addressTypeDetection";
import { RPCIndicator } from "../../../../common/RPCIndicator";
import CopyButton from "../../../../common/CopyButton";

interface AddressHeaderProps {
  addressHash: string;
  addressType: AddressType;
  ensName?: string | null;
  metadata?: RPCMetadata;
  selectedProvider?: string | null;
  onProviderSelect?: (provider: string) => void;
  tokenSymbol?: string;
  tokenName?: string;
  klerosTag?: KlerosTag | null;
}

// Truncate hash to show first and last N characters
const truncateHash = (hash: string, chars = 4): string => {
  if (hash.length <= chars * 2 + 3) return hash;
  const prefix = hash.startsWith("0x") ? `0x${hash.slice(2, 2 + chars)}` : hash.slice(0, chars);
  const suffix = hash.slice(-chars);
  return `${prefix}...${suffix}`;
};

const AddressHeader: React.FC<AddressHeaderProps> = ({
  addressHash,
  addressType,
  ensName,
  metadata,
  selectedProvider,
  onProviderSelect,
  tokenSymbol,
  tokenName,
  klerosTag,
}) => {
  const { t } = useTranslation("address");
  const truncatedHash = truncateHash(addressHash, 4);

  return (
    <div className="block-display-header address-header">
      <div>
        <div className="address-type-indicator">
          <span className="address-type-icon">{getAddressTypeIcon(addressType)}</span>
          <span className="address-type-label">{getAddressTypeLabel(addressType)}</span>
          {tokenSymbol && <span className="address-token-symbol">{tokenSymbol}</span>}
          {klerosTag && (
            <a
              href={getKlerosCurateItemUrl(klerosTag.itemID)}
              target="_blank"
              rel="noopener noreferrer"
              className="kleros-verified-tag"
              title={t("klerosVerifiedTooltip")}
            >
              <img
                src={`${import.meta.env.BASE_URL}kleros-logo.png`}
                alt="Kleros"
                className="kleros-logo"
              />
              {klerosTag.publicNameTag} ↗
            </a>
          )}
        </div>
        {(ensName || tokenName) && <span className="address-ens-name">{ensName || tokenName}</span>}
        <span className="tx-mono header-subtitle hide-mobile address-hash-inline">
          {addressHash}
          <CopyButton value={addressHash} size={14} />
        </span>
        <span className="tx-mono header-subtitle show-mobile-inline-flex address-hash-inline">
          {truncatedHash}
          <CopyButton value={addressHash} size={14} />
        </span>
      </div>
      {metadata && selectedProvider !== undefined && onProviderSelect && (
        <RPCIndicator
          metadata={metadata}
          selectedProvider={selectedProvider}
          onProviderSelect={onProviderSelect}
        />
      )}
    </div>
  );
};

export default AddressHeader;
