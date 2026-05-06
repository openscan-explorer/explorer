import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { SolanaAccount, SolanaSignatureInfo } from "../../../types";
import { formatSlotNumber, formatSol, shortenSolanaAddress } from "../../../utils/solanaUtils";
import CopyButton from "../../common/CopyButton";

interface SolanaAccountDisplayProps {
  account: SolanaAccount;
  signatures: SolanaSignatureInfo[];
  networkId: string;
}

const SolanaAccountDisplay: React.FC<SolanaAccountDisplayProps> = React.memo(
  ({ account, signatures, networkId }) => {
    const { t } = useTranslation("solana");

    const accountTypeLabel = account.executable ? t("account.program") : t("account.wallet");

    return (
      <div className="page-with-analysis">
        <div className="block-display-card">
          <div className="block-display-header">
            <span className="block-label">{t("account.title")}</span>
            <span className="block-status-badge block-status-finalized">{accountTypeLabel}</span>
          </div>

          {/* Address — full width on top */}
          <div className="tx-details">
            <div className="tx-row">
              <span className="tx-label">{t("account.address")}:</span>
              <span
                className="tx-value tx-mono"
                style={{ display: "inline-flex", alignItems: "center" }}
              >
                {account.address}
                <CopyButton value={account.address} />
              </span>
            </div>
          </div>

          {/* Two-column layout: account details | token holdings */}
          <div className="btc-tx-details-grid">
            {/* Left column — account details */}
            <div className="btc-tx-details-column">
              <div className="tx-row">
                <span className="tx-label">{t("account.balance")}:</span>
                <span className="tx-value tx-value-highlight">{formatSol(account.lamports)}</span>
              </div>

              <div className="tx-row">
                <span className="tx-label">{t("account.owner")}:</span>
                <span className="tx-value tx-mono">
                  <Link
                    to={`/${networkId}/account/${account.owner}`}
                    className="link-accent tx-mono"
                    title={account.owner}
                  >
                    {shortenSolanaAddress(account.owner, 10, 10)}
                  </Link>
                </span>
              </div>

              <div className="tx-row">
                <span className="tx-label">{t("account.executable")}:</span>
                <span className="tx-value">
                  {account.executable ? t("account.yes") : t("account.no")}
                </span>
              </div>

              <div className="tx-row">
                <span className="tx-label">{t("account.dataSize")}:</span>
                <span className="tx-value">{account.space.toLocaleString()} bytes</span>
              </div>

              <div className="tx-row">
                <span className="tx-label">{t("account.rentEpoch")}:</span>
                <span className="tx-value">{account.rentEpoch}</span>
              </div>
            </div>

            {/* Right column — token holdings */}
            <div className="btc-tx-details-column">
              <div className="block-display-section">
                <h3 className="block-display-section-title">
                  {t("account.tokenHoldings")}
                  {account.tokenAccounts && account.tokenAccounts.length > 0
                    ? ` (${account.tokenAccounts.length})`
                    : ""}
                </h3>
                {account.tokenAccounts && account.tokenAccounts.length > 0 ? (
                  <div className="table-wrapper">
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th>{t("token.mint")}</th>
                          <th>{t("token.amount")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {account.tokenAccounts.map((holding) => (
                          <tr key={holding.tokenAccount}>
                            <td className="table-cell-mono">
                              <Link
                                to={`/${networkId}/token/${holding.mint}`}
                                className="table-cell-address"
                                title={holding.mint}
                              >
                                {shortenSolanaAddress(holding.mint, 8, 8)}
                              </Link>
                            </td>
                            <td className="table-cell-value">{holding.amount.uiAmountString}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="card-content">
                    <p className="text-muted margin-0">{t("account.noTokens")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="block-display-section">
            <h3 className="block-display-section-title">
              {t("account.recentTransactions")}{" "}
              {signatures.length > 0 ? `(${signatures.length})` : ""}
            </h3>
            {signatures.length > 0 ? (
              <div className="table-wrapper">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>{t("transaction.signature")}</th>
                      <th>{t("transaction.status")}</th>
                      <th>{t("transaction.slot")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signatures.map((sig) => (
                      <tr key={sig.signature}>
                        <td className="table-cell-mono">
                          <Link
                            to={`/${networkId}/tx/${sig.signature}`}
                            className="table-cell-address"
                            title={sig.signature}
                          >
                            {shortenSolanaAddress(sig.signature, 12, 12)}
                          </Link>
                        </td>
                        <td>
                          {sig.err ? (
                            <span className="table-status-badge table-status-failed">
                              ✗ {t("transactions.failed")}
                            </span>
                          ) : (
                            <span className="table-status-badge table-status-success">
                              ✓ {t("transactions.success")}
                            </span>
                          )}
                        </td>
                        <td>
                          <Link to={`/${networkId}/slot/${sig.slot}`} className="table-cell-number">
                            {formatSlotNumber(sig.slot)}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card-content">
                <p className="text-muted margin-0">{t("account.noTransactions")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);

SolanaAccountDisplay.displayName = "SolanaAccountDisplay";

export default SolanaAccountDisplay;
