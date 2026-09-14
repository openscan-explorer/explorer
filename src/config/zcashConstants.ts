/**
 * Zcash-specific constants
 */

export const ZATOSHIS_PER_ZEC = 100_000_000;

// Transparent input values cost one getrawtransaction per previous transaction
export const MAX_INPUT_LOOKUPS = 10;

// Backoff before retrying a rate-limited call (hosted gateways allow ~5 requests/min per IP)
export const RATE_LIMIT_RETRY_DELAYS_MS = [15_000, 30_000];
