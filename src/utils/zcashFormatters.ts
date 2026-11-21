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

/**
 * Format a zatoshi amount as ZEC with thousands separators and few decimals (for dashboards)
 */
export function formatZECCompact(valueZat: number, currency = "ZEC"): string {
  const value = valueZat / ZATOSHIS_PER_ZEC;
  const maximumFractionDigits = value < 1_000 ? 2 : 0;
  return `${value.toLocaleString(undefined, { maximumFractionDigits })} ${currency}`;
}

/**
 * Format a percentage (0–100) with one decimal, using the viewer's locale like the amounts
 */
export function formatPercent(percent: number): string {
  return (percent / 100).toLocaleString(undefined, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
