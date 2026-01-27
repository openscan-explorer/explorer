import type React from "react";
import { useMemo } from "react";
import type { Address } from "../../../../types";
import TokenHoldings from "./TokenHoldings";

interface BalanceSectionProps {
  address: Address;
  addressHash: string;
  networkId: number;
  currency?: string;
}

const BalanceSection: React.FC<BalanceSectionProps> = ({
  address,
  addressHash,
  networkId,
  currency = "ETH",
}) => {
  const formattedBalance = useMemo(() => {
    try {
      const eth = Number(address.balance) / 1e18;
      return `${eth.toFixed(6)} ${currency}`;
    } catch {
      return address.balance;
    }
  }, [address.balance, currency]);

  return (
    <>
      <div className="tx-details">
        <div className="tx-section">
          <span className="tx-section-title">Balance</span>
        </div>

        <div className="tx-row">
          <span className="tx-label">Balance:</span>
          <span className="tx-value">
            <span className="tx-value-highlight">{formattedBalance}</span>
          </span>
        </div>

        <div className="tx-row">
          <span className="tx-label">Nonce (Transactions Sent):</span>
          <span className="tx-value">{Number(address.txCount).toLocaleString()} txns</span>
        </div>
      </div>

      <TokenHoldings ownerAddress={addressHash} networkId={networkId} />
    </>
  );
};

export default BalanceSection;
