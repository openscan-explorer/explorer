import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { BitcoinBlock } from "../../../types";
import { getNetworkById } from "../../../config/networks";
import { useSettings } from "../../../context/SettingsContext";
import {
  formatBTC,
  formatDifficulty,
  formatSize,
  formatTimeAgo,
  formatTimestamp,
  truncateBlockHash,
} from "../../../utils/bitcoinFormatters";
import AIAnalysisPanel from "../../common/AIAnalysis/AIAnalysisPanel";
import CopyButton from "../../common/CopyButton";
import FieldLabel from "../../common/FieldLabel";
import HelperTooltip from "../../common/HelperTooltip";

interface BitcoinBlockDisplayProps {
  block: BitcoinBlock;
  networkId?: string;
}

const BitcoinBlockDisplay: React.FC<BitcoinBlockDisplayProps> = React.memo(
  ({ block, networkId }) => {
    const [showMoreDetails, setShowMoreDetails] = useState(false);
    const [showTransactions, setShowTransactions] = useState(false);
    const { t: tTooltips } = useTranslation("tooltips");
    const { settings } = useSettings();

    const network = networkId ? getNetworkById(networkId) : undefined;
    const networkName = network?.name ?? "Bitcoin Network";
    const networkCurrency = network?.currency ?? "BTC";

    const aiContext = useMemo(
      () => ({
        height: block.height,
        hash: block.hash,
        time: block.time,
        confirmations: block.confirmations,
        transactionCount: block.nTx,
        sizeBytes: block.size,
        weightWU: block.weight,
        difficulty: block.difficulty,
        miner: block.miner,
        coinbaseMessage: block.coinbaseMessage,
        blockRewardBTC: block.blockReward,
        totalFeesBTC: block.totalFees,
        totalOutputBTC: block.totalOutputValue,
        feeRateAvgSatPerVB: block.feeRateAvg,
        feeRateMedianSatPerVB: block.feeRateMedian,
        inputCount: block.inputCount,
        outputCount: block.outputCount,
      }),
      [block],
    );

    return (
      <div className="page-with-analysis">
        <div className="block-display-card">
          <div className="block-display-header">
            <div className="block-header-main">
              {networkId && block.height > 0 && (
                <Link
                  to={`/${networkId}/block/${block.height - 1}`}
                  className="block-nav-btn"
                  title="Previous block"
                >
                  ←
                </Link>
              )}
              <div className="block-header-info">
                <span className="block-label">Block</span>
                <span className="block-number">#{block.height.toLocaleString()}</span>
              </div>
              {networkId && block.nextBlockHash && (
                <Link
                  to={`/${networkId}/block/${block.height + 1}`}
                  className="block-nav-btn"
                  title="Next block"
                >
                  →
                </Link>
              )}
              <span className="block-header-divider">•</span>
              <span className="block-header-timestamp">
                <span className="block-timestamp-age">{formatTimeAgo(block.time, true)}</span>
                <span className="block-timestamp-full">({formatTimestamp(block.time)})</span>
              </span>
            </div>
            {block.confirmations !== undefined && (
              <span className="block-status-badge block-status-finalized">
                {block.confirmations.toLocaleString()} Confirmations
                {settings.showHelperTooltips !== false && (
                  <HelperTooltip
                    content={tTooltips("bitcoin.blockConfirmations")}
                    placement="left"
                  />
                )}
              </span>
            )}
          </div>

          <div className="tx-details">
            {/* Block Hash */}
            <div className="tx-row">
              <FieldLabel
                label="Block Hash:"
                tooltipKey="bitcoin.blockHash"
                visibleFor={["beginner"]}
              />
              <span
                className="tx-value tx-mono"
                style={{ display: "inline-flex", alignItems: "center" }}
              >
                {block.hash}
                <CopyButton value={block.hash} />
              </span>
            </div>

            {/* Miner */}
            {block.miner && (
              <div className="tx-row">
                <FieldLabel
                  label="Mined by:"
                  tooltipKey="bitcoin.minedBy"
                  visibleFor={["beginner"]}
                />
                <span className="tx-value">{block.miner}</span>
              </div>
            )}

            <div className="btc-tx-details-grid">
              {/* Left Column */}
              <div className="btc-tx-details-column">
                {/* Block Reward */}
                {block.blockReward !== undefined && (
                  <div className="tx-row">
                    <FieldLabel
                      label="Block Reward:"
                      tooltipKey="bitcoin.blockReward"
                      visibleFor={["beginner", "intermediate"]}
                    />
                    <span className="tx-value tx-value-highlight">
                      {formatBTC(block.blockReward)}
                    </span>
                  </div>
                )}

                {/* Total Fees */}
                {block.totalFees !== undefined && (
                  <div className="tx-row">
                    <FieldLabel
                      label="Total Fees:"
                      tooltipKey="bitcoin.totalFees"
                      visibleFor={["beginner", "intermediate"]}
                    />
                    <span className="tx-value">{formatBTC(block.totalFees)}</span>
                  </div>
                )}

                {/* Fee Rate Stats */}
                {block.feeRateAvg !== undefined && block.feeRateMedian !== undefined && (
                  <div className="tx-row">
                    <FieldLabel
                      label="Fee Rate:"
                      tooltipKey="bitcoin.feeRate"
                      visibleFor={["beginner", "intermediate"]}
                    />
                    <span className="tx-value">
                      Avg: {block.feeRateAvg.toFixed(2)} sat/vB | Median:{" "}
                      {block.feeRateMedian.toFixed(2)} sat/vB
                    </span>
                  </div>
                )}

                {/* Transactions */}
                <div className="tx-row">
                  <FieldLabel
                    label="Transactions:"
                    tooltipKey="bitcoin.transactions"
                    visibleFor={["beginner"]}
                  />
                  <span className="tx-value">
                    <span className="tx-value-highlight">{block.nTx.toLocaleString()}</span>{" "}
                    transactions
                    {block.inputCount !== undefined && block.outputCount !== undefined && (
                      <span className="btc-io-counts">
                        {" "}
                        ({block.inputCount.toLocaleString()} inputs,{" "}
                        {block.outputCount.toLocaleString()} outputs)
                      </span>
                    )}
                  </span>
                </div>

                {/* Total Output Value */}
                {block.totalOutputValue !== undefined && (
                  <div className="tx-row">
                    <FieldLabel
                      label="Total Output:"
                      tooltipKey="bitcoin.totalOutput"
                      visibleFor={["beginner"]}
                    />
                    <span className="tx-value">{formatBTC(block.totalOutputValue)}</span>
                  </div>
                )}
              </div>
              {/* Right Column */}
              <div className="btc-tx-details-column">
                {/* Difficulty */}
                {block.difficulty !== undefined && (
                  <div className="tx-row">
                    <FieldLabel
                      label="Difficulty:"
                      tooltipKey="bitcoin.difficulty"
                      visibleFor={["beginner", "intermediate"]}
                    />
                    <span className="tx-value">{formatDifficulty(block.difficulty)}</span>
                  </div>
                )}

                {/* Size */}
                <div className="tx-row">
                  <FieldLabel
                    label="Size:"
                    tooltipKey="bitcoin.blockSize"
                    visibleFor={["beginner"]}
                  />
                  <span className="tx-value">{formatSize(block.size)}</span>
                </div>

                {/* Weight */}
                <div className="tx-row">
                  <FieldLabel
                    label="Weight:"
                    tooltipKey="bitcoin.blockWeight"
                    visibleFor={["beginner", "intermediate", "advanced"]}
                  />
                  <span className="tx-value">{block.weight.toLocaleString()} WU</span>
                </div>

                {/* Previous Block */}
                {block.previousBlockHash && (
                  <div className="tx-row">
                    <FieldLabel
                      label="Previous Block:"
                      tooltipKey="bitcoin.previousBlock"
                      visibleFor={["beginner"]}
                    />
                    <span className="tx-value tx-mono">
                      {networkId ? (
                        <Link
                          to={`/${networkId}/block/${block.height - 1}`}
                          className="link-accent"
                        >
                          {truncateBlockHash(block.previousBlockHash)}
                        </Link>
                      ) : (
                        truncateBlockHash(block.previousBlockHash)
                      )}
                    </span>
                  </div>
                )}

                {/* Next Block */}
                {block.nextBlockHash && (
                  <div className="tx-row">
                    <FieldLabel
                      label="Next Block:"
                      tooltipKey="bitcoin.nextBlock"
                      visibleFor={["beginner"]}
                    />
                    <span className="tx-value tx-mono">
                      {networkId ? (
                        <Link
                          to={`/${networkId}/block/${block.height + 1}`}
                          className="link-accent"
                        >
                          {truncateBlockHash(block.nextBlockHash)}
                        </Link>
                      ) : (
                        truncateBlockHash(block.nextBlockHash)
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Coinbase Message */}
            {block.coinbaseMessage && (
              <div className="tx-row">
                <FieldLabel
                  label="Coinbase Message:"
                  tooltipKey="bitcoin.coinbaseMessage"
                  visibleFor={["beginner", "intermediate"]}
                />
                <span className="tx-value">
                  <span className="btc-coinbase-message">{block.coinbaseMessage}</span>
                </span>
              </div>
            )}

            {/* More Details Toggle */}
            <div className="tx-row tx-row-vertical">
              <button
                type="button"
                className="more-details-toggle"
                onClick={() => setShowMoreDetails(!showMoreDetails)}
              >
                {showMoreDetails ? "− Hide" : "+ Show"} More Details
              </button>

              {showMoreDetails && (
                <div className="more-details-content">
                  <div className="detail-row">
                    <span className="detail-label">
                      Merkle Root:
                      {settings.showHelperTooltips !== false && (
                        <HelperTooltip content={tTooltips("bitcoin.merkleRoot")} />
                      )}
                    </span>
                    <span className="detail-value tx-mono">{block.merkleRoot}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">
                      Version:
                      {settings.showHelperTooltips !== false && (
                        <HelperTooltip content={tTooltips("bitcoin.blockVersion")} />
                      )}
                    </span>
                    <span className="detail-value">0x{block.version.toString(16)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">
                      Bits:
                      {settings.showHelperTooltips !== false && (
                        <HelperTooltip content={tTooltips("bitcoin.bits")} />
                      )}
                    </span>
                    <span className="detail-value tx-mono">{block.bits}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">
                      Nonce:
                      {settings.showHelperTooltips !== false && (
                        <HelperTooltip content={tTooltips("bitcoin.blockNonce")} />
                      )}
                    </span>
                    <span className="detail-value">{block.nonce.toLocaleString()}</span>
                  </div>
                  {block.coinbaseHex && (
                    <div className="detail-row">
                      <span className="detail-label">
                        Coinbase (hex):
                        {settings.showHelperTooltips !== false && (
                          <HelperTooltip content={tTooltips("bitcoin.coinbaseHex")} />
                        )}
                      </span>
                      <span className="detail-value tx-mono btc-coinbase-hex">
                        {block.coinbaseHex}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Transactions List */}
            {block.txids && block.txids.length > 0 && (
              <div className="tx-row tx-row-vertical">
                <button
                  type="button"
                  className="more-details-toggle"
                  onClick={() => setShowTransactions(!showTransactions)}
                >
                  {showTransactions ? "− Hide" : "+ Show"} Transactions ({block.txids.length})
                </button>

                {showTransactions && (
                  <div className="more-details-content">
                    <div className="btc-block-txs">
                      {block.txids.map((txid, index) => (
                        <div key={txid} className="btc-block-tx-item">
                          <span className="btc-block-tx-index">{index}</span>
                          <span className="btc-block-tx-hash tx-mono">
                            {networkId ? (
                              <Link to={`/${networkId}/tx/${txid}`} className="link-accent">
                                {txid}
                              </Link>
                            ) : (
                              txid
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <AIAnalysisPanel
          analysisType="bitcoin_block"
          context={aiContext}
          networkName={networkName}
          networkCurrency={networkCurrency}
          cacheKey={`openscan_ai_bitcoin_block_${networkId}_${block.hash}`}
        />
      </div>
    );
  },
);

BitcoinBlockDisplay.displayName = "BitcoinBlockDisplay";
export default BitcoinBlockDisplay;
