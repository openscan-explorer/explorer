import type React from "react";
import { useTranslation } from "react-i18next";
import type { ZcashShieldedPool, ZcashTransaction, ZcashTxKind } from "../../../types";
import { formatZEC } from "../../../utils/zcashFormatters";
import { getTransparentOutputZat } from "../../../utils/zcashUtils";
import { TX_KIND_LABEL_KEYS, VALUE_POOL_LABEL_KEYS } from "./labels";

type SkeletonWidth = 40 | 50 | 60 | 70 | 80 | 90 | 100 | 120 | 140;

interface ZcashSkeletonProps {
  width: SkeletonWidth;
  /** Line height of the text the placeholder stands in for */
  size?: "small" | "text" | "row" | "stat";
}

/**
 * Loading placeholder sized by CSS classes (see .zec-skeleton in components.css)
 */
export const ZcashSkeleton: React.FC<ZcashSkeletonProps> = ({ width, size = "text" }) => (
  <span className={`skeleton-pulse zec-skeleton zec-skeleton-${size} zec-skeleton-w${width}`} />
);

/**
 * How a transaction moves value between pools (coinbase, shielding, fully shielded…)
 */
export const ZcashKindBadge: React.FC<{ kind: ZcashTxKind }> = ({ kind }) => {
  const { t } = useTranslation("zcash");
  return <span className={`zec-kind-badge zec-kind-${kind}`}>{t(TX_KIND_LABEL_KEYS[kind])}</span>;
};

interface ZcashOutputValueProps {
  transaction: ZcashTransaction;
  currency: string;
}

/**
 * Transparent output total, or a "shielded" note when no value is publicly visible
 */
export const ZcashOutputValue: React.FC<ZcashOutputValueProps> = ({ transaction, currency }) => {
  const { t } = useTranslation("zcash");
  const transparentOutputZat = getTransparentOutputZat(transaction);

  return transparentOutputZat > 0 ? (
    <span className="tx-value-highlight">{formatZEC(transparentOutputZat, currency)}</span>
  ) : (
    <span className="text-muted">{t("transactions.shieldedValue")}</span>
  );
};

interface ZcashPoolChipProps {
  pool: ZcashShieldedPool;
  /** Chip text; the pool name by default */
  children?: React.ReactNode;
}

/**
 * A shielded pool tag, colored per pool
 */
export const ZcashPoolChip: React.FC<ZcashPoolChipProps> = ({ pool, children }) => {
  const { t } = useTranslation("zcash");
  return (
    <span className={`zec-pool-chip zec-pool-${pool}`}>
      {children ?? t(VALUE_POOL_LABEL_KEYS[pool])}
    </span>
  );
};
