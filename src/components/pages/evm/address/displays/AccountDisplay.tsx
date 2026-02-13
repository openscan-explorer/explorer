import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { getNetworkById } from "../../../../../config/networks";
import type { Address, ENSReverseResult, RPCMetadata, Transaction } from "../../../../../types";
import AIAnalysisPanel from "../../../../common/AIAnalysis/AIAnalysisPanel";
import { AddressHeader, TransactionHistory } from "../shared";
import AccountInfoCards from "../shared/AccountInfoCards";
import { formatNativeFromWei } from "../../../../../utils/unitFormatters";

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
  const network = getNetworkById(networkId);
  const networkName = network?.name ?? "Unknown Network";
  const networkCurrency = network?.currency ?? "ETH";

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const handleTransactionsChange = useCallback((txs: Transaction[]) => {
    setTransactions(txs);
  }, []);

  const recentTxSummary = useMemo(() => {
    if (transactions.length === 0) return undefined;
    return transactions.slice(0, 10).map((tx) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to ?? "contract creation",
      valueNative: formatNativeFromWei(tx.value, networkCurrency, 6),
      status: tx.receipt?.status === "0x1" || tx.receipt?.status === "1" ? "success" : "failed",
    }));
  }, [transactions, networkCurrency]);

  const aiContext = useMemo(
    () => ({
      address: addressHash,
      balanceNative: formatNativeFromWei(address.balance, networkCurrency, 6),
      txCount: address.txCount,
      accountType: "account",
      hasCode: address.code !== "0x",
      ensName: ensName ?? undefined,
      recentTransactions: recentTxSummary,
    }),
    [
      addressHash,
      address.balance,
      address.txCount,
      address.code,
      ensName,
      recentTxSummary,
      networkCurrency,
    ],
  );

  return (
    <div className="page-with-analysis">
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
            onTransactionsChange={handleTransactionsChange}
          />
        </div>
      </div>
      <AIAnalysisPanel
        analysisType="account"
        context={aiContext}
        networkName={networkName}
        networkCurrency={networkCurrency}
        cacheKey={`openscan_ai_account_${networkId}_${addressHash}`}
      />
    </div>
  );
};

export default AccountDisplay;
