/**
 * Bitcoin-specific formatting utilities
 * Consolidated from various Bitcoin page components to ensure consistency
 */

/**
 * Format a Bitcoin value with 8 decimal places
 */
export function formatBTC(value: number): string {
  return `${value.toFixed(8)} BTC`;
}

/**
 * Format a USD value from BTC
 */
export function formatUSD(btcValue: number, btcPrice: number | null | undefined): string | null {
  if (!btcPrice) return null;
  const usdValue = btcValue * btcPrice;
  if (usdValue >= 1000) {
    return `$${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (usdValue >= 0.01) {
    return `$${usdValue.toFixed(2)}`;
  }
  return `$${usdValue.toFixed(4)}`;
}

/**
 * Truncate a hash for display
 * @param hash - The hash to truncate
 * @param variant - Display variant: 'short' (8...6), 'medium' (10...8), 'long' (12...8)
 */
export function truncateHash(
  hash: string,
  variant: "short" | "medium" | "long" = "medium",
): string {
  if (!hash) return "—";

  const variants = {
    short: { start: 8, end: 6 },
    medium: { start: 10, end: 8 },
    long: { start: 12, end: 8 },
  };

  const { start, end } = variants[variant];
  if (hash.length <= start + end) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

/**
 * Format a Unix timestamp as relative time (e.g., "5m ago", "2h ago")
 * @param timestamp - Unix timestamp in seconds
 * @param verbose - If true, use verbose format ("5 minutes ago" instead of "5m ago")
 */
export function formatTimeAgo(timestamp: number, verbose = false): string {
  const diffMs = Date.now() - timestamp * 1000;
  const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);

  if (verbose) {
    if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
    if (diffSeconds < 3600) {
      const mins = Math.floor(diffSeconds / 60);
      return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
    }
    if (diffSeconds < 86400) {
      const hours = Math.floor(diffSeconds / 3600);
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    }
    const days = Math.floor(diffSeconds / 86400);
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  }

  // Short format
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) {
    const mins = Math.floor(diffSeconds / 60);
    return `${mins}m ago`;
  }
  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours}h ago`;
  }
  const days = Math.floor(diffSeconds / 86400);
  return `${days}d ago`;
}

/**
 * Format a Unix timestamp as a localized date/time string
 * @param timestamp - Unix timestamp in seconds
 */
export function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(timestamp * 1000));
}

/**
 * Format bytes to human-readable size
 */
export function formatSize(bytes: number): string {
  if (bytes >= 1_000_000_000) {
    return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  }
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(2)} MB`;
  }
  if (bytes >= 1_000) {
    return `${(bytes / 1_000).toFixed(2)} KB`;
  }
  return `${bytes} bytes`;
}

/**
 * Format difficulty with appropriate suffix (P, T, G, M)
 */
export function formatDifficulty(difficulty: number): string {
  if (difficulty >= 1e15) {
    return `${(difficulty / 1e15).toFixed(2)} P`;
  }
  if (difficulty >= 1e12) {
    return `${(difficulty / 1e12).toFixed(2)} T`;
  }
  if (difficulty >= 1e9) {
    return `${(difficulty / 1e9).toFixed(2)} G`;
  }
  if (difficulty >= 1e6) {
    return `${(difficulty / 1e6).toFixed(2)} M`;
  }
  return difficulty.toLocaleString();
}

/**
 * Format a fee rate with sat/vB suffix
 */
export function formatFeeRate(satsPerVByte: number | null): string {
  if (satsPerVByte === null) return "—";
  return `${satsPerVByte.toFixed(1)} sat/vB`;
}

/**
 * Format a number with locale-aware formatting
 */
export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null) return "—";
  return value.toLocaleString();
}
