/**
 * Bitcoin-specific utility functions
 * Business logic and calculations for Bitcoin transactions
 */

import type { BitcoinTransaction } from "../types";

/**
 * Calculate the total output value of a transaction
 */
export function calculateTotalOutput(tx: BitcoinTransaction): number {
  return tx.vout.reduce((sum, output) => sum + output.value, 0);
}

/**
 * Calculate the total input value of a transaction
 */
export function calculateTotalInput(tx: BitcoinTransaction): number {
  return tx.vin.reduce((sum, input) => sum + (input.prevout?.value || 0), 0);
}

/**
 * Get human-readable label for Bitcoin address type
 */
export function getAddressTypeLabel(type: string): string {
  switch (type) {
    case "legacy":
      return "Legacy (P2PKH)";
    case "p2sh":
      return "Script Hash (P2SH)";
    case "segwit":
      return "Native SegWit (P2WPKH)";
    case "taproot":
      return "Taproot (P2TR)";
    default:
      return "Unknown";
  }
}

/**
 * Check if RBF (Replace-by-Fee) is enabled for a transaction
 * RBF is enabled if any input has sequence < 0xfffffffe
 */
export function isRBFEnabled(vin: { sequence: number }[]): boolean {
  return vin.some((input) => input.sequence < 0xfffffffe);
}

/**
 * Check if a transaction has witness data (SegWit)
 * Has witness data if hash differs from txid or any input has txinwitness
 */
export function hasWitness(tx: BitcoinTransaction): boolean {
  if (tx.hash !== tx.txid) return true;
  return tx.vin.some((input) => input.txinwitness && input.txinwitness.length > 0);
}

/**
 * Check if a transaction is a coinbase transaction
 */
export function isCoinbaseTransaction(tx: BitcoinTransaction): boolean {
  return tx.vin.length === 1 && !tx.vin[0]?.txid;
}
