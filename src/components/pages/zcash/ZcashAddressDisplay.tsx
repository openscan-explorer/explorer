import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getNetworkById } from "../../../config/networks";
import type { ZcashAddress, ZcashRpcAvailability, ZcashUnifiedReceivers } from "../../../types";
import { formatNumber, formatZEC, truncateHash } from "../../../utils/zcashFormatters";
import AIAnalysisPanel from "../../common/AIAnalysis/AIAnalysisPanel";
import CopyButton from "../../common/CopyButton";
import FieldLabel from "../../common/FieldLabel";
import { buildAddressAnalysisContext } from "./aiContext";
import { ADDRESS_TYPE_LABEL_KEYS } from "./labels";

const RECEIVER_ORDER = ["orchard", "sapling", "p2pkh", "p2sh"] as const;

const RECEIVER_LABEL_KEYS = {
  orchard: "address.receiverTypes.orchard",
  sapling: "address.receiverTypes.sapling",
  p2pkh: "address.receiverTypes.p2pkh",
  p2sh: "address.receiverTypes.p2sh",
} as const satisfies Record<keyof ZcashUnifiedReceivers, string>;

const TXIDS_PER_PAGE = 50;

interface ZcashAddressDisplayProps {
  address: ZcashAddress;
  networkId: string;
  currency: string;
  onRetry: () => void;
}

const ZcashAddressDisplay: React.FC<ZcashAddressDisplayProps> = React.memo(
  ({ address, networkId, currency, onRetry }) => {
    const { t } = useTranslation("zcash");
    const [showUtxos, setShowUtxos] = useState(false);
    const [showTransactions, setShowTransactions] = useState(false);
    const [txPage, setTxPage] = useState(1);

    const { type, receivers, balance, utxos, txids, transparentAddress } = address;
    const indexAvailability = [balance, utxos, txids].flatMap((section) =>
      section ? [section.availability] : [],
    );
    // Hosted gateways block the whole address index, so one notice replaces three empty rows
    const indexUnsupported =
      indexAvailability.length > 0 && indexAvailability.every((a) => a === "unsupported");
    const hasError = [receivers, balance, utxos, txids].some((s) => s?.availability === "error");
    const isShielded = type === "sapling" || type === "sprout";
    const unifiedWithoutTransparent =
      type === "unified" && receivers?.availability === "ok" && !transparentAddress;
    // A gateway that can't decode unified addresses needs the same fix as the address index
    const receiversUnsupported = receivers?.availability === "unsupported";
    // getaddresstxids returns transactions in chain order, oldest first
    const recentTxids = txids?.data ? [...txids.data].reverse() : [];
    const txPages = Math.max(1, Math.ceil(recentTxids.length / TXIDS_PER_PAGE));
    const currentTxPage = Math.min(txPage, txPages);
    const pageStart = (currentTxPage - 1) * TXIDS_PER_PAGE;
    const pageTxids = recentTxids.slice(pageStart, pageStart + TXIDS_PER_PAGE);

    const unavailable = (availability: ZcashRpcAvailability) => (
      <span className="tx-value text-muted">
        {availability === "unsupported" ? t("address.unavailable") : t("address.sectionError")}
      </span>
    );

    const network = getNetworkById(networkId);
    const aiContext = useMemo(() => buildAddressAnalysisContext(address), [address]);

    return (
      <div className="page-with-analysis">
        <div className="block-display-card">
          <div className="block-display-header">
            <span className="block-label">{t("address.title")}</span>
            <span className="block-status-badge block-status-finalized">
              {t(ADDRESS_TYPE_LABEL_KEYS[type])}
            </span>
          </div>

          {type === "unknown" && (
            <div className="info-box info-box--warning zec-address-notice">
              {t("address.unknownNotice")}
            </div>
          )}
          {isShielded && (
            <div className="info-box zec-address-notice">{t("address.shieldedNotice")}</div>
          )}
          {unifiedWithoutTransparent && (
            <div className="info-box zec-address-notice">{t("address.unifiedShieldedNotice")}</div>
          )}
          {type === "tex" && (
            <div className="info-box zec-address-notice">{t("address.texNotice")}</div>
          )}
          {(indexUnsupported || receiversUnsupported) && (
            <div className="info-box info-box--warning zec-address-notice">
              <p>
                {indexUnsupported
                  ? t("address.indexUnsupported")
                  : t("address.receiversUnsupported")}
              </p>
              <Link to="/settings" className="link-accent">
                {t("address.configureRpc")}
              </Link>
            </div>
          )}

          <div className="tx-details">
            <div className="tx-row">
              <FieldLabel
                label={t("address.address")}
                tooltipKey="zcash.address.address"
                visibleFor={["beginner"]}
              />
              <span className="tx-value tx-mono zec-inline-copy zec-address-value">
                {address.address}
                <CopyButton value={address.address} />
              </span>
            </div>

            {receivers && (
              <div className="tx-row">
                <FieldLabel
                  label={t("address.receivers")}
                  tooltipKey="zcash.address.receivers"
                  visibleFor={["beginner", "intermediate"]}
                />
                {receivers.availability === "ok" && receivers.data ? (
                  <ul className="tx-value zec-receivers">
                    {RECEIVER_ORDER.flatMap((kind) => {
                      const value = receivers.data?.[kind];
                      if (!value) return [];
                      const isTransparent = kind === "p2pkh" || kind === "p2sh";
                      return [
                        <li key={kind}>
                          <span className="zec-receiver-kind">{t(RECEIVER_LABEL_KEYS[kind])}</span>
                          {isTransparent ? (
                            <Link
                              to={`/${networkId}/address/${value}`}
                              className="link-accent tx-mono"
                            >
                              {value}
                            </Link>
                          ) : (
                            <span className="tx-mono zec-address-value" title={value}>
                              {truncateHash(value, "long")}
                            </span>
                          )}
                          <CopyButton value={value} />
                        </li>,
                      ];
                    })}
                  </ul>
                ) : (
                  unavailable(receivers.availability)
                )}
              </div>
            )}

            {balance && !indexUnsupported && (
              <div className="tx-row">
                <FieldLabel
                  label={
                    // A unified address's other receivers are shielded: this is only the
                    // transparent receiver's balance
                    type === "unified" ? t("address.transparentBalance") : t("address.balance")
                  }
                  tooltipKey="zcash.address.balance"
                  visibleFor={["beginner"]}
                />
                {balance.availability === "ok" && balance.data ? (
                  <span className="tx-value">
                    <span className="tx-value-highlight">
                      {formatZEC(balance.data.balanceZat, currency)}
                    </span>
                    {type === "unified" && transparentAddress && (
                      <span className="text-muted">
                        {" "}
                        {t("address.transparentReceiverNote", {
                          address: truncateHash(transparentAddress, "short"),
                        })}
                      </span>
                    )}
                  </span>
                ) : (
                  unavailable(balance.availability)
                )}
              </div>
            )}

            {balance?.availability === "ok" && balance.data?.receivedZat !== undefined && (
              <div className="tx-row">
                <FieldLabel
                  label={t("address.received")}
                  tooltipKey="zcash.address.received"
                  visibleFor={["beginner"]}
                />
                <span className="tx-value">{formatZEC(balance.data.receivedZat, currency)}</span>
              </div>
            )}

            {utxos && !indexUnsupported && utxos.availability !== "ok" && (
              <div className="tx-row">
                <FieldLabel label={t("address.unspentOutputsLabel")} />
                {unavailable(utxos.availability)}
              </div>
            )}

            {txids && !indexUnsupported && txids.availability !== "ok" && (
              <div className="tx-row">
                <FieldLabel label={t("address.transactionsLabel")} />
                {unavailable(txids.availability)}
              </div>
            )}

            {hasError && (
              <div className="tx-row">
                <button type="button" className="more-details-toggle" onClick={onRetry}>
                  {t("address.retry")}
                </button>
              </div>
            )}
          </div>

          {utxos?.availability === "ok" && utxos.data && (
            <div className="utxo-tx-section">
              <div className="utxo-tx-section-header">
                <button
                  type="button"
                  className="utxo-tx-section-toggle"
                  onClick={() => setShowUtxos(!showUtxos)}
                >
                  <span className="utxo-tx-section-title">
                    {t("address.unspentOutputs", { count: utxos.data.length })}
                  </span>
                  <span className="utxo-tx-section-arrow" aria-hidden="true">
                    {showUtxos ? "▾" : "▸"}
                  </span>
                </button>
              </div>
              {showUtxos &&
                (utxos.data.length === 0 ? (
                  <p className="text-muted">{t("address.noUtxos")}</p>
                ) : (
                  <div className="utxo-list">
                    {utxos.data.map((utxo, index) => (
                      <div key={`${utxo.txid}-${utxo.outputIndex}`} className="utxo-item">
                        <span className="utxo-index">{index}</span>
                        <div className="utxo-content">
                          <span className="utxo-hash tx-mono">
                            <Link to={`/${networkId}/tx/${utxo.txid}`} className="link-accent">
                              {truncateHash(utxo.txid, "long")}:{utxo.outputIndex}
                            </Link>
                          </span>
                          <span className="utxo-value tx-value-highlight">
                            {formatZEC(utxo.valueZat, currency)}
                          </span>
                          <span className="utxo-confirmations">
                            <Link to={`/${networkId}/block/${utxo.height}`} className="link-accent">
                              {t("address.atHeight", { height: formatNumber(utxo.height) })}
                            </Link>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          )}

          {txids?.availability === "ok" && recentTxids.length > 0 && (
            <div className="utxo-tx-section">
              <div className="utxo-tx-section-header">
                <button
                  type="button"
                  className="utxo-tx-section-toggle"
                  onClick={() => setShowTransactions(!showTransactions)}
                >
                  <span className="utxo-tx-section-title">
                    {t("address.transactions", { count: recentTxids.length })}
                  </span>
                  <span className="utxo-tx-section-arrow" aria-hidden="true">
                    {showTransactions ? "▾" : "▸"}
                  </span>
                </button>
              </div>
              {showTransactions && (
                <div className="utxo-tx-list">
                  {pageTxids.map((txid, index) => (
                    <div key={txid} className="utxo-tx-list-item">
                      <span className="utxo-tx-index">{pageStart + index}</span>
                      <span className="utxo-tx-hash tx-mono">
                        <Link to={`/${networkId}/tx/${txid}`} className="link-accent">
                          {txid}
                        </Link>
                      </span>
                    </div>
                  ))}
                  {txPages > 1 && (
                    <div className="pagination-container no-margin-top">
                      <button
                        type="button"
                        onClick={() => setTxPage(currentTxPage - 1)}
                        disabled={currentTxPage <= 1}
                        className="pagination-btn"
                        title={t("txsPage.prevTitle")}
                      >
                        {t("txsPage.prev")}
                      </button>
                      <span className="pagination-page-info">
                        {t("txsPage.pageInfo", { page: currentTxPage, totalPages: txPages })}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTxPage(currentTxPage + 1)}
                        disabled={currentTxPage >= txPages}
                        className="pagination-btn"
                        title={t("txsPage.nextTitle")}
                      >
                        {t("txsPage.next")}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {/* Without a transparent receiver there's nothing public to analyze, so a shielded
            address isn't sent to the AI provider */}
        {transparentAddress && (
          <AIAnalysisPanel
            analysisType="zcash_address"
            context={aiContext}
            networkName={network?.name ?? "Zcash"}
            networkCurrency={currency}
            cacheKey={`openscan_ai_zcash_address_${networkId}_${address.address}`}
          />
        )}
      </div>
    );
  },
);

ZcashAddressDisplay.displayName = "ZcashAddressDisplay";
export default ZcashAddressDisplay;
