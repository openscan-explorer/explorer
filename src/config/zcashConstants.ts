/**
 * Zcash-specific constants
 */

import { ZCASH_TESTNET } from "@openscan/network-connectors";

export const ZATOSHIS_PER_ZEC = 100_000_000;

// Value pools, in the order the protocol introduced them. The pool types derive from these.
export const ZCASH_VALUE_POOL_IDS = [
  "transparent",
  "sprout",
  "sapling",
  "orchard",
  "lockbox",
  "ironwood",
] as const;

// Shielded pools a transaction can move value through
export const ZCASH_SHIELDED_POOLS = ["sprout", "sapling", "orchard", "ironwood"] as const;

// Pools with a note commitment tree reported by getblock (Sprout has none)
export const ZCASH_TREE_POOLS = ["sapling", "orchard", "ironwood"] as const;

export type ZcashNetworkKind = "mainnet" | "testnet";

/**
 * Mainnet or testnet, from a CAIP-2 network ID. Address prefixes differ between the two.
 */
export function getZcashNetworkKind(networkId: string): ZcashNetworkKind {
  return networkId === ZCASH_TESTNET ? "testnet" : "mainnet";
}

// Transparent input values cost one getrawtransaction per previous transaction
export const MAX_INPUT_LOOKUPS = 10;

// Backoff before retrying a rate-limited call (hosted gateways allow ~5 requests/min per IP)
export const RATE_LIMIT_RETRY_DELAYS_MS = [15_000, 30_000];
