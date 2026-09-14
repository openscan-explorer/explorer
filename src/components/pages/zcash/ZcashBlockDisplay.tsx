import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useSettings } from "../../../context/SettingsContext";
import { useZcashTimeAgo } from "../../../hooks/useZcashTimeAgo";
import type { ZcashBlock, ZcashShieldedPool } from "../../../types";
import {
  formatDifficulty,
  formatNumber,
  formatSize,
  formatTimestamp,
  formatZEC,
  truncateBlockHash,
} from "../../../utils/zcashFormatters";
import CopyButton from "../../common/CopyButton";
import FieldLabel from "../../common/FieldLabel";
import HelperTooltip from "../../common/HelperTooltip";
import ZcashValuePools from "./ZcashValuePools";

const SHIELDED_POOLS: ZcashShieldedPool[] = ["sprout", "sapling", "orchard", "ironwood"];
const TREE_POOLS = ["sapling", "orchard", "ironwood"] as const;

const POOL_NAME_KEYS = {
  sprout: "valuePools.pools.sprout",
  sapling: "valuePools.pools.sapling",
  orchard: "valuePools.pools.orchard",
  ironwood: "valuePools.pools.ironwood",
} as const satisfies Record<ZcashShieldedPool, string>;

interface DetailRowProps {
  label: string;
  tooltip?: string;
  mono?: boolean;
  children: React.ReactNode;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, tooltip, mono, children }) => (
  <div className="detail-row">
    <span className="detail-label">
      {label}
      {tooltip && <HelperTooltip content={tooltip} />}
    </span>
    <span className={mono ? "detail-value tx-mono" : "detail-value"}>{children}</span>
  </div>
);

interface ZcashBlockDisplayProps {
  block: ZcashBlock;
  networkId: string;
  currency: string;
}

const ZcashBlockDisplay: React.FC<ZcashBlockDisplayProps> = React.memo(
  ({ block, networkId, currency }) => {
    const { t } = useTranslation("zcash");
    const { t: tTooltips } = useTranslation("tooltips");
    const { settings } = useSettings();
    const timeAgo = useZcashTimeAgo();
    const [showMoreDetails, setShowMoreDetails] = useState(false);
    const [showTransactions, setShowTransactions] = useState(false);
    const showTooltips = settings.showHelperTooltips !== false;

    const coinbaseOutputs = block.coinbaseOutputs ?? [];
    const rewardZat = coinbaseOutputs.reduce((sum, output) => sum + output.valueZat, 0);
    const txids = block.txids ?? [];
    const poolCounts = SHIELDED_POOLS.flatMap((pool) => {
      const count = block.shieldedTxCounts?.[pool];
      return count ? [{ pool, count }] : [];
    });
    const treeSizes = TREE_POOLS.flatMap((pool) => {
      const size = block.trees?.[pool];
      return size === undefined
        ? []
        : [t("block.treeSize", { pool: t(POOL_NAME_KEYS[pool]), size: formatNumber(size) })];
    });

    return (
      <div className="block-display-card">
        <div className="block-display-header">
          <div className="block-header-main">
            {block.height > 0 && (
              <Link
                to={`/${networkId}/block/${block.height - 1}`}
                className="block-nav-btn"
                title={t("block.previousBlock")}
              >
                ←
              </Link>
            )}
            <div className="block-header-info">
              <span className="block-label">{t("block.title")}</span>
              <span className="block-number">#{block.height.toLocaleString()}</span>
            </div>
            {block.nextBlockHash && (
              <Link
                to={`/${networkId}/block/${block.height + 1}`}
                className="block-nav-btn"
                title={t("block.nextBlock")}
              >
                →
              </Link>
            )}
            <span className="block-header-divider">•</span>
            <span className="block-header-timestamp">
              <span className="block-timestamp-age">{timeAgo(block.time)}</span>
              <span className="block-timestamp-full">({formatTimestamp(block.time)})</span>
            </span>
          </div>
          {block.confirmations !== undefined && (
            <span className="block-status-badge block-status-finalized">
              {t("block.confirmations", { count: block.confirmations })}
              {showTooltips && (
                <HelperTooltip content={tTooltips("zcash.block.confirmations")} placement="left" />
              )}
            </span>
          )}
        </div>

        <div className="tx-details">
          <div className="tx-row">
            <FieldLabel
              label={t("block.hash")}
              tooltipKey="zcash.block.hash"
              visibleFor={["beginner"]}
            />
            <span className="tx-value tx-mono zec-inline-copy">
              {block.hash}
              <CopyButton value={block.hash} />
            </span>
          </div>

          <div className="btc-tx-details-grid">
            <div className="btc-tx-details-column">
              {coinbaseOutputs.length > 0 && (
                <div className="tx-row">
                  <FieldLabel
                    label={t("block.reward")}
                    tooltipKey="zcash.block.reward"
                    visibleFor={["beginner", "intermediate"]}
                  />
                  <span className="tx-value tx-value-highlight">
                    {formatZEC(rewardZat, currency)}
                  </span>
                </div>
              )}

              <div className="tx-row">
                <FieldLabel
                  label={t("block.transactions")}
                  tooltipKey="zcash.block.transactions"
                  visibleFor={["beginner"]}
                />
                <span className="tx-value">
                  {t("block.txCount", { count: block.nTx })}
                  {poolCounts.length > 0 && (
                    <span className="zec-pool-chips">
                      {poolCounts.map(({ pool, count }) => (
                        <span key={pool} className={`zec-pool-chip zec-pool-${pool}`}>
                          {t("block.poolTxCount", { count, pool: t(POOL_NAME_KEYS[pool]) })}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </div>

              {block.transparentOutputZat !== undefined && (
                <div className="tx-row">
                  <FieldLabel
                    label={t("block.transparentOutput")}
                    tooltipKey="zcash.block.transparentOutput"
                    visibleFor={["beginner", "intermediate"]}
                  />
                  <span className="tx-value">
                    {formatZEC(block.transparentOutputZat, currency)}
                  </span>
                </div>
              )}
            </div>

            <div className="btc-tx-details-column">
              <div className="tx-row">
                <FieldLabel
                  label={t("block.difficulty")}
                  tooltipKey="zcash.block.difficulty"
                  visibleFor={["beginner", "intermediate"]}
                />
                <span className="tx-value">{formatDifficulty(block.difficulty)}</span>
              </div>

              <div className="tx-row">
                <FieldLabel
                  label={t("block.size")}
                  tooltipKey="zcash.block.size"
                  visibleFor={["beginner"]}
                />
                <span className="tx-value">{formatSize(block.size)}</span>
              </div>

              {block.previousBlockHash && (
                <div className="tx-row">
                  <FieldLabel
                    label={t("block.previousBlockLabel")}
                    tooltipKey="zcash.block.previousBlock"
                    visibleFor={["beginner"]}
                  />
                  <span className="tx-value tx-mono">
                    <Link to={`/${networkId}/block/${block.height - 1}`} className="link-accent">
                      {truncateBlockHash(block.previousBlockHash)}
                    </Link>
                  </span>
                </div>
              )}

              {block.nextBlockHash && (
                <div className="tx-row">
                  <FieldLabel
                    label={t("block.nextBlockLabel")}
                    tooltipKey="zcash.block.nextBlock"
                    visibleFor={["beginner"]}
                  />
                  <span className="tx-value tx-mono">
                    <Link to={`/${networkId}/block/${block.height + 1}`} className="link-accent">
                      {truncateBlockHash(block.nextBlockHash)}
                    </Link>
                  </span>
                </div>
              )}
            </div>
          </div>

          {coinbaseOutputs.length > 0 && (
            <div className="tx-row">
              <FieldLabel
                label={t("block.coinbaseOutputs")}
                tooltipKey="zcash.block.coinbaseOutputs"
                visibleFor={["beginner", "intermediate"]}
              />
              <ul className="tx-value zec-coinbase-outputs">
                {coinbaseOutputs.map((output, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: outputs keep their on-chain order
                  <li key={index}>
                    {output.address ? (
                      <Link
                        to={`/${networkId}/address/${output.address}`}
                        className="link-accent tx-mono"
                      >
                        {output.address}
                      </Link>
                    ) : (
                      <span className="text-muted">{t("block.noAddress")}</span>
                    )}
                    <span className="zec-coinbase-value">
                      {formatZEC(output.valueZat, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="tx-row tx-row-vertical">
            <button
              type="button"
              className="more-details-toggle"
              onClick={() => setShowMoreDetails(!showMoreDetails)}
            >
              {showMoreDetails ? t("block.hideDetails") : t("block.showDetails")}
            </button>

            {showMoreDetails && (
              <div className="more-details-content">
                <DetailRow
                  label={t("block.merkleRoot")}
                  tooltip={showTooltips ? tTooltips("zcash.block.merkleRoot") : undefined}
                  mono
                >
                  {block.merkleRoot}
                </DetailRow>
                {block.blockCommitments && (
                  <DetailRow
                    label={t("block.blockCommitments")}
                    tooltip={showTooltips ? tTooltips("zcash.block.blockCommitments") : undefined}
                    mono
                  >
                    {block.blockCommitments}
                  </DetailRow>
                )}
                {block.finalSaplingRoot && (
                  <DetailRow
                    label={t("block.finalSaplingRoot")}
                    tooltip={showTooltips ? tTooltips("zcash.block.finalSaplingRoot") : undefined}
                    mono
                  >
                    {block.finalSaplingRoot}
                  </DetailRow>
                )}
                {block.finalOrchardRoot && (
                  <DetailRow
                    label={t("block.finalOrchardRoot")}
                    tooltip={showTooltips ? tTooltips("zcash.block.finalOrchardRoot") : undefined}
                    mono
                  >
                    {block.finalOrchardRoot}
                  </DetailRow>
                )}
                <DetailRow
                  label={t("block.version")}
                  tooltip={showTooltips ? tTooltips("zcash.block.version") : undefined}
                >
                  {block.version}
                </DetailRow>
                <DetailRow
                  label={t("block.bits")}
                  tooltip={showTooltips ? tTooltips("zcash.block.bits") : undefined}
                  mono
                >
                  {block.bits}
                </DetailRow>
                <DetailRow
                  label={t("block.nonce")}
                  tooltip={showTooltips ? tTooltips("zcash.block.nonce") : undefined}
                  mono
                >
                  {block.nonce}
                </DetailRow>
                {block.solution && (
                  <DetailRow
                    label={t("block.solution")}
                    tooltip={showTooltips ? tTooltips("zcash.block.solution") : undefined}
                    mono
                  >
                    <span className="zec-inline-copy zec-solution">
                      {block.solution.length > 64
                        ? `${block.solution.slice(0, 32)}…${block.solution.slice(-32)}`
                        : block.solution}
                      <CopyButton value={block.solution} />
                    </span>
                  </DetailRow>
                )}
                {treeSizes.length > 0 && (
                  <DetailRow
                    label={t("block.trees")}
                    tooltip={showTooltips ? tTooltips("zcash.block.trees") : undefined}
                  >
                    {treeSizes.join(" · ")}
                  </DetailRow>
                )}
              </div>
            )}
          </div>

          {txids.length > 0 && (
            <div className="tx-row tx-row-vertical">
              <button
                type="button"
                className="more-details-toggle"
                onClick={() => setShowTransactions(!showTransactions)}
              >
                {showTransactions
                  ? t("block.hideTransactions", { count: txids.length })
                  : t("block.showTransactions", { count: txids.length })}
              </button>

              {showTransactions && (
                <div className="more-details-content">
                  <div className="btc-block-txs">
                    {txids.map((txid, index) => (
                      <div key={txid} className="btc-block-tx-item">
                        <span className="btc-block-tx-index">{index}</span>
                        <span className="btc-block-tx-hash tx-mono">
                          <Link to={`/${networkId}/tx/${txid}`} className="link-accent">
                            {txid}
                          </Link>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {block.valuePools && block.valuePools.length > 0 && (
          <ZcashValuePools
            valuePools={block.valuePools}
            chainSupplyZat={block.chainSupplyZat}
            currency={currency}
            title={t("block.valuePoolsTitle")}
          />
        )}
      </div>
    );
  },
);

ZcashBlockDisplay.displayName = "ZcashBlockDisplay";
export default ZcashBlockDisplay;
