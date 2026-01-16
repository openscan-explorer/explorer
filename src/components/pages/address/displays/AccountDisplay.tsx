import type React from "react";
import type {
  Address,
  AddressTransactionsResult,
  DecodedContenthash,
  ENSRecords,
  ENSReverseResult,
  RPCMetadata,
  Transaction,
} from "../../../../types";
import { AddressHeader, BalanceSection, TransactionHistory } from "../shared";
import ENSRecordsDetails from "../shared/ENSRecordsDisplay";

interface AccountDisplayProps {
  address: Address;
  addressHash: string;
  networkId: string;
  transactionsResult?: AddressTransactionsResult | null;
  transactionDetails: Transaction[];
  loadingTxDetails: boolean;
  searchTriggered: boolean;
  searchingTxs: boolean;
  searchLimit: number;
  onStartSearch: (limit: number) => void;
  onCancelSearch?: () => void;
  onLoadMore?: (limit: number) => void;
  metadata?: RPCMetadata;
  selectedProvider?: string | null;
  onProviderSelect?: (provider: string) => void;
  // ENS props
  ensName?: string | null;
  reverseResult?: ENSReverseResult | null;
  ensRecords?: ENSRecords | null;
  decodedContenthash?: DecodedContenthash | null;
  ensLoading?: boolean;
  isMainnet?: boolean;
}

const AccountDisplay: React.FC<AccountDisplayProps> = ({
  address,
  addressHash,
  networkId,
  transactionsResult,
  transactionDetails,
  loadingTxDetails,
  searchTriggered,
  searchingTxs,
  searchLimit,
  onStartSearch,
  onCancelSearch,
  onLoadMore,
  metadata,
  selectedProvider,
  onProviderSelect,
  ensName,
  reverseResult,
  ensRecords,
  decodedContenthash,
  ensLoading = false,
  isMainnet = true,
}) => {
  return (
    <div className="block-display-card">
      <AddressHeader
        addressHash={addressHash}
        addressType="account"
        ensName={ensName || reverseResult?.ensName}
        metadata={metadata}
        selectedProvider={selectedProvider}
        onProviderSelect={onProviderSelect}
      />

      <div className="address-section-content">
        {/* Balance Section */}
        <BalanceSection address={address} />

        {/* ENS Records Section */}
        {(ensName || reverseResult?.ensName || ensLoading) && (
          <ENSRecordsDetails
            ensName={ensName || null}
            reverseResult={reverseResult}
            records={ensRecords}
            decodedContenthash={decodedContenthash}
            loading={ensLoading}
            isMainnet={isMainnet}
          />
        )}

        {/* Transaction History */}
        <TransactionHistory
          networkId={networkId}
          addressHash={addressHash}
          transactionsResult={transactionsResult}
          transactionDetails={transactionDetails}
          loadingTxDetails={loadingTxDetails}
          searchTriggered={searchTriggered}
          searchingTxs={searchingTxs}
          searchLimit={searchLimit}
          onStartSearch={onStartSearch}
          onCancelSearch={onCancelSearch}
          onLoadMore={onLoadMore}
          txCount={Number(address.txCount)}
        />
      </div>
    </div>
  );
};

export default AccountDisplay;
