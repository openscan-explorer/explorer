import type React from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../../context/SettingsContext";
import type { ZcashNetworkStats, ZcashValuePoolId } from "../../../types";
import { formatZECCompact } from "../../../utils/zcashFormatters";
import HelperTooltip from "../../common/HelperTooltip";

const POOL_LABEL_KEYS = {
  transparent: "valuePools.pools.transparent",
  sprout: "valuePools.pools.sprout",
  sapling: "valuePools.pools.sapling",
  orchard: "valuePools.pools.orchard",
  lockbox: "valuePools.pools.lockbox",
  ironwood: "valuePools.pools.ironwood",
} as const satisfies Record<ZcashValuePoolId, string>;

const POOL_TOOLTIP_KEYS = {
  transparent: "zcash.pools.transparent",
  sprout: "zcash.pools.sprout",
  sapling: "zcash.pools.sapling",
  orchard: "zcash.pools.orchard",
  lockbox: "zcash.pools.lockbox",
  ironwood: "zcash.pools.ironwood",
} as const satisfies Record<ZcashValuePoolId, string>;

interface ZcashValuePoolsProps {
  stats: ZcashNetworkStats | null;
  currency: string;
}

const ZcashValuePools: React.FC<ZcashValuePoolsProps> = ({ stats, currency }) => {
  const { t } = useTranslation("zcash");
  const { t: tTooltips } = useTranslation("tooltips");
  const { settings } = useSettings();
  const showTooltips = settings.showHelperTooltips !== false;

  const pools = stats?.valuePools ?? [];
  const totalZat =
    stats?.chainSupplyZat || pools.reduce((sum, pool) => sum + pool.valueZat, 0) || 0;
  if (pools.length === 0 || totalZat <= 0) return null;

  const sharePercent = (valueZat: number) => (valueZat / totalZat) * 100;

  return (
    <section className="zec-value-pools" data-testid="zcash-value-pools">
      <div className="zec-value-pools-header">
        <h3 className="dashboard-table-title">{t("valuePools.title")}</h3>
        {showTooltips && <HelperTooltip content={tTooltips("zcash.valuePools")} />}
      </div>

      <div className="zec-pool-bar" role="img" aria-label={t("valuePools.barLabel")}>
        {pools.map((pool) => (
          <span
            key={pool.id}
            className={`zec-pool-segment zec-pool-${pool.id}`}
            style={{ "--pool-share": `${sharePercent(pool.valueZat)}%` } as React.CSSProperties}
          />
        ))}
      </div>

      <ul className="zec-pool-list">
        {pools.map((pool) => (
          <li key={pool.id} className="zec-pool-item">
            <span className={`zec-pool-swatch zec-pool-${pool.id}`} />
            <span className="zec-pool-name">{t(POOL_LABEL_KEYS[pool.id])}</span>
            {showTooltips && <HelperTooltip content={tTooltips(POOL_TOOLTIP_KEYS[pool.id])} />}
            <span className="zec-pool-value">{formatZECCompact(pool.valueZat, currency)}</span>
            <span className="zec-pool-share">{sharePercent(pool.valueZat).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ZcashValuePools;
