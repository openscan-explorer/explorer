import type React from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../../context/SettingsContext";
import type { ZcashActionBundle, ZcashTransaction } from "../../../types";
import { formatZEC } from "../../../utils/zcashFormatters";
import { classifyTransaction } from "../../../utils/zcashUtils";
import HelperTooltip from "../../common/HelperTooltip";
import { VALUE_POOL_LABEL_KEYS } from "./labels";

interface ZcashShieldedBundlesProps {
  transaction: ZcashTransaction;
  currency: string;
}

const ZcashShieldedBundles: React.FC<ZcashShieldedBundlesProps> = ({ transaction, currency }) => {
  const { t } = useTranslation("zcash");
  const { t: tTooltips } = useTranslation("tooltips");
  const { settings } = useSettings();
  const showTooltips = settings.showHelperTooltips !== false;
  const { sprout, sapling, orchard, ironwood } = transaction.shielded;

  if (!sprout && !sapling && !orchard && !ironwood) return null;

  const isFullyShielded = classifyTransaction(transaction) === "shielded";

  // A positive value balance leaves the pool, a negative one enters it
  const describeBalance = (valueBalanceZat: number) => {
    if (valueBalanceZat > 0) {
      return t("shielded.valueLeft", { amount: formatZEC(valueBalanceZat, currency) });
    }
    if (valueBalanceZat < 0) {
      return t("shielded.valueEntered", { amount: formatZEC(-valueBalanceZat, currency) });
    }
    return t("shielded.valueNone");
  };

  const actionCard = (pool: "orchard" | "ironwood", bundle: ZcashActionBundle) => (
    <div className={`zec-bundle-card zec-pool-${pool}`}>
      <div className="zec-bundle-title">{t(VALUE_POOL_LABEL_KEYS[pool])}</div>
      <div className="zec-bundle-counts">{t("shielded.actions", { count: bundle.actions })}</div>
      <div className="zec-bundle-balance">{describeBalance(bundle.valueBalanceZat)}</div>
    </div>
  );

  return (
    <section className="zec-shielded" data-testid="zcash-shielded-bundles">
      <div className="zec-value-pools-header">
        <h3 className="dashboard-table-title">{t("shielded.title")}</h3>
        {showTooltips && <HelperTooltip content={tTooltips("zcash.tx.shieldedActivity")} />}
      </div>

      {isFullyShielded && (
        <div className="zec-fully-shielded">
          <strong>{t("shielded.fullyShieldedTitle")}</strong>
          <p>{t("shielded.fullyShieldedBody")}</p>
        </div>
      )}

      <div className="zec-bundle-grid">
        {sprout && (
          <div className="zec-bundle-card zec-pool-sprout">
            <div className="zec-bundle-title">{t(VALUE_POOL_LABEL_KEYS.sprout)}</div>
            <div className="zec-bundle-counts">
              {t("shielded.joinSplits", { count: sprout.joinSplits })}
            </div>
            <div className="zec-bundle-balance">
              {t("shielded.sproutIn", { amount: formatZEC(sprout.vpubOldZat, currency) })}
            </div>
            <div className="zec-bundle-balance">
              {t("shielded.sproutOut", { amount: formatZEC(sprout.vpubNewZat, currency) })}
            </div>
          </div>
        )}
        {sapling && (
          <div className="zec-bundle-card zec-pool-sapling">
            <div className="zec-bundle-title">{t(VALUE_POOL_LABEL_KEYS.sapling)}</div>
            <div className="zec-bundle-counts">
              {t("shielded.spendsOutputs", { spends: sapling.spends, outputs: sapling.outputs })}
            </div>
            <div className="zec-bundle-balance">{describeBalance(sapling.valueBalanceZat)}</div>
          </div>
        )}
        {orchard && actionCard("orchard", orchard)}
        {ironwood && actionCard("ironwood", ironwood)}
      </div>
    </section>
  );
};

export default ZcashShieldedBundles;
