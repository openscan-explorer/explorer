import type React from "react";
import type { Address, ENSReverseResult, RPCMetadata } from "../../../../../types";
import { AddressHeader, TransactionHistory } from "../shared";
import AccountInfoCards from "../shared/AccountInfoCards";

interface AccountDisplayProps {
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

const AccountDisplay: React.FC<AccountDisplayProps> = ({
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
  return (
    <div className="block-display-card">
      <AddressHeader
        addressHash={addressHash}
        addressType="account"
        metadata={metadata}
        selectedProvider={selectedProvider}
        onProviderSelect={onProviderSelect}
      />

      <div className="address-section-content">
        {/* Account Info Cards - Overview + More Info side by side */}
        <AccountInfoCards
          address={address}
          addressHash={addressHash}
          networkId={Number(networkId)}
          ensName={ensName}
          reverseResult={reverseResult}
          isMainnet={isMainnet}
        />

        {/* Transaction History */}
        <TransactionHistory
          networkId={networkId}
          addressHash={addressHash}
          txCount={Number(address.txCount)}
        />
      </div>
    </div>
  );
};

export default AccountDisplay;
