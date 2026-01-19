import type React from "react";
import type { AddressType, RPCMetadata } from "../../../../types";
import { getAddressTypeIcon, getAddressTypeLabel } from "../../../../utils/addressTypeDetection";
import { RPCIndicator } from "../../../common/RPCIndicator";

interface AddressHeaderProps {
  addressHash: string;
  addressType: AddressType;
  ensName?: string | null;
  metadata?: RPCMetadata;
  selectedProvider?: string | null;
  onProviderSelect?: (provider: string) => void;
  tokenSymbol?: string;
  tokenName?: string;
}

const AddressHeader: React.FC<AddressHeaderProps> = ({
  addressHash,
  addressType,
  ensName,
  metadata,
  selectedProvider,
  onProviderSelect,
  tokenSymbol,
  tokenName,
}) => {
  return (
    <div className="block-display-header address-header">
      <div>
        <div className="address-type-indicator">
          <span className="address-type-icon">{getAddressTypeIcon(addressType)}</span>
          <span className="address-type-label">{getAddressTypeLabel(addressType)}</span>
          {tokenSymbol && <span className="address-token-symbol">{tokenSymbol}</span>}
        </div>
        {(ensName || tokenName) && <span className="address-ens-name">{ensName || tokenName}</span>}
        <span className="tx-mono header-subtitle">{addressHash}</span>
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
