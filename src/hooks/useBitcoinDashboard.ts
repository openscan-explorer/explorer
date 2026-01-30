/**
 * Hook for fetching Bitcoin network dashboard data with auto-refresh
 * Phase 1: Network stats and latest blocks only
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { BitcoinBlock, BitcoinNetworkStats, NetworkConfig } from "../types";
import { useDataService } from "./useDataService";

const REFRESH_INTERVAL = 60000; // 60 seconds (Bitcoin blocks ~10 minutes)
const BLOCKS_TO_FETCH = 10;

export interface BitcoinDashboardData {
  stats: BitcoinNetworkStats | null;
  latestBlocks: BitcoinBlock[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const initialState: BitcoinDashboardData = {
  stats: null,
  latestBlocks: [],
  loading: true,
  error: null,
  lastUpdated: null,
};

export function useBitcoinDashboard(network: NetworkConfig): BitcoinDashboardData {
  const dataService = useDataService(network);
  const [data, setData] = useState<BitcoinDashboardData>(initialState);
  const isFetchingRef = useRef(false);

  const fetchDashboardData = useCallback(async () => {
    if (!dataService || !dataService.isBitcoin() || isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;

    try {
      const adapter = dataService.getBitcoinAdapter();

      // Fetch network stats and latest blocks
      const [statsResult, blocksResult] = await Promise.all([
        adapter.getNetworkStats(),
        adapter.getLatestBlocks(BLOCKS_TO_FETCH),
      ]);

      setData({
        stats: statsResult.data,
        latestBlocks: blocksResult,
        loading: false,
        error: null,
        lastUpdated: Date.now(),
      });
    } catch (err) {
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to fetch Bitcoin dashboard data",
      }));
    } finally {
      isFetchingRef.current = false;
    }
  }, [dataService]);

  // Initial fetch
  useEffect(() => {
    setData(initialState);
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Set up polling interval
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchDashboardData();
    }, REFRESH_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchDashboardData]);

  return data;
}
