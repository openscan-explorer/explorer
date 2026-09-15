/**
 * Zcash-specific constants
 */

export const ZATOSHIS_PER_ZEC = 100_000_000;

// Transparent input values cost one getrawtransaction per previous transaction
export const MAX_INPUT_LOOKUPS = 10;

// Backoff before retrying a rate-limited call (hosted gateways allow ~5 requests/min per IP)
export const RATE_LIMIT_RETRY_DELAYS_MS = [15_000, 30_000];

// Dashboard sizing, kept small so a refresh fits within hosted rate limits
export const DASHBOARD_BLOCKS = 5;
export const DASHBOARD_TXS = 10;

// Zcash targets a 75 second block interval
export const REFRESH_INTERVAL_MS = 90_000;
