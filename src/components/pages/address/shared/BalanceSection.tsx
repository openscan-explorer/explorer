import type React from "react";
import { useMemo } from "react";
import type { Address } from "../../../../types";

interface BalanceSectionProps {
  address: Address;
  currency?: string;
}

const BalanceSection: React.FC<BalanceSectionProps> = ({ address, currency = "ETH" }) => {
  const formattedBalance = useMemo(() => {
    try {
      const eth = Number(address.balance) / 1e18;
      return `${eth.toFixed(6)} ${currency}`;
    } catch {
      return address.balance;
    }
  }, [address.balance, currency]);

  return (
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
        <span className="tx-label">Transactions:</span>
        <span className="tx-value">{Number(address.txCount).toLocaleString()} txns</span>
      </div>
    </div>
  );
};

export default BalanceSection;
