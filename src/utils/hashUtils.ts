/**
 * 64 hex characters without a 0x prefix: a Bitcoin or Zcash txid or block hash (the two look
 * alike, so only a lookup can tell them apart)
 */
const HEX64_PATTERN = /^[0-9a-fA-F]{64}$/;

export function isHex64Hash(term: string): boolean {
  return HEX64_PATTERN.test(term);
}
