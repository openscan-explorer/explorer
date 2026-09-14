import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { MAX_INPUT_LOOKUPS } from "../../../config/zcashConstants";
import { useSettings } from "../../../context/SettingsContext";
import { useZcashTimeAgo } from "../../../hooks/useZcashTimeAgo";
import type { ZcashTransaction } from "../../../types";
import {
  formatNumber,
  formatSize,
  formatTimestamp,
  formatZEC,
  truncateBlockHash,
  truncateHash,
} from "../../../utils/zcashFormatters";
import {
  classifyTransaction,
  computeFeeZat,
  countPreviousTransactions,
  getTransactionPools,
  getTransparentOutputZat,
  isCoinbaseTransaction,
} from "../../../utils/zcashUtils";
import CopyButton from "../../common/CopyButton";
import FieldLabel from "../../common/FieldLabel";
import HelperTooltip from "../../common/HelperTooltip";
import { TX_KIND_LABEL_KEYS, VALUE_POOL_LABEL_KEYS } from "./labels";
import ZcashShieldedBundles from "./ZcashShieldedBundles";

/** Progress of the on-demand transparent input lookup */
export type InputResolution =
  | { status: "idle" }
  | { status: "resolving"; resolved: number; total: number }
  | { status: "done"; resolved: number; total: number }
  | { status: "error"; message: string };

interface ZcashTransactionDisplayProps {
  transaction: ZcashTransaction;
  networkId: string;
  currency: string;
  resolution: InputResolution;
  onResolveInputs: () => void;
}

const ZcashTransactionDisplay: React.FC<ZcashTransactionDisplayProps> = React.memo(
  ({ transaction, networkId, currency, resolution, onResolveInputs }) => {
    const { t } = useTranslation("zcash");
    const { t: tTooltips } = useTranslation("tooltips");
    const { settings } = useSettings();
    const timeAgo = useZcashTimeAgo();
    const showTooltips = settings.showHelperTooltips !== false;

    const kind = classifyTransaction(transaction);
    // The kind badge already covers transactions that only use the transparent pool
    const pools =
      kind === "transparent" || kind === "coinbase" ? [] : getTransactionPools(transaction);
    const isCoinbase = isCoinbaseTransaction(transaction);
    const feeZat = computeFeeZat(transaction);
    const previousCount = countPreviousTransactions(transaction);
    const inputTotalZat =
      !isCoinbase && transaction.vin.every((input) => input.valueZat !== undefined)
        ? transaction.vin.reduce((sum, input) => sum + (input.valueZat ?? 0), 0)
        : null;
    const outputTotalZat = getTransparentOutputZat(transaction);
    const isUnconfirmed = !transaction.blockhash || !transaction.confirmations;
    const hasTransparent = transaction.vin.length > 0 || transaction.vout.length > 0;

    const renderFee = () => {
      if (feeZat !== null) {
        return (
          <span className="tx-value tx-value-highlight">
            {formatZEC(feeZat, currency)}
            {transaction.size > 0 && (
              <span className="zec-fee-rate">
                {t("tx.feeRate", { rate: (feeZat / transaction.size).toFixed(2) })}
              </span>
            )}
          </span>
        );
      }
      if (resolution.status === "resolving") {
        return (
          <span className="tx-value text-muted">
            {t("tx.resolving", { resolved: resolution.resolved, total: resolution.total })}
          </span>
        );
      }
      if (resolution.status === "done") {
        return (
          <span className="tx-value text-muted">
            {t("tx.feeUnavailable", { resolved: resolution.resolved, total: resolution.total })}
          </span>
        );
      }
      return (
        <span className="tx-value zec-fee-resolve">
          <button type="button" className="more-details-toggle" onClick={onResolveInputs}>
            {resolution.status === "error" ? t("tx.retry") : t("tx.lookUpInputs")}
          </button>
          <span className="text-muted">
            {resolution.status === "error"
              ? t("tx.resolveError", { message: resolution.message })
              : previousCount > MAX_INPUT_LOOKUPS
                ? t("tx.lookUpCapped", { max: MAX_INPUT_LOOKUPS, count: previousCount })
                : t("tx.feeNeedsInputs", { count: previousCount })}
          </span>
        </span>
      );
    };

    return (
      <div className="block-display-card">
        <div className="block-display-header">
          <span className="block-label">{t("tx.title")}</span>
          {isUnconfirmed ? (
            <span className="block-status-badge block-status-pending">{t("tx.inMempool")}</span>
          ) : (
            <span className="block-status-badge block-status-finalized">
              {t("tx.confirmations", { count: transaction.confirmations ?? 0 })}
              {showTooltips && (
                <HelperTooltip content={tTooltips("zcash.tx.confirmations")} placement="left" />
              )}
            </span>
          )}
        </div>

        <div className="tx-details">
          <div className="tx-row">
            <FieldLabel label={t("tx.txid")} tooltipKey="zcash.tx.txid" visibleFor={["beginner"]} />
            <span className="tx-value tx-mono zec-inline-copy">
              {transaction.txid}
              <CopyButton value={transaction.txid} />
            </span>
          </div>

          {transaction.blockhash && (
            <div className="tx-row">
              <FieldLabel label={t("tx.block")} />
              <span className="tx-value">
                <Link
                  to={`/${networkId}/block/${transaction.blockheight ?? transaction.blockhash}`}
                  className="link-accent"
                >
                  {transaction.blockheight !== undefined
                    ? `#${formatNumber(transaction.blockheight)}`
                    : truncateBlockHash(transaction.blockhash)}
                </Link>
              </span>
            </div>
          )}

          <div className="btc-tx-details-grid">
            <div className="btc-tx-details-column">
              <div className="tx-row">
                <FieldLabel
                  label={t("tx.kind")}
                  tooltipKey="zcash.tx.kind"
                  visibleFor={["beginner", "intermediate"]}
                />
                <span className="tx-value zec-kind-row">
                  <span className={`zec-kind-badge zec-kind-${kind}`}>
                    {t(TX_KIND_LABEL_KEYS[kind])}
                  </span>
                  {pools.map((pool) => (
                    <span key={pool} className={`zec-pool-chip zec-pool-${pool}`}>
                      {t(VALUE_POOL_LABEL_KEYS[pool])}
                    </span>
                  ))}
                </span>
              </div>

              {isUnconfirmed ? (
                <div className="tx-row">
                  <FieldLabel label={t("tx.status")} />
                  <span className="tx-value">
                    <span className="btc-mempool-status">{t("tx.waiting")}</span>
                  </span>
                </div>
              ) : (
                transaction.blocktime !== undefined && (
                  <>
                    <div className="tx-row">
                      <FieldLabel label={t("tx.time")} />
                      <span className="tx-value">{formatTimestamp(transaction.blocktime)}</span>
                    </div>
                    <div className="tx-row">
                      <FieldLabel label={t("tx.age")} />
                      <span className="tx-value">{timeAgo(transaction.blocktime)}</span>
                    </div>
                  </>
                )
              )}

              {hasTransparent && (
                <>
                  <div className="tx-row">
                    <FieldLabel
                      label={t("tx.transparentInputs")}
                      tooltipKey="zcash.tx.transparentInputs"
                      visibleFor={["beginner", "intermediate"]}
                    />
                    <span className="tx-value">
                      {transaction.vin.length}
                      {inputTotalZat !== null && inputTotalZat > 0 && (
                        <span className="btc-value-inline">
                          {" "}
                          ({formatZEC(inputTotalZat, currency)})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="tx-row">
                    <FieldLabel
                      label={t("tx.transparentOutputs")}
                      tooltipKey="zcash.tx.transparentOutputs"
                      visibleFor={["beginner", "intermediate"]}
                    />
                    <span className="tx-value">
                      {transaction.vout.length}
                      {outputTotalZat > 0 && (
                        <span className="btc-value-inline">
                          {" "}
                          ({formatZEC(outputTotalZat, currency)})
                        </span>
                      )}
                    </span>
                  </div>
                </>
              )}

              {!isCoinbase && (
                <div className="tx-row">
                  <FieldLabel
                    label={t("tx.fee")}
                    tooltipKey="zcash.tx.fee"
                    visibleFor={["beginner", "intermediate"]}
                  />
                  {renderFee()}
                </div>
              )}
            </div>

            <div className="btc-tx-details-column">
              <div className="tx-row">
                <FieldLabel
                  label={t("tx.size")}
                  tooltipKey="zcash.tx.size"
                  visibleFor={["beginner", "intermediate"]}
                />
                <span className="tx-value">{formatSize(transaction.size)}</span>
              </div>
              <div className="tx-row">
                <FieldLabel label={t("tx.version")} />
                <span className="tx-value">{transaction.version}</span>
              </div>
              {transaction.versionGroupId && (
                <div className="tx-row">
                  <FieldLabel
                    label={t("tx.versionGroupId")}
                    tooltipKey="zcash.tx.versionGroupId"
                    visibleFor={["beginner", "intermediate", "advanced"]}
                  />
                  <span className="tx-value tx-mono">{transaction.versionGroupId}</span>
                </div>
              )}
              {transaction.expiryHeight !== undefined && transaction.expiryHeight > 0 && (
                <div className="tx-row">
                  <FieldLabel
                    label={t("tx.expiryHeight")}
                    tooltipKey="zcash.tx.expiryHeight"
                    visibleFor={["beginner", "intermediate"]}
                  />
                  <span className="tx-value">{formatNumber(transaction.expiryHeight)}</span>
                </div>
              )}
              <div className="tx-row">
                <FieldLabel
                  label={t("tx.locktime")}
                  tooltipKey="zcash.tx.locktime"
                  visibleFor={["beginner", "intermediate", "advanced"]}
                />
                <span className="tx-value">{formatNumber(transaction.locktime)}</span>
              </div>
            </div>
          </div>
        </div>

        <ZcashShieldedBundles transaction={transaction} currency={currency} />

        {hasTransparent && (
          <div className="btc-io-columns">
            <div className="btc-io-column">
              <div className="btc-io-column-header">
                <span className="btc-io-column-title">
                  {t("tx.inputsColumn", { count: transaction.vin.length })}
                </span>
                {inputTotalZat !== null && inputTotalZat > 0 && (
                  <div className="btc-io-column-totals">
                    <span className="btc-io-column-total">
                      {formatZEC(inputTotalZat, currency)}
                    </span>
                  </div>
                )}
              </div>
              <div className="btc-io-column-content">
                {transaction.vin.length === 0 && (
                  <div className="btc-io-item text-muted">{t("tx.noTransparentInputs")}</div>
                )}
                {transaction.vin.map((input, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: inputs keep their on-chain order
                  <div key={index} className="btc-io-item">
                    <div className="btc-io-index">{index}</div>
                    <div className="btc-io-content">
                      {input.coinbase !== undefined ? (
                        <div className="btc-io-coinbase">{t("tx.newCoins")}</div>
                      ) : (
                        <>
                          <div className="btc-io-address">
                            {input.address ? (
                              <>
                                <Link
                                  to={`/${networkId}/address/${input.address}`}
                                  className="link-accent tx-mono"
                                >
                                  {input.address}
                                </Link>
                                <CopyButton value={input.address} />
                              </>
                            ) : (
                              <span className="tx-mono text-muted">{t("tx.unknownAddress")}</span>
                            )}
                          </div>
                          <div className="btc-io-details">
                            <span className="btc-io-value">
                              {input.valueZat !== undefined
                                ? formatZEC(input.valueZat, currency)
                                : t("tx.unknownValue")}
                            </span>
                            {input.txid && (
                              <span className="btc-io-txref">
                                <Link to={`/${networkId}/tx/${input.txid}`} className="link-accent">
                                  {t("tx.spends", {
                                    outpoint: `${truncateHash(input.txid, "short")}:${input.vout}`,
                                  })}
                                </Link>
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="btc-io-arrow">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <title>{t("tx.flowArrow")}</title>
                <path
                  d="M5 12h14M13 5l7 7-7 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="btc-io-column">
              <div className="btc-io-column-header">
                <span className="btc-io-column-title">
                  {t("tx.outputsColumn", { count: transaction.vout.length })}
                </span>
                {outputTotalZat > 0 && (
                  <div className="btc-io-column-totals">
                    <span className="btc-io-column-total">
                      {formatZEC(outputTotalZat, currency)}
                    </span>
                  </div>
                )}
              </div>
              <div className="btc-io-column-content">
                {transaction.vout.length === 0 && (
                  <div className="btc-io-item text-muted">{t("tx.noTransparentOutputs")}</div>
                )}
                {transaction.vout.map((output) => (
                  <div key={output.n} className="btc-io-item">
                    <div className="btc-io-index">{output.n}</div>
                    <div className="btc-io-content">
                      <div className="btc-io-address">
                        {output.address ? (
                          <>
                            <Link
                              to={`/${networkId}/address/${output.address}`}
                              className="link-accent tx-mono"
                            >
                              {output.address}
                            </Link>
                            <CopyButton value={output.address} />
                          </>
                        ) : (
                          <span className="tx-mono text-muted">{t("tx.nonStandard")}</span>
                        )}
                      </div>
                      <div className="btc-io-details">
                        <span className="btc-io-value tx-value-highlight">
                          {formatZEC(output.valueZat, currency)}
                        </span>
                        <span className="btc-io-type">{output.scriptType}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

ZcashTransactionDisplay.displayName = "ZcashTransactionDisplay";
export default ZcashTransactionDisplay;
