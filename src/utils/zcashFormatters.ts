/**
 * Zcash formatting utilities. Amounts are integer zatoshis (1 ZEC = 100,000,000 zat).
 */

import { ZATOSHIS_PER_ZEC } from "../config/zcashConstants";

export {
  formatDifficulty,
  formatNumber,
  formatSize,
  formatTimeAgo,
  formatTimestamp,
  truncateBlockHash,
  truncateHash,
} from "./bitcoinFormatters";

/**
 * Format a zatoshi amount as ZEC with 8 decimal places
 * @param currency - Ticker to append (testnet uses TAZ)
 */
export function formatZEC(valueZat: number, currency = "ZEC"): string {
  return `${(valueZat / ZATOSHIS_PER_ZEC).toFixed(8)} ${currency}`;
}

/**
 * Format a zatoshi amount with thousands separators
 */
export function formatZatoshis(valueZat: number): string {
  return `${valueZat.toLocaleString()} zat`;
}
