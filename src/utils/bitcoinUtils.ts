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

/**
 * Decode OP_RETURN payload from scriptPubKey hex.
 * Script format: 6a [push opcodes] <data>
 * Returns the decoded UTF-8 string if valid, otherwise the raw hex data.
 */
export function decodeOpReturnData(hex: string): { text: string | null; hex: string } {
  // Strip the OP_RETURN opcode (0x6a) prefix
  if (!hex.startsWith("6a") || hex.length < 4) {
    return { text: null, hex };
  }

  let offset = 2; // skip OP_RETURN (6a)
  const dataChunks: string[] = [];

  while (offset < hex.length) {
    const opByte = parseInt(hex.slice(offset, offset + 2), 16);
    if (Number.isNaN(opByte)) break;
    offset += 2;

    let pushLen: number;
    if (opByte >= 0x01 && opByte <= 0x4b) {
      // Direct push: opByte is the number of bytes to push
      pushLen = opByte;
    } else if (opByte === 0x4c) {
      // OP_PUSHDATA1: next 1 byte is the length
      pushLen = parseInt(hex.slice(offset, offset + 2), 16);
      if (Number.isNaN(pushLen)) break;
      offset += 2;
    } else if (opByte === 0x4d) {
      // OP_PUSHDATA2: next 2 bytes (little-endian) is the length
      const lo = parseInt(hex.slice(offset, offset + 2), 16);
      const hi = parseInt(hex.slice(offset + 2, offset + 4), 16);
      if (Number.isNaN(lo) || Number.isNaN(hi)) break;
      pushLen = lo | (hi << 8);
      offset += 4;
    } else {
      // Unknown opcode or OP_0, skip rest
      break;
    }

    const chunkHex = hex.slice(offset, offset + pushLen * 2);
    if (chunkHex.length < pushLen * 2) break;
    dataChunks.push(chunkHex);
    offset += pushLen * 2;
  }

  const rawHex = dataChunks.join("");
  if (!rawHex) {
    return { text: null, hex };
  }

  // Try to decode as UTF-8
  try {
    const bytes = new Uint8Array(rawHex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(rawHex.slice(i * 2, i * 2 + 2), 16);
    }
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    // Check if it has enough printable characters to be meaningful text
    const printable = decoded.replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, "");
    if (printable.length >= decoded.length * 0.5) {
      return { text: decoded, hex: rawHex };
    }
  } catch {
    // Not valid UTF-8
  }

  return { text: null, hex: rawHex };
}
