/**
 * Hook for fetching base fee + gas-used ratio history for the latest N blocks.
 * Powers the gas tendency chart on Network and Blocks pages.
 * Returns null for non-EVM networks.
 */

import { useEffect, useRef, useState } from "react";
import type { FeeHistory, NetworkConfig } from "../types";
import { logger } from "../utils/logger";
import { useDataService } from "./useDataService";

const REFRESH_INTERVAL = 10000; // 10 seconds — matches useNetworkDashboard cadence
const DEFAULT_BLOCK_COUNT = 50;

export interface UseFeeHistoryResult {
  feeHistory: FeeHistory | null;
  isLoading: boolean;
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
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (!dataService || !dataService.isEVM()) {
      setFeeHistory(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchHistory = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

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
        isFetchingRef.current = false;
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
