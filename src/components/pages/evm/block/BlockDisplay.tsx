import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getNetworkById } from "../../../../config/networks";
import { useSettings } from "../../../../context/SettingsContext";
import type { Block, BlockArbitrum, RPCMetadata } from "../../../../types";
import AIAnalysisPanel from "../../../common/AIAnalysis/AIAnalysisPanel";
import ExtraDataDisplay from "../../../common/ExtraDataDisplay";
import LongString from "../../../common/LongString";
import { RPCIndicator } from "../../../common/RPCIndicator";
import { formatGweiFromWei, formatNativeFromWei } from "../../../../utils/unitFormatters";
import BlockAnalyser from "./BlockAnalyser";

interface BlockDisplayProps {
  block: Block | BlockArbitrum;
  networkId?: string;
  metadata?: RPCMetadata;
  selectedProvider?: string | null;
  onProviderSelect?: (provider: string) => void;
}

const BlockDisplay: React.FC<BlockDisplayProps> = React.memo(
  ({ block, networkId, metadata, selectedProvider, onProviderSelect }) => {
    const { t } = useTranslation("block");
    const { isSuperUser } = useSettings();
    const network = networkId ? getNetworkById(networkId) : undefined;
    const networkName = network?.name ?? "Unknown Network";
    const networkCurrency = network?.currency ?? "ETH";

    // Check if this is an Arbitrum block
    const isArbitrumBlock = (block: Block | BlockArbitrum): block is BlockArbitrum => {
      return "l1BlockNumber" in block;
    };

    // Helper to format timestamp
    const formatTimestamp = (timestamp: string) => {
      try {
        const ts = Number(timestamp);
        const date = new Date(ts * 1000);
        return new Intl.DateTimeFormat(undefined, {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZoneName: "short",
        }).format(date);
      } catch (_e) {
        return timestamp;
      }
    };

    const formatTimeAgo = (timestamp: string) => {
      const ts = Number(timestamp) * 1000;
      const diffMs = Date.now() - ts;
      const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);

      if (diffSeconds < 5) {
        return diffMs >= 0 ? t("time.justNow") : t("time.inFewSeconds");
      }

      const units = [
        { key: "day", seconds: 60 * 60 * 24 },
        { key: "hour", seconds: 60 * 60 },
        { key: "minute", seconds: 60 },
      ] as const;

      for (const unit of units) {
        if (diffSeconds >= unit.seconds) {
          const value = Math.floor(diffSeconds / unit.seconds);
          const unitLabel = t(`time.${unit.key}`, { count: value });

          return diffMs >= 0
            ? t("time.ago", { count: value, unit: unitLabel })
            : t("time.in", { count: value, unit: unitLabel });
        }
      }

      const unitLabel = t("time.second", { count: diffSeconds });

      return diffMs >= 0
        ? t("time.ago", { count: diffSeconds, unit: unitLabel })
        : t("time.in", { count: diffSeconds, unit: unitLabel });
    };

    const formatGwei = (value: string) => formatGweiFromWei(value, 9) ?? value;
    const formatNative = (value: string) =>
      formatNativeFromWei(value, networkCurrency, 12) ?? value;

    const blockNumber = Number(block.number);
    const timestampFormatted = formatTimestamp(block.timestamp);
    const timestampAge = formatTimeAgo(block.timestamp);
    const gasUsedPct = ((Number(block.gasUsed) / Number(block.gasLimit)) * 100).toFixed(1);

    // Calculate burnt fees if baseFeePerGas exists
    const burntFees = block.baseFeePerGas
      ? (BigInt(block.gasUsed) * BigInt(block.baseFeePerGas)).toString()
      : null;
    const baseFeePerGasGwei = block.baseFeePerGas ? formatGwei(block.baseFeePerGas) : undefined;
    const burntFeesNative = burntFees ? formatNative(burntFees) : undefined;

    const aiContext = useMemo(() => {
      const ctx: Record<string, unknown> = {
        blockNumber: block.number,
        hash: block.hash,
        timestamp: block.timestamp,
        finalized: true,
        transactionCount: block.transactions?.length ?? 0,
        feeRecipient: block.miner,
        gasUsed: block.gasUsed,
        gasLimit: block.gasLimit,
        gasUsedPercentage: gasUsedPct,
        baseFeePerGasGwei,
        burntFeesNative,
        size: block.size,
        extraData: block.extraData !== "0x" ? block.extraData : undefined,
      };
      if ("l1BlockNumber" in block) {
        ctx.l1BlockNumber = (block as BlockArbitrum).l1BlockNumber;
        ctx.sendCount = (block as BlockArbitrum).sendCount;
      }
      return ctx;
    }, [block, gasUsedPct, baseFeePerGasGwei, burntFeesNative]);

    return (
      <div className="page-with-analysis">
        <div className="block-display-card">
          <div className="block-display-header">
            <div className="block-header-main">
              {networkId && blockNumber > 0 && (
                <Link
                  to={`/${networkId}/block/${blockNumber - 1}`}
                  className="block-nav-btn"
                  title={t("previousBlock")}
                >
                  ←
                </Link>
              )}
              <div className="block-header-info">
                <span className="block-label">{t("block")}</span>
                <span className="block-number">#{blockNumber.toLocaleString()}</span>
              </div>
              {networkId && (
                <Link
                  to={`/${networkId}/block/${blockNumber + 1}`}
                  className="block-nav-btn"
                  title={t("nextBlock")}
                >
                  →
                </Link>
              )}
              <span className="block-header-divider">•</span>
              <span className="block-header-timestamp">
                <span className="block-timestamp-age">{timestampAge}</span>
                <span className="block-timestamp-full">({timestampFormatted})</span>
              </span>
              <span className="block-header-divider">•</span>
              <span className="block-status-badge block-status-finalized">{t("finalized")}</span>
            </div>
            {metadata && selectedProvider !== undefined && onProviderSelect && (
              <RPCIndicator
                metadata={metadata}
                selectedProvider={selectedProvider}
                onProviderSelect={onProviderSelect}
              />
            )}
          </div>

          <div className="tx-details">
            {/* Full-width: Block Hash */}
            <div className="tx-row">
              <span className="tx-label">Hash:</span>
              <span className="tx-value tx-mono">
                <LongString value={block.hash} start={20} end={16} />
              </span>
            </div>

            {/* Two-column grid for block details */}
            <div className="tx-details-grid">
              {/* Left Column */}
              <div className="tx-details-column">
                {/* Transactions */}
                <div className="tx-row">
                  <span className="tx-label">{t("transactions")}</span>
                  <span className="tx-value">
                    <span className="tx-value-highlight">
                      {block.transactions ? block.transactions.length : 0} {t("transactions")}
                    </span>{" "}
                    {t("inThisBlock")}
                  </span>
                </div>

                {/* Withdrawals count */}
                {block.withdrawals && block.withdrawals.length > 0 && (
                  <div className="tx-row">
                    <span className="tx-label">{t("withdrawals")}</span>
                    <span className="tx-value">
                      {block.withdrawals.length}{" "}
                      {block.withdrawals.length !== 1 ? t("withdrawalsPlural") : t("withdrawal")}{" "}
                      {t("inThisBlock")}
                    </span>
                  </div>
                )}

                {/* Fee Recipient (Miner) */}
                <div className="tx-row">
                  <span className="tx-label">{t("feeRecipient")}</span>
                  <span className="tx-value tx-mono">
                    {networkId ? (
                      <Link to={`/${networkId}/address/${block.miner}`} className="link-accent">
                        {block.miner}
                      </Link>
                    ) : (
                      block.miner
                    )}
                  </span>
                </div>

                {/* Difficulty */}
                {Number(block.difficulty) > 0 && (
                  <div className="tx-row">
                    <span className="tx-label">{t("difficulty")}:</span>
                    <span className="tx-value">{Number(block.difficulty).toLocaleString()}</span>
                  </div>
                )}

                {/* Total Difficulty */}
                {Number(block.totalDifficulty) > 0 && (
                  <div className="tx-row">
                    <span className="tx-label">{t("totalDifficulty")}:</span>
                    <span className="tx-value">
                      {Number(block.totalDifficulty).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Size */}
                <div className="tx-row">
                  <span className="tx-label">{t("size")}:</span>
                  <span className="tx-value">{Number(block.size).toLocaleString()} bytes</span>
                </div>

                {/* Extra Data */}
                {block.extraData && block.extraData !== "0x" && (
                  <div className="tx-row">
                    <span className="tx-label">{t("extraData")}:</span>
                    <span className="tx-value">
                      <ExtraDataDisplay hexData={block.extraData} />
                    </span>
                  </div>
                )}

                {/* Blob Gas Used (EIP-4844) */}
                {block.blobGasUsed && Number(block.blobGasUsed) > 0 && (
                  <div className="tx-row tx-row-blob">
                    <span className="tx-label">{t("blobGasUsed")}</span>
                    <span className="tx-value">{Number(block.blobGasUsed).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="tx-details-column">
                {/* Gas Used */}
                <div className="tx-row">
                  <span className="tx-label">{t("gasUsed")}</span>
                  <span className="tx-value">
                    {Number(block.gasUsed).toLocaleString()}
                    <span className="tx-gas-pct"> ({gasUsedPct}%)</span>
                  </span>
                </div>

                {/* Gas Limit */}
                <div className="tx-row">
                  <span className="tx-label">{t("gasLimit")}</span>
                  <span className="tx-value">{Number(block.gasLimit).toLocaleString()}</span>
                </div>

                {/* Base Fee Per Gas */}
                {block.baseFeePerGas && (
                  <div className="tx-row">
                    <span className="tx-label">{t("baseFeePerGas")}</span>
                    <span className="tx-value">{formatGwei(block.baseFeePerGas)}</span>
                  </div>
                )}

                {/* Burnt Fees */}
                {burntFees && (
                  <div className="tx-row">
                    <span className="tx-label">{t("burntFees")}:</span>
                    <span className="tx-value">
                      <span className="burnt-fees">🔥 {formatNative(burntFees)}</span>
                    </span>
                  </div>
                )}

                {/* Blob fields continued (EIP-4844) */}
                {block.blobGasUsed && Number(block.blobGasUsed) > 0 && (
                  <>
                    <div className="tx-row tx-row-blob">
                      <span className="tx-label">{t("excessBlobGas")}</span>
                      <span className="tx-value">
                        {Number(block.excessBlobGas).toLocaleString()}
                      </span>
                    </div>
                    <div className="tx-row tx-row-blob">
                      <span className="tx-label">{t("blobCount")}</span>
                      <span className="tx-value">
                        {Math.floor(Number(block.blobGasUsed) / 131072)}
                      </span>
                    </div>
                  </>
                )}

                {/* Arbitrum-specific fields */}
                {isArbitrumBlock(block) && (
                  <>
                    <div className="tx-row tx-row-arbitrum">
                      <span className="tx-label">{t("l1BlockNumber")}:</span>
                      <span className="tx-value">
                        {Number(block.l1BlockNumber).toLocaleString()}
                      </span>
                    </div>
                    <div className="tx-row tx-row-arbitrum">
                      <span className="tx-label">{t("sendCount")}:</span>
                      <span className="tx-value">{block.sendCount}</span>
                    </div>
                    <div className="tx-row tx-row-arbitrum">
                      <span className="tx-label">{t("sendRoot")}:</span>
                      <span className="tx-value tx-mono">{block.sendRoot}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <BlockAnalyser block={block} networkId={networkId} isSuperUser={isSuperUser} />
        </div>
        <AIAnalysisPanel
          analysisType="block"
          context={aiContext}
          networkName={networkName}
          networkCurrency={networkCurrency}
          cacheKey={`openscan_ai_block_${networkId}_${block.number}`}
        />
      </div>
    );
  },
);

BlockDisplay.displayName = "BlockDisplay";

export default BlockDisplay;
