/**
 * Zcash helpers: address detection, transaction classification, fees and RPC error handling
 */

import {
  ZATOSHIS_PER_ZEC,
  ZCASH_SHIELDED_POOLS,
  type ZcashNetworkKind,
} from "../config/zcashConstants";
import type {
  ZcashAddressType,
  ZcashFee,
  ZcashNetworkStats,
  ZcashShieldedPool,
  ZcashTransaction,
  ZcashTxKind,
  ZcashTxPool,
} from "../types";

const BASE58 = "[1-9A-HJ-NP-Za-km-z]";
const BECH32 = "[02-9ac-hj-np-z]";

interface AddressPattern {
  type: ZcashAddressType;
  network: ZcashNetworkKind;
  // Bech32(m) is case-insensitive (all-uppercase is valid, e.g. in QR codes); Base58 is not
  bech32: boolean;
  pattern: RegExp;
}

// Only prefix, alphabet and length are checked, not checksums
const ADDRESS_PATTERNS: AddressPattern[] = [
  { type: "p2pkh", network: "mainnet", bech32: false, pattern: new RegExp(`^t1${BASE58}{33}$`) },
  { type: "p2pkh", network: "testnet", bech32: false, pattern: new RegExp(`^tm${BASE58}{33}$`) },
  { type: "p2sh", network: "mainnet", bech32: false, pattern: new RegExp(`^t3${BASE58}{33}$`) },
  { type: "p2sh", network: "testnet", bech32: false, pattern: new RegExp(`^t2${BASE58}{33}$`) },
  { type: "sprout", network: "mainnet", bech32: false, pattern: new RegExp(`^zc${BASE58}{93}$`) },
  { type: "sprout", network: "testnet", bech32: false, pattern: new RegExp(`^zt${BASE58}{93}$`) },
  { type: "sapling", network: "mainnet", bech32: true, pattern: new RegExp(`^zs1${BECH32}{75}$`) },
  {
    type: "sapling",
    network: "testnet",
    bech32: true,
    pattern: new RegExp(`^ztestsapling1${BECH32}{75}$`),
  },
  { type: "tex", network: "mainnet", bech32: true, pattern: new RegExp(`^tex1${BECH32}{38}$`) },
  { type: "tex", network: "testnet", bech32: true, pattern: new RegExp(`^textest1${BECH32}{38}$`) },
  { type: "unified", network: "mainnet", bech32: true, pattern: new RegExp(`^u1${BECH32}{50,}$`) },
  {
    type: "unified",
    network: "testnet",
    bech32: true,
    pattern: new RegExp(`^utest1${BECH32}{50,}$`),
  },
];

function matchAddress(
  address: string,
  network?: ZcashNetworkKind,
): { pattern: AddressPattern; address: string } | undefined {
  const candidates = ADDRESS_PATTERNS.filter((entry) => !network || entry.network === network);
  const exact = candidates.find(({ pattern }) => pattern.test(address));
  if (exact) return { pattern: exact, address };

  if (address !== address.toUpperCase()) return undefined;
  const lowered = address.toLowerCase();
  const bech32 = candidates.find((entry) => entry.bech32 && entry.pattern.test(lowered));
  return bech32 && { pattern: bech32, address: lowered };
}

/**
 * Detect a Zcash address encoding from its prefix and shape. With a network, addresses of the
 * other network (e.g. a testnet `tm…` address on mainnet) are reported as unknown.
 */
export function detectZcashAddressType(
  address: string,
  network?: ZcashNetworkKind,
): ZcashAddressType {
  return matchAddress(address, network)?.pattern.type ?? "unknown";
}

export function isZcashAddress(term: string, network?: ZcashNetworkKind): boolean {
  return detectZcashAddressType(term, network) !== "unknown";
}

/**
 * Canonical form of an address: all-uppercase Bech32(m) addresses are lowercased, everything
 * else is returned as is
 */
export function normalizeZcashAddress(address: string): string {
  return matchAddress(address)?.address ?? address;
}

/**
 * Convert a ZEC amount to integer zatoshis, removing floating point drift
 */
export function zecToZat(value: number): number {
  return Math.round(value * ZATOSHIS_PER_ZEC);
}

/**
 * Zebra marks the coinbase input with a `coinbase` field, so check for it directly rather than
 * Bitcoin's "single input without a txid" heuristic (shielded transactions can have no inputs)
 */
export function isCoinbaseTransaction(tx: ZcashTransaction): boolean {
  return tx.vin[0]?.coinbase !== undefined;
}

export function getShieldedPools(tx: ZcashTransaction): ZcashShieldedPool[] {
  return ZCASH_SHIELDED_POOLS.filter((pool) => tx.shielded[pool] !== undefined);
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
 * Net value leaving the shielded pools into the transparent value balance, in zatoshis.
 * Negative when the transaction moves value into the shielded pools.
 */
export function getShieldedNetZat(tx: ZcashTransaction): number {
  const { sprout, sapling, orchard, ironwood } = tx.shielded;
  return (
    (sprout ? sprout.vpubNewZat - sprout.vpubOldZat : 0) +
    (sapling?.valueBalanceZat ?? 0) +
    (orchard?.valueBalanceZat ?? 0) +
    (ironwood?.valueBalanceZat ?? 0)
  );
}

/**
 * Fee from the transparent value balance: inputs + value leaving the shielded pools =
 * outputs + fee. Unknown while any transparent input value is still unresolved.
 */
export function computeFee(tx: ZcashTransaction): ZcashFee {
  if (isCoinbaseTransaction(tx)) return { kind: "coinbase" };

  let inputZat = 0;
  for (const input of tx.vin) {
    if (input.valueZat === undefined) return { kind: "unknown" };
    inputZat += input.valueZat;
  }

  return { kind: "known", zat: inputZat + getShieldedNetZat(tx) - getTransparentOutputZat(tx) };
}

/**
 * Percentage of the chain supply held in shielded pools, or null when the supply is unknown
 */
export function getShieldedSupplyPercent(
  stats: Pick<ZcashNetworkStats, "chainSupplyZat" | "valuePools">,
): number | null {
  if (!stats.chainSupplyZat) return null;
  const shieldedZat = stats.valuePools
    .filter((pool) => (ZCASH_SHIELDED_POOLS as readonly string[]).includes(pool.id))
    .reduce((sum, pool) => sum + pool.valueZat, 0);
  return (shieldedZat / stats.chainSupplyZat) * 100;
}

export type ZcashRpcErrorKind = "unsupported" | "rateLimited" | "failed";

const RATE_LIMITED_PATTERN = /status: 429/;
// The connector reports JSON-RPC errors as "RPC error: <message>" and drops the code, so an
// unsupported method (-32601) can only be recognised by its message
const UNSUPPORTED_PATTERN = /method not found/i;
const RPC_ERROR_PATTERN = /^RPC error:/;

/**
 * Whether an endpoint answered with a JSON-RPC error (e.g. "No such transaction"), as opposed
 * to an HTTP or network failure
 */
export function isRpcErrorAnswer(message: string): boolean {
  return RPC_ERROR_PATTERN.test(message);
}

/**
 * Classify the per-endpoint error messages of a failed RPC call:
 * 1. Any endpoint answered with a JSON-RPC error other than "method not found": that answer is
 *    definitive (e.g. "No such transaction"), so retrying a rate-limited endpoint can't help.
 * 2. Otherwise any HTTP 429: rate limited, worth retrying.
 * 3. Otherwise every endpoint rejected the method: unsupported.
 */
export function classifyRpcErrors(messages: string[]): ZcashRpcErrorKind {
  const definitive = messages.some(
    (message) => isRpcErrorAnswer(message) && !UNSUPPORTED_PATTERN.test(message),
  );
  if (definitive) return "failed";
  if (messages.some((message) => RATE_LIMITED_PATTERN.test(message))) return "rateLimited";
  if (messages.length > 0 && messages.every((message) => UNSUPPORTED_PATTERN.test(message))) {
    return "unsupported";
  }
  return "failed";
}
