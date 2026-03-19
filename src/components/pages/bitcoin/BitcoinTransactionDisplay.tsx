import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useSettings } from "../../../context/SettingsContext";
import CopyButton from "../../common/CopyButton";
import FieldLabel from "../../common/FieldLabel";
import HelperTooltip from "../../common/HelperTooltip";
import { SATOSHIS_PER_BTC } from "../../../config/bitcoinConstants";
import { getNetworkById } from "../../../config/networks";
import type { BitcoinTransaction } from "../../../types";
import {
  formatBTC,
  formatTimeAgo,
  formatTimestamp,
  formatUSD,
  truncateBlockHash,
  truncateHash,
} from "../../../utils/bitcoinFormatters";
import {
  calculateTotalInput,
  calculateTotalOutput,
  decodeOpReturnData,
  hasWitness,
  isCoinbaseTransaction,
  isRBFEnabled,
} from "../../../utils/bitcoinUtils";
import AIAnalysisPanel from "../../common/AIAnalysis/AIAnalysisPanel";

const OpReturnDisplay: React.FC<{ hex: string }> = ({ hex }) => {
  const decoded = useMemo(() => decodeOpReturnData(hex), [hex]);
  return (
    <div className="btc-op-return">
      <span className="btc-op-return-label">OP_RETURN</span>
      {decoded.text ? (
        <span className="btc-op-return-text">{decoded.text}</span>
      ) : (
        <span className="btc-op-return-hex tx-mono">{decoded.hex}</span>
      )}
      <CopyButton value={decoded.text || decoded.hex} />
    </div>
  );
};

interface BitcoinTransactionDisplayProps {
  transaction: BitcoinTransaction;
  networkId?: string;
  btcPrice?: number | null;
}

const BitcoinTransactionDisplay: React.FC<BitcoinTransactionDisplayProps> = React.memo(
  ({ transaction, networkId, btcPrice }) => {
    const { t: tTooltips } = useTranslation("tooltips");
    const { settings } = useSettings();

    // Calculate totals
    const totalInput = calculateTotalInput(transaction);
    const totalOutput = calculateTotalOutput(transaction);
    const fee = transaction.fee ?? (totalInput > 0 ? totalInput - totalOutput : 0);

    const isCoinbase = isCoinbaseTransaction(transaction);

    // Calculate fee rates (in satoshis)
    const feeSats = fee * SATOSHIS_PER_BTC;
    const feePerByte = transaction.size > 0 ? feeSats / transaction.size : 0;
    const feePerVByte = transaction.vsize > 0 ? feeSats / transaction.vsize : 0;
    const feePerWU = transaction.weight > 0 ? feeSats / transaction.weight : 0;

    // Check for RBF and witness
    const rbfEnabled = isRBFEnabled(transaction.vin);
    const witnessEnabled = hasWitness(transaction);

    // Check if transaction is unconfirmed (in mempool)
    const isUnconfirmed = !transaction.blockhash || transaction.confirmations === 0;

    const network = networkId ? getNetworkById(networkId) : undefined;
    const networkName = network?.name ?? "Bitcoin Network";
    const networkCurrency = network?.currency ?? "BTC";

    const aiContext = useMemo(
      () => ({
        txid: transaction.txid,
        confirmations: transaction.confirmations,
        blockHash: transaction.blockhash,
        status: isUnconfirmed ? "unconfirmed (in mempool)" : "confirmed",
        isCoinbase,
        hasWitness: witnessEnabled,
        isRBF: rbfEnabled,
        version: transaction.version,
        locktime: transaction.locktime,
        sizeBytes: transaction.size,
        vsizeVB: transaction.vsize,
        weightWU: transaction.weight,
        totalInputBTC: totalInput > 0 ? totalInput : undefined,
        totalOutputBTC: totalOutput,
        feeBTC: !isCoinbase && fee > 0 ? fee : undefined,
        feeRateSatPerVB: !isCoinbase && fee > 0 ? Number(feePerVByte.toFixed(3)) : undefined,
        inputCount: transaction.vin.length,
        outputCount: transaction.vout.length,
        inputs: transaction.vin.map((input) => ({
          address: input.prevout?.scriptPubKey.address ?? null,
          valueBTC: input.prevout?.value ?? null,
          type: input.prevout?.scriptPubKey.type ?? null,
        })),
        outputs: transaction.vout.map((output) => ({
          address: output.scriptPubKey.address ?? null,
          valueBTC: output.value,
          type: output.scriptPubKey.type,
          n: output.n,
        })),
      }),
      [
        transaction,
        isUnconfirmed,
        isCoinbase,
        witnessEnabled,
        rbfEnabled,
        totalInput,
        totalOutput,
        fee,
        feePerVByte,
      ],
    );

    return (
      <div className="page-with-analysis">
        <div className="block-display-card">
          <div className="block-display-header">
            <span className="block-label">Transaction</span>
            {isUnconfirmed ? (
              <span className="block-status-badge block-status-pending">
                In Mempool (Unconfirmed)
              </span>
            ) : (
              transaction.confirmations !== undefined &&
              transaction.confirmations > 0 && (
                <span className="block-status-badge block-status-finalized">
                  {transaction.confirmations.toLocaleString()} Confirmations
                  {settings.showHelperTooltips !== false && (
                    <HelperTooltip content={tTooltips("bitcoin.confirmations")} />
                  )}
                </span>
              )
            )}
          </div>

          {/* Full-width rows for long values */}
          <div className="tx-details">
            <div className="tx-row">
              <FieldLabel
                label="Transaction ID:"
                tooltipKey="bitcoin.txid"
                visibleFor={["beginner"]}
              />
              <span
                className="tx-value tx-mono"
                style={{ display: "inline-flex", alignItems: "center" }}
              >
                {transaction.txid}
                <CopyButton value={transaction.txid} />
              </span>
            </div>

            {transaction.hash !== transaction.txid && (
              <div className="tx-row">
                <FieldLabel
                  label="Witness Hash:"
                  tooltipKey="bitcoin.witnessHash"
                  visibleFor={["beginner", "intermediate", "advanced"]}
                />
                <span
                  className="tx-value tx-mono"
                  style={{ display: "inline-flex", alignItems: "center" }}
                >
                  {transaction.hash}
                  <CopyButton value={transaction.hash} />
                </span>
              </div>
            )}

            {transaction.blockhash && (
              <div className="tx-row">
                <FieldLabel label="Block:" tooltipKey="bitcoin.block" visibleFor={["beginner"]} />
                <span className="tx-value tx-mono">
                  {networkId ? (
                    <Link
                      to={`/${networkId}/block/${transaction.blockhash}`}
                      className="link-accent"
                    >
                      {truncateBlockHash(transaction.blockhash)}
                    </Link>
                  ) : (
                    truncateBlockHash(transaction.blockhash)
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Two-column layout for transaction details */}
          <div className="btc-tx-details-grid">
            {/* Left Column */}
            <div className="btc-tx-details-column">
              {isUnconfirmed ? (
                <div className="tx-row">
                  <FieldLabel
                    label="Status:"
                    tooltipKey="bitcoin.status"
                    visibleFor={["beginner"]}
                  />
                  <span className="tx-value">
                    <span className="btc-mempool-status">Waiting for confirmation in mempool</span>
                  </span>
                </div>
              ) : (
                transaction.blocktime && (
                  <>
                    <div className="tx-row">
                      <FieldLabel label="Time:" />
                      <span className="tx-value">{formatTimestamp(transaction.blocktime)}</span>
                    </div>
                    <div className="tx-row">
                      <FieldLabel label="Age:" />
                      <span className="tx-value">{formatTimeAgo(transaction.blocktime)}</span>
                    </div>
                  </>
                )
              )}

              <div className="tx-row">
                <FieldLabel
                  label="Inputs:"
                  tooltipKey="bitcoin.inputs"
                  visibleFor={["beginner", "intermediate"]}
                />
                <span className="tx-value">
                  {transaction.vin.length}
                  {totalInput > 0 && (
                    <>
                      <span className="btc-value-inline"> ({formatBTC(totalInput)})</span>
                      {formatUSD(totalInput, btcPrice) && (
                        <span className="btc-usd-value">{formatUSD(totalInput, btcPrice)}</span>
                      )}
                    </>
                  )}
                </span>
              </div>
              <div className="tx-row">
                <FieldLabel
                  label="Outputs:"
                  tooltipKey="bitcoin.outputs"
                  visibleFor={["beginner", "intermediate"]}
                />
                <span className="tx-value">
                  {transaction.vout.length}
                  <span className="btc-value-inline"> ({formatBTC(totalOutput)})</span>
                  {formatUSD(totalOutput, btcPrice) && (
                    <span className="btc-usd-value">{formatUSD(totalOutput, btcPrice)}</span>
                  )}
                </span>
              </div>

              {!isCoinbase && fee > 0 && (
                <>
                  <div className="tx-row">
                    <FieldLabel
                      label="Fee:"
                      tooltipKey="bitcoin.fee"
                      visibleFor={["beginner", "intermediate"]}
                    />
                    <span className="tx-value tx-value-highlight">
                      {formatBTC(fee)}
                      {formatUSD(fee, btcPrice) && (
                        <span className="btc-usd-value">{formatUSD(fee, btcPrice)}</span>
                      )}
                    </span>
                  </div>
                  <div className="tx-row">
                    <FieldLabel
                      label="Fee/B:"
                      tooltipKey="bitcoin.feePerByte"
                      visibleFor={["beginner", "intermediate", "advanced"]}
                    />
                    <span className="tx-value">{feePerByte.toFixed(3)} sat/B</span>
                  </div>
                  <div className="tx-row">
                    <FieldLabel
                      label="Fee/vB:"
                      tooltipKey="bitcoin.feePerVByte"
                      visibleFor={["beginner", "intermediate"]}
                    />
                    <span className="tx-value">{feePerVByte.toFixed(3)} sat/vB</span>
                  </div>
                  <div className="tx-row">
                    <FieldLabel
                      label="Fee/WU:"
                      tooltipKey="bitcoin.feePerWU"
                      visibleFor={["beginner", "intermediate", "advanced"]}
                    />
                    <span className="tx-value">{feePerWU.toFixed(3)} sat/WU</span>
                  </div>
                </>
              )}

              <div className="tx-row">
                <FieldLabel
                  label="Coinbase:"
                  tooltipKey="bitcoin.coinbase"
                  visibleFor={["beginner"]}
                />
                <span className="tx-value">
                  {isCoinbase ? (
                    <span className="btc-flag-yes">Yes</span>
                  ) : (
                    <span className="btc-flag-no">No</span>
                  )}
                </span>
              </div>
              <div className="tx-row">
                <FieldLabel
                  label="Witness:"
                  tooltipKey="bitcoin.witness"
                  visibleFor={["beginner", "intermediate"]}
                />
                <span className="tx-value">
                  {witnessEnabled ? (
                    <span className="btc-flag-yes">Yes</span>
                  ) : (
                    <span className="btc-flag-no">No</span>
                  )}
                </span>
              </div>
            </div>

            {/* Right Column */}
            <div className="btc-tx-details-column">
              <div className="tx-row">
                <FieldLabel
                  label="Size:"
                  tooltipKey="bitcoin.size"
                  visibleFor={["beginner", "intermediate"]}
                />
                <span className="tx-value">{transaction.size.toLocaleString()} bytes</span>
              </div>
              {transaction.vsize !== transaction.size && (
                <div className="tx-row">
                  <FieldLabel
                    label="Virtual Size:"
                    tooltipKey="bitcoin.virtualSize"
                    visibleFor={["beginner", "intermediate"]}
                  />
                  <span className="tx-value">{transaction.vsize.toLocaleString()} vB</span>
                </div>
              )}
              <div className="tx-row">
                <FieldLabel
                  label="Weight:"
                  tooltipKey="bitcoin.weight"
                  visibleFor={["beginner", "intermediate", "advanced"]}
                />
                <span className="tx-value">{transaction.weight.toLocaleString()} WU</span>
              </div>

              <div className="tx-row">
                <FieldLabel
                  label="RBF:"
                  tooltipKey="bitcoin.rbf"
                  visibleFor={["beginner", "intermediate"]}
                />
                <span className="tx-value">
                  {rbfEnabled ? (
                    <span className="btc-flag-yes">Yes</span>
                  ) : (
                    <span className="btc-flag-no">No</span>
                  )}
                </span>
              </div>

              <div className="tx-row">
                <FieldLabel
                  label="Version:"
                  tooltipKey="bitcoin.version"
                  visibleFor={["beginner", "intermediate", "advanced"]}
                />
                <span className="tx-value">{transaction.version}</span>
              </div>
              <div className="tx-row">
                <FieldLabel
                  label="Locktime:"
                  tooltipKey="bitcoin.locktime"
                  visibleFor={["beginner", "intermediate", "advanced"]}
                />
                <span className="tx-value">{transaction.locktime.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Inputs and Outputs - Two Column Layout */}
          <div className="btc-io-columns">
            {/* Inputs Column */}
            <div className="btc-io-column">
              <div className="btc-io-column-header">
                <span className="btc-io-column-title">
                  Inputs ({transaction.vin.length})
                  {settings.showHelperTooltips !== false && (
                    <HelperTooltip content={tTooltips("bitcoin.inputsColumn")} />
                  )}
                </span>
                {totalInput > 0 && (
                  <div className="btc-io-column-totals">
                    <span className="btc-io-column-total">{formatBTC(totalInput)}</span>
                    {formatUSD(totalInput, btcPrice) && (
                      <span className="btc-io-column-usd">{formatUSD(totalInput, btcPrice)}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="btc-io-column-content">
                {transaction.vin.map((input, index) => (
                  <div key={`${input.txid}-${input.vout}-${index}`} className="btc-io-item">
                    <div className="btc-io-index">{index}</div>
                    <div className="btc-io-content">
                      {isCoinbase && index === 0 ? (
                        <div className="btc-io-coinbase">Newly Generated Coins</div>
                      ) : (
                        <>
                          <div className="btc-io-address">
                            {input.prevout?.scriptPubKey.address ? (
                              <>
                                {networkId ? (
                                  <Link
                                    to={`/${networkId}/address/${input.prevout.scriptPubKey.address}`}
                                    className="link-accent tx-mono"
                                  >
                                    {input.prevout.scriptPubKey.address}
                                  </Link>
                                ) : (
                                  <span className="tx-mono">
                                    {input.prevout.scriptPubKey.address}
                                  </span>
                                )}
                                <CopyButton value={input.prevout.scriptPubKey.address} />
                              </>
                            ) : (
                              <span className="tx-mono text-muted">Unknown</span>
                            )}
                          </div>
                          <div className="btc-io-details">
                            <div className="btc-io-value-group">
                              <span className="btc-io-value">
                                {input.prevout?.value !== undefined
                                  ? formatBTC(input.prevout.value)
                                  : "Unknown"}
                              </span>
                              {input.prevout?.value !== undefined &&
                                formatUSD(input.prevout.value, btcPrice) && (
                                  <span className="btc-io-usd">
                                    {formatUSD(input.prevout.value, btcPrice)}
                                  </span>
                                )}
                            </div>
                            <span className="btc-io-txref">
                              from{" "}
                              {networkId && input.txid ? (
                                <Link to={`/${networkId}/tx/${input.txid}`} className="link-accent">
                                  {truncateHash(input.txid, "short")}:{input.vout}
                                </Link>
                              ) : (
                                `${truncateHash(input.txid || "", "short")}:${input.vout}`
                              )}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Arrow between columns */}
            <div className="btc-io-arrow">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <title>Flow arrow</title>
                <path
                  d="M5 12h14M13 5l7 7-7 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Outputs Column */}
            <div className="btc-io-column">
              <div className="btc-io-column-header">
                <span className="btc-io-column-title">
                  Outputs ({transaction.vout.length})
                  {settings.showHelperTooltips !== false && (
                    <HelperTooltip content={tTooltips("bitcoin.outputsColumn")} />
                  )}
                </span>
                <div className="btc-io-column-totals">
                  <span className="btc-io-column-total">{formatBTC(totalOutput)}</span>
                  {formatUSD(totalOutput, btcPrice) && (
                    <span className="btc-io-column-usd">{formatUSD(totalOutput, btcPrice)}</span>
                  )}
                </div>
              </div>
              <div className="btc-io-column-content">
                {transaction.vout.map((output) => (
                  <div key={`${output.n}`} className="btc-io-item">
                    <div className="btc-io-index">{output.n}</div>
                    <div className="btc-io-content">
                      <div className="btc-io-address">
                        {output.scriptPubKey.address ? (
                          <>
                            {networkId ? (
                              <Link
                                to={`/${networkId}/address/${output.scriptPubKey.address}`}
                                className="link-accent tx-mono"
                              >
                                {output.scriptPubKey.address}
                              </Link>
                            ) : (
                              <span className="tx-mono">{output.scriptPubKey.address}</span>
                            )}
                            <CopyButton value={output.scriptPubKey.address} />
                          </>
                        ) : output.scriptPubKey.type === "nulldata" ? (
                          <OpReturnDisplay hex={output.scriptPubKey.hex} />
                        ) : (
                          <span className="tx-mono text-muted">{output.scriptPubKey.type}</span>
                        )}
                      </div>
                      <div className="btc-io-details">
                        <div className="btc-io-value-group">
                          <span className="btc-io-value tx-value-highlight">
                            {formatBTC(output.value)}
                          </span>
                          {formatUSD(output.value, btcPrice) && (
                            <span className="btc-io-usd">{formatUSD(output.value, btcPrice)}</span>
                          )}
                        </div>
                        <span className="btc-io-type">{output.scriptPubKey.type}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <AIAnalysisPanel
          analysisType="bitcoin_transaction"
          context={aiContext}
          networkName={networkName}
          networkCurrency={networkCurrency}
          cacheKey={`openscan_ai_bitcoin_transaction_${networkId}_${transaction.txid}`}
        />
      </div>
    );
  },
);

BitcoinTransactionDisplay.displayName = "BitcoinTransactionDisplay";
export default BitcoinTransactionDisplay;
