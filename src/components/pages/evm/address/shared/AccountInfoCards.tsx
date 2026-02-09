import type React from "react";
import { useContext, useEffect, useState } from "react";
import { AppContext } from "../../../../../context";
import { getNativeTokenPrice } from "../../../../../services/PriceService";
import type { Address, ENSReverseResult } from "../../../../../types";
import { logger } from "../../../../../utils/logger";
import AccountMoreInfoCard from "./AccountMoreInfoCard";
import AccountOverviewCard from "./AccountOverviewCard";

interface AccountInfoCardsProps {
  address: Address;
  addressHash: string;
  networkId: number;
  ensName?: string | null;
  reverseResult?: ENSReverseResult | null;
  isMainnet?: boolean;
  currency?: string;
}

const AccountInfoCards: React.FC<AccountInfoCardsProps> = ({
  address,
  addressHash,
  networkId,
  ensName,
  reverseResult,
  isMainnet = true,
  currency = "ETH",
}) => {
  const { rpcUrls } = useContext(AppContext);
  const [nativeTokenPrice, setNativeTokenPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  // Fetch native token price
  useEffect(() => {
    const fetchPrice = async () => {
      const rpcNetworkId = `eip155:${networkId}`;
      const rpcUrlsForChain = rpcUrls[rpcNetworkId];
      if (!rpcUrlsForChain) return;

      const rpcUrl = Array.isArray(rpcUrlsForChain) ? rpcUrlsForChain[0] : rpcUrlsForChain;
      if (!rpcUrl) return;

      // Get mainnet RPC for L2s
      const mainnetRpcUrls = rpcUrls["eip155:1"];
      const mainnetRpcUrl = Array.isArray(mainnetRpcUrls) ? mainnetRpcUrls[0] : mainnetRpcUrls;

      setPriceLoading(true);
      try {
        const price = await getNativeTokenPrice(networkId, rpcUrl, mainnetRpcUrl);
        setNativeTokenPrice(price);
      } catch (err) {
        logger.error("Error fetching native token price:", err);
        setNativeTokenPrice(null);
      } finally {
        setPriceLoading(false);
      }
    };

    fetchPrice();
  }, [networkId, rpcUrls]);

  return (
    <div className="account-info-cards">
      <AccountOverviewCard
        balance={address.balance}
        txCount={Number(address.txCount)}
        currency={currency}
        nativeTokenPrice={nativeTokenPrice}
        priceLoading={priceLoading}
        code={address.code}
        networkId={networkId}
      />
      <AccountMoreInfoCard
        ensName={ensName}
        reverseResult={reverseResult}
        ownerAddress={addressHash}
        networkId={networkId}
        isMainnet={isMainnet}
      />
    </div>
  );
};

export default AccountInfoCards;
