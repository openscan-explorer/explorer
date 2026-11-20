/**
 * Zcash formatting utilities. Amounts are integer zatoshis (1 ZEC = 100,000,000 zat).
 */

import { ZATOSHIS_PER_ZEC } from "../config/zcashConstants";

// Re-exported so Zcash UI imports its formatters from one module instead of the Bitcoin one
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
