/**
 * Solana-specific utility functions
 */

const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * Convert lamports to SOL string with appropriate decimals
 */
export function lamportsToSol(lamports: number): string {
  if (lamports === 0) return "0";
  const sol = lamports / LAMPORTS_PER_SOL;
  // Use up to 9 decimals, but trim trailing zeros
  return sol.toFixed(9).replace(/\.?0+$/, "");
}

/**
 * Format lamports as a human-readable SOL amount
 */
export function formatSol(lamports: number): string {
  return `${lamportsToSol(lamports)} SOL`;
}

/**
 * Shorten a Solana address (base58 pubkey) for display
 */
export function shortenSolanaAddress(address: string, prefixLen = 4, suffixLen = 4): string {
  if (!address || address.length <= prefixLen + suffixLen) return address;
  return `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`;
}

/**
 * Validate that a string looks like a Solana address (base58, 32-44 chars)
 */
export function isSolanaAddress(input: string): boolean {
  if (!input) return false;
  // Base58 alphabet (no 0, O, I, l) and length 32-44
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input);
}

/**
 * Validate that a string looks like a Solana transaction signature (base58, 87-88 chars)
 */
export function isSolanaSignature(input: string): boolean {
  if (!input) return false;
  return /^[1-9A-HJ-NP-Za-km-z]{86,90}$/.test(input);
}

/**
 * Format slot number with commas
 */
export function formatSlotNumber(slot: number): string {
  return slot.toLocaleString();
}

/**
 * Get a transaction status string from the Solana err field
 */
export function getTransactionStatus(err: unknown): "success" | "failed" {
  return err == null ? "success" : "failed";
}

/**
 * Format a Solana block time (Unix seconds) to a relative time
 */
export function formatBlockTime(blockTime: number | null): string {
  if (blockTime === null) return "Unknown";
  const date = new Date(blockTime * 1000);
  return date.toLocaleString();
}

/**
 * Calculate epoch progress percentage
 */
export function calculateEpochProgress(slotIndex: number, slotsInEpoch: number): number {
  if (slotsInEpoch === 0) return 0;
  return (slotIndex / slotsInEpoch) * 100;
}

/**
 * Format a stake amount (lamports) as SOL with M/B suffix for large amounts
 */
export function formatStake(lamports: number): string {
  const sol = lamports / LAMPORTS_PER_SOL;
  if (sol >= 1_000_000) return `${(sol / 1_000_000).toFixed(2)}M SOL`;
  if (sol >= 1_000) return `${(sol / 1_000).toFixed(2)}K SOL`;
  return `${sol.toFixed(2)} SOL`;
}
