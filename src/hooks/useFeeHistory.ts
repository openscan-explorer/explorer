/**
 * Hook for fetching base fee + gas-used ratio history for the latest N blocks.
 * Powers the gas tendency chart on Network and Blocks pages.
 * Returns null for non-EVM networks.
 */

import { useEffect, useState } from "react";
import type { FeeHistory, NetworkConfig } from "../types";
import { logger } from "../utils/logger";
import { useDataService } from "./useDataService";

const REFRESH_INTERVAL = 10000; // 10 seconds — matches useNetworkDashboard cadence
const DEFAULT_BLOCK_COUNT = 50;

export interface UseFeeHistoryResult {
  /** Latest successful fetch for the current network. Kept when a later refresh fails. */
  feeHistory: FeeHistory | null;
  isLoading: boolean;
  /** Error from the most recent fetch, cleared on the next success. */
  error: Error | null;
}

export function useFeeHistory(
  network: NetworkConfig | number,
  blockCount: number = DEFAULT_BLOCK_COUNT,
): UseFeeHistoryResult {
  const dataService = useDataService(network);
  const [feeHistory, setFeeHistory] = useState<FeeHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Drop the previous network's data so it never renders under the new one.
    setFeeHistory(null);
    setError(null);

    if (!dataService || !dataService.isEVM()) {
      setIsLoading(false);
      return;
    }

    // Scoped to this effect run, so an in-flight request for the previous
    // network can't block the first fetch for the new one.
    let cancelled = false;
    let isFetching = false;

    const fetchHistory = async () => {
      if (isFetching) return;
      isFetching = true;

      try {
        const adapter = dataService.getEVMAdapter();
        const result = await adapter.getFeeHistory(blockCount);
        if (cancelled) return;
        setFeeHistory(result.data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        const e = err instanceof Error ? err : new Error("Failed to fetch fee history");
        logger.warn("useFeeHistory: fetch failed", e);
        setError(e);
      } finally {
        isFetching = false;
        if (!cancelled) setIsLoading(false);
      }
    };

    setIsLoading(true);
    fetchHistory();
    const intervalId = setInterval(fetchHistory, REFRESH_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [dataService, blockCount]);

  return { feeHistory, isLoading, error };
}
