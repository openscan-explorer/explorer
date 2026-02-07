import type React from "react";
import { useMemo } from "react";
import type { Address } from "../../../../../types";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("address");

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
          <span className="tx-section-title">{t("balance")}</span>
        </div>

        <div className="tx-row">
          <span className="tx-label">{t("balance")}:</span>
          <span className="tx-value">
            <span className="tx-value-highlight">{formattedBalance}</span>
          </span>
        </div>

        <div className="tx-row">
          <span className="tx-label">{t("nonce")}:</span>
          <span className="tx-value">
            {Number(address.txCount).toLocaleString()} {t("txns")}
          </span>
        </div>
      </div>

      <TokenHoldings ownerAddress={addressHash} networkId={networkId} />
    </>
  );
};

export default BalanceSection;
