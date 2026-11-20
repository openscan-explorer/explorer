import type { ZcashTxKind, ZcashValuePoolId } from "../../../types";

// i18n keys in the zcash namespace, keyed by domain value so lookups stay type-checked

export const VALUE_POOL_LABEL_KEYS = {
  transparent: "valuePools.pools.transparent",
  sprout: "valuePools.pools.sprout",
  sapling: "valuePools.pools.sapling",
  orchard: "valuePools.pools.orchard",
  lockbox: "valuePools.pools.lockbox",
  ironwood: "valuePools.pools.ironwood",
} as const satisfies Record<ZcashValuePoolId, string>;

export const TX_KIND_LABEL_KEYS = {
  coinbase: "transactions.kinds.coinbase",
  transparent: "transactions.kinds.transparent",
  shielding: "transactions.kinds.shielding",
  deshielding: "transactions.kinds.deshielding",
  shielded: "transactions.kinds.shielded",
  mixed: "transactions.kinds.mixed",
} as const satisfies Record<ZcashTxKind, string>;
