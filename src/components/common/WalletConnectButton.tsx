import { ConnectButton } from "@rainbow-me/rainbowkit";
import type React from "react";
import { useTranslation } from "react-i18next";

interface WalletConnectButtonProps {
  showChainSelector?: boolean;
}

/**
 * Reusable wallet connect button using RainbowKit.
 * Shows connect button when disconnected, chain selector and account when connected.
 */
const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({ showChainSelector = true }) => {
  const { t } = useTranslation();
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }: Parameters<Parameters<typeof ConnectButton.Custom>[0]["children"]>[0]) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              className: "wallet-hidden",
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button onClick={openConnectModal} type="button" className="btn-connect-wallet">
                    {t("wallet.connectWallet")}
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button onClick={openChainModal} type="button" className="btn-wrong-network">
                    {t("wallet.wrongNetwork")}
                  </button>
                );
              }

              return (
                <div className="wallet-connected-container">
                  {showChainSelector && (
                    <button onClick={openChainModal} type="button" className="btn-chain-selector">
                      {chain.hasIcon && chain.iconUrl && (
                        <img
                          alt={chain.name ?? t("wallet.chainIcon")}
                          src={chain.iconUrl}
                          className="chain-icon"
                        />
                      )}
                      {chain.name}
                    </button>
                  )}
                  <button onClick={openAccountModal} type="button" className="btn-account">
                    {account.displayName}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};

export default WalletConnectButton;
