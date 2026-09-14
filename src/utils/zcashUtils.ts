/**
 * Zcash helpers: address detection, transaction classification, fees and RPC error handling
 */

import { ZATOSHIS_PER_ZEC } from "../config/zcashConstants";
import type {
  ZcashAddressType,
  ZcashNetworkStats,
  ZcashShieldedPool,
  ZcashTransaction,
  ZcashTxKind,
  ZcashTxPool,
  ZcashValuePoolId,
} from "../types";

const BASE58 = "[1-9A-HJ-NP-Za-km-z]";
const BECH32 = "[02-9ac-hj-np-z]";

// Mainnet and testnet prefixes. Only prefix, alphabet and length are checked, not checksums.
const ADDRESS_PATTERNS: Array<{ type: ZcashAddressType; pattern: RegExp }> = [
  { type: "p2pkh", pattern: new RegExp(`^(t1|tm)${BASE58}{33}$`) },
  { type: "p2sh", pattern: new RegExp(`^(t3|t2)${BASE58}{33}$`) },
  { type: "sprout", pattern: new RegExp(`^(zc|zt)${BASE58}{93}$`) },
  { type: "sapling", pattern: new RegExp(`^(zs|ztestsapling)1${BECH32}{75}$`) },
  { type: "tex", pattern: new RegExp(`^(tex|textest)1${BECH32}{38}$`) },
  { type: "unified", pattern: new RegExp(`^(u|utest)1${BECH32}{50,}$`) },
];

/**
 * Detect a Zcash address encoding from its prefix and shape
 */
export function detectZcashAddressType(address: string): ZcashAddressType {
  return ADDRESS_PATTERNS.find(({ pattern }) => pattern.test(address))?.type ?? "unknown";
}

export function isZcashAddress(term: string): boolean {
  return detectZcashAddressType(term) !== "unknown";
}

/**
 * Convert a ZEC amount to integer zatoshis, removing floating point drift
 */
export function zecToZat(value: number): number {
  return Math.round(value * ZATOSHIS_PER_ZEC);
}

export function isCoinbaseTransaction(tx: ZcashTransaction): boolean {
  return tx.vin[0]?.coinbase !== undefined;
}

const SHIELDED_POOLS: ZcashShieldedPool[] = ["sprout", "sapling", "orchard", "ironwood"];

export function getShieldedPools(tx: ZcashTransaction): ZcashShieldedPool[] {
  return SHIELDED_POOLS.filter((pool) => tx.shielded[pool] !== undefined);
}

export function getTransactionPools(tx: ZcashTransaction): ZcashTxPool[] {
  const shielded = getShieldedPools(tx);
  return tx.vin.length > 0 || tx.vout.length > 0 ? ["transparent", ...shielded] : shielded;
}

/**
 * Classify how a transaction moves value between the transparent and shielded pools.
 * A shielded transaction legitimately has empty vin and vout.
 */
export function classifyTransaction(tx: ZcashTransaction): ZcashTxKind {
  if (isCoinbaseTransaction(tx)) return "coinbase";
  if (getShieldedPools(tx).length === 0) return "transparent";

  const hasInputs = tx.vin.length > 0;
  const hasOutputs = tx.vout.length > 0;
  if (hasInputs && hasOutputs) return "mixed";
  if (hasInputs) return "shielding";
  if (hasOutputs) return "deshielding";
  return "shielded";
}

/**
 * Number of distinct previous transactions spent by the transparent inputs
 */
export function countPreviousTransactions(tx: ZcashTransaction): number {
  return new Set(tx.vin.flatMap((input) => (input.txid ? [input.txid] : []))).size;
}

export function getTransparentOutputZat(tx: ZcashTransaction): number {
  return tx.vout.reduce((sum, output) => sum + output.valueZat, 0);
}

/**
 * Fee in zatoshis, from the transparent value balance:
 * inputs + value leaving the shielded pools = outputs + fee.
 * Returns null for coinbase, and while any transparent input value is still unknown.
 */
export function computeFeeZat(tx: ZcashTransaction): number | null {
  if (isCoinbaseTransaction(tx)) return null;

  let inputZat = 0;
  for (const input of tx.vin) {
    if (input.valueZat === undefined) return null;
    inputZat += input.valueZat;
  }

  const { sprout, sapling, orchard, ironwood } = tx.shielded;
  const shieldedNetZat =
    (sprout ? sprout.vpubNewZat - sprout.vpubOldZat : 0) +
    (sapling?.valueBalanceZat ?? 0) +
    (orchard?.valueBalanceZat ?? 0) +
    (ironwood?.valueBalanceZat ?? 0);

  return inputZat + shieldedNetZat - getTransparentOutputZat(tx);
}

const SHIELDED_VALUE_POOLS: ZcashValuePoolId[] = ["sprout", "sapling", "orchard", "ironwood"];

/**
 * Percentage of the chain supply held in shielded pools, or null when the supply is unknown
 */
export function getShieldedSupplyPercent(
  stats: Pick<ZcashNetworkStats, "chainSupplyZat" | "valuePools">,
): number | null {
  if (!stats.chainSupplyZat) return null;
  const shieldedZat = stats.valuePools
    .filter((pool) => SHIELDED_VALUE_POOLS.includes(pool.id))
    .reduce((sum, pool) => sum + pool.valueZat, 0);
  return (shieldedZat / stats.chainSupplyZat) * 100;
}

export type ZcashRpcErrorKind = "unsupported" | "rateLimited" | "failed";

const RATE_LIMITED_PATTERN = /status: 429/;
const UNSUPPORTED_PATTERN = /method not found|-32601/i;

/**
 * Classify the per-endpoint error messages of a failed RPC call
 */
export function classifyRpcErrors(messages: string[]): ZcashRpcErrorKind {
  if (messages.some((message) => RATE_LIMITED_PATTERN.test(message))) return "rateLimited";
  if (messages.length > 0 && messages.every((message) => UNSUPPORTED_PATTERN.test(message))) {
    return "unsupported";
  }
  return "failed";
}
