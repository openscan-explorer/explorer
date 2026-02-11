import type { EthereumClient } from "@openscan/network-connectors";
import { logger } from "../utils/logger";

/**
 * Extract data from strategy result, handling both fallback and parallel modes
 */
function extractData<T>(data: T | T[] | null | undefined): T | null {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) return data[0] ?? null;
  return data;
}

export interface NonceLookupResult {
  nonce: number;
  txHash: string;
  blockNumber: number;
}

/**
 * Service for looking up transactions by sender address + nonce using
 * the eth_getTransactionBySenderAndNonce RPC method (supported by reth clients).
 *
 * This allows O(N) discovery of sent transactions where N = address nonce,
 * instead of the O(log(blocks) * changes) binary search approach.
 */
export class NonceLookupService {
  private client: EthereumClient;
  private static readonly BATCH_SIZE = 8;

  constructor(client: EthereumClient) {
    this.client = client;
  }

  /**
   * Probe whether the RPC method is available by making a single test call.
   * Returns true if the method responds (even with null for unused nonce).
   */
  async isAvailable(address: string, nonce: number): Promise<boolean> {
    try {
      const nonceHex = `0x${nonce.toString(16)}`;
      const result = await this.client.execute<string | null>(
        "eth_getTransactionBySenderAndNonce",
        [address, nonceHex],
      );
      // Method is available if we got a successful response (even if data is null)
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Fetch sent transactions for a range of nonces.
   * Iterates in batches, calling eth_getTransactionBySenderAndNonce for each nonce.
   * Individual failures are silently skipped.
   *
   * @param address - Sender address
   * @param startNonce - First nonce to fetch (inclusive)
   * @param endNonce - Last nonce to fetch (exclusive)
   * @param signal - Optional AbortSignal for cancellation
   * @param onBatchComplete - Optional callback after each batch completes
   * @returns Array of successful lookup results
   */
  async fetchSentTransactions(
    address: string,
    startNonce: number,
    endNonce: number,
    signal?: AbortSignal,
    onBatchComplete?: (completed: number, total: number) => void,
  ): Promise<NonceLookupResult[]> {
    const results: NonceLookupResult[] = [];
    const total = endNonce - startNonce;

    for (let i = startNonce; i < endNonce; i += NonceLookupService.BATCH_SIZE) {
      if (signal?.aborted) break;

      const batchEnd = Math.min(i + NonceLookupService.BATCH_SIZE, endNonce);
      const batchPromises: Promise<NonceLookupResult | null>[] = [];

      for (let nonce = i; nonce < batchEnd; nonce++) {
        batchPromises.push(this.fetchSingleNonce(address, nonce));
      }

      const batchResults = await Promise.all(batchPromises);
      for (const result of batchResults) {
        if (result) {
          results.push(result);
        }
      }

      onBatchComplete?.(Math.min(batchEnd - startNonce, total), total);
    }

    return results;
  }

  /**
   * Convenience wrapper that fetches only the last N nonces.
   * Used for limit-based searches (e.g., "last 5 transactions").
   */
  async fetchRecentSentTransactions(
    address: string,
    currentNonce: number,
    count: number,
    signal?: AbortSignal,
    onBatchComplete?: (completed: number, total: number) => void,
  ): Promise<NonceLookupResult[]> {
    const startNonce = Math.max(0, currentNonce - count);
    return this.fetchSentTransactions(address, startNonce, currentNonce, signal, onBatchComplete);
  }

  /**
   * Fetch a single transaction by sender + nonce.
   * Returns null on failure (tolerates partial failures).
   */
  private async fetchSingleNonce(
    address: string,
    nonce: number,
  ): Promise<NonceLookupResult | null> {
    try {
      const nonceHex = `0x${nonce.toString(16)}`;
      const result = await this.client.execute<{ hash: string; blockNumber: string } | null>(
        "eth_getTransactionBySenderAndNonce",
        [address, nonceHex],
      );

      const data = extractData(result.data);
      if (!data || !data.hash || !data.blockNumber) return null;

      return {
        nonce,
        txHash: data.hash,
        blockNumber: Number.parseInt(data.blockNumber, 16),
      };
    } catch (err) {
      logger.warn(`Nonce lookup failed for ${address} nonce ${nonce}:`, err);
      return null;
    }
  }
}
