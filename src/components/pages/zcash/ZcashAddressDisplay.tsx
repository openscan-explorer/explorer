import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { ZcashAddress, ZcashRpcAvailability, ZcashUnifiedReceivers } from "../../../types";
import { formatNumber, formatZEC, truncateHash } from "../../../utils/zcashFormatters";
import CopyButton from "../../common/CopyButton";
import FieldLabel from "../../common/FieldLabel";
import { ADDRESS_TYPE_LABEL_KEYS } from "./labels";

const RECEIVER_ORDER = ["orchard", "sapling", "p2pkh", "p2sh"] as const;

const RECEIVER_LABEL_KEYS = {
  orchard: "address.receiverTypes.orchard",
  sapling: "address.receiverTypes.sapling",
  p2pkh: "address.receiverTypes.p2pkh",
  p2sh: "address.receiverTypes.p2sh",
} as const satisfies Record<keyof ZcashUnifiedReceivers, string>;

const MAX_LISTED_TXIDS = 50;

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
    // getaddresstxids returns transactions in chain order, oldest first
    const recentTxids = txids?.data ? [...txids.data].reverse() : [];

    const unavailable = (availability: ZcashRpcAvailability) => (
      <span className="tx-value text-muted">
        {availability === "unsupported" ? t("address.unavailable") : t("address.sectionError")}
      </span>
    );

    return (
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
        {indexUnsupported && (
          <div className="info-box info-box--warning zec-address-notice">
            <p>{t("address.indexUnsupported")}</p>
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
                label={t("address.balance")}
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
                      (
                      {t("address.transparentReceiverNote", {
                        address: truncateHash(transparentAddress, "short"),
                      })}
                      )
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
          <div className="btc-tx-section">
            <div className="btc-tx-section-header">
              <button
                type="button"
                className="btc-tx-section-toggle"
                onClick={() => setShowUtxos(!showUtxos)}
              >
                <span className="btc-tx-section-title">
                  {t("address.unspentOutputs", { count: utxos.data.length })}
                </span>
                <span className="btc-tx-section-arrow" aria-hidden="true">
                  {showUtxos ? "▾" : "▸"}
                </span>
              </button>
            </div>
            {showUtxos &&
              (utxos.data.length === 0 ? (
                <p className="text-muted">{t("address.noUtxos")}</p>
              ) : (
                <div className="btc-utxo-list">
                  {utxos.data.map((utxo, index) => (
                    <div key={`${utxo.txid}-${utxo.outputIndex}`} className="btc-utxo-item">
                      <span className="btc-utxo-index">{index}</span>
                      <div className="btc-utxo-content">
                        <span className="btc-utxo-hash tx-mono">
                          <Link to={`/${networkId}/tx/${utxo.txid}`} className="link-accent">
                            {truncateHash(utxo.txid, "long")}:{utxo.outputIndex}
                          </Link>
                        </span>
                        <span className="btc-utxo-value tx-value-highlight">
                          {formatZEC(utxo.valueZat, currency)}
                        </span>
                        <span className="btc-utxo-confirmations">
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
          <div className="btc-tx-section">
            <div className="btc-tx-section-header">
              <button
                type="button"
                className="btc-tx-section-toggle"
                onClick={() => setShowTransactions(!showTransactions)}
              >
                <span className="btc-tx-section-title">
                  {t("address.transactions", { count: recentTxids.length })}
                </span>
                <span className="btc-tx-section-arrow" aria-hidden="true">
                  {showTransactions ? "▾" : "▸"}
                </span>
              </button>
            </div>
            {showTransactions && (
              <div className="btc-tx-list">
                {recentTxids.slice(0, MAX_LISTED_TXIDS).map((txid, index) => (
                  <div key={txid} className="btc-tx-list-item">
                    <span className="btc-tx-index">{index}</span>
                    <span className="btc-tx-hash tx-mono">
                      <Link to={`/${networkId}/tx/${txid}`} className="link-accent">
                        {txid}
                      </Link>
                    </span>
                  </div>
                ))}
                {recentTxids.length > MAX_LISTED_TXIDS && (
                  <div className="btc-tx-list-more">
                    {t("address.moreTransactions", {
                      count: recentTxids.length - MAX_LISTED_TXIDS,
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);

ZcashAddressDisplay.displayName = "ZcashAddressDisplay";
export default ZcashAddressDisplay;
