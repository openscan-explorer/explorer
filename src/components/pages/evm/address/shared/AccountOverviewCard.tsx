import type React from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  checkEIP7702Delegation,
  getEIP7702DelegateAddress,
} from "../../../../../utils/addressTypeDetection";

interface AccountOverviewCardProps {
  balance: string;
  txCount: number;
  currency?: string;
  nativeTokenPrice?: number | null;
  priceLoading?: boolean;
  code?: string;
  networkId: number;
}

const AccountOverviewCard: React.FC<AccountOverviewCardProps> = ({
  balance,
  txCount,
  currency = "ETH",
  nativeTokenPrice,
  priceLoading = false,
  code,
  networkId,
}) => {
  const { t } = useTranslation("address");

  const { formattedBalance, balanceNumber } = useMemo(() => {
    try {
      const eth = Number(balance) / 1e18;
      return { formattedBalance: eth.toFixed(6), balanceNumber: eth };
    } catch {
      return { formattedBalance: "0", balanceNumber: 0 };
    }
  }, [balance]);

  const usdValue = useMemo(() => {
    if (nativeTokenPrice === null || nativeTokenPrice === undefined) {
      return null;
    }
    return balanceNumber * nativeTokenPrice;
  }, [balanceNumber, nativeTokenPrice]);

  const formattedUsdValue = useMemo(() => {
    if (usdValue === null) {
      return null;
    }
    if (usdValue >= 1000) {
      return `$${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (usdValue >= 0.01) {
      return `$${usdValue.toFixed(2)}`;
    }
    if (usdValue > 0) {
      return `<$0.01`;
    }
    return "$0.00";
  }, [usdValue]);

  const formattedPrice = useMemo(() => {
    if (nativeTokenPrice === null || nativeTokenPrice === undefined) {
      return null;
    }
    if (nativeTokenPrice >= 1000) {
      return `$${nativeTokenPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${nativeTokenPrice.toFixed(2)}`;
  }, [nativeTokenPrice]);

  const eip7702Delegate = useMemo(() => {
    if (!code || !checkEIP7702Delegation(code)) return null;
    return getEIP7702DelegateAddress(code);
  }, [code]);

  const truncateAddress = (addr: string): string => {
    return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
  };

  return (
    <div className="account-card">
      <div className="account-card-title">{t("overview")}</div>

      <div className="account-card-row">
        <span className="account-card-label">{t("balance")}:</span>
        <span className="account-card-value">
          {formattedBalance} {currency}
        </span>
      </div>

      <div className="account-card-row">
        <span className="account-card-label">{t("value")}:</span>
        <span className="account-card-value">
          {priceLoading ? (
            <span className="account-card-loading">{t("loading")}</span>
          ) : formattedUsdValue ? (
            <>
              <span className="account-card-usd">{formattedUsdValue}</span>
              {formattedPrice && (
                <span className="account-card-price">
                  (@ {formattedPrice}/{currency})
                </span>
              )}
            </>
          ) : (
            <span className="account-card-empty">—</span>
          )}
        </span>
      </div>

      <div className="account-card-row">
        <span className="account-card-label">{t("nonce")}:</span>
        <span className="account-card-value">{txCount.toLocaleString()}</span>
      </div>

      {eip7702Delegate && (
        <div className="account-card-row">
          <span className="account-card-label">{t("eip7702Delegate")}:</span>
          <span className="account-card-value">
            <Link to={`/${networkId}/address/${eip7702Delegate}`} className="account-card-link">
              {truncateAddress(eip7702Delegate)}
            </Link>
          </span>
        </div>
      )}
    </div>
  );
};

export default AccountOverviewCard;
