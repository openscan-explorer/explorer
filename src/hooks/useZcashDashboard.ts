/**
 * Hook for fetching Zcash network dashboard data with auto-refresh
 *
 * Hosted Zcash gateways allow only a few requests per minute, so data loads in two stages:
 * network stats and the tip block (3 calls) render first, then summaries for the previous
 * blocks load one at a time. Summaries are cached across refreshes, so a refresh usually
 * only fetches the stats, the new tip and any block mined since.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { DASHBOARD_BLOCKS, DASHBOARD_TXS, REFRESH_INTERVAL_MS } from "../config/zcashConstants";
import type { NetworkConfig, ZcashBlock, ZcashNetworkStats, ZcashTransaction } from "../types";
import { useDataService } from "./useDataService";

export interface ZcashDashboardData {
  stats: ZcashNetworkStats | null;
  latestBlocks: ZcashBlock[];
  latestTransactions: ZcashTransaction[];
  loading: boolean;
  loadingBlocks: boolean;
  error: Error | null;
  lastUpdated: number | null;
}

const initialState: ZcashDashboardData = {
  stats: null,
  latestBlocks: [],
  latestTransactions: [],
  loading: true,
  loadingBlocks: true,
  error: null,
  lastUpdated: null,
};

export function useZcashDashboard(network: NetworkConfig): ZcashDashboardData {
  const dataService = useDataService(network);
  const [data, setData] = useState<ZcashDashboardData>(initialState);
  const isFetchingRef = useRef(false);
  const blockCacheRef = useRef(new Map<number, ZcashBlock>());

  const fetchDashboardData = useCallback(async () => {
    if (!dataService || !dataService.isZcash() || isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    const cache = blockCacheRef.current;

    try {
      const adapter = dataService.getZcashAdapter();

      // Stage 1: stats and value pools, then the tip block with its transactions
      const { data: stats } = await adapter.getNetworkStats();
      const { data: tip } = await adapter.getBlock(stats.blockHeight);
      cache.set(tip.block.height, tip.block);

      const heights = Array.from(
        { length: DASHBOARD_BLOCKS },
        (_, i) => tip.block.height - i,
      ).filter((height) => height >= 0);
      const collectBlocks = () =>
        heights.flatMap((height) => {
          const block = cache.get(height);
          return block ? [block] : [];
        });

      setData((prev) => ({
        ...prev,
        stats,
        latestBlocks: collectBlocks(),
        latestTransactions: tip.transactions.slice(0, DASHBOARD_TXS),
        loading: false,
        error: null,
        lastUpdated: Date.now(),
      }));

      // Stage 2: summaries only for blocks not fetched by an earlier refresh
      const missing = heights.filter((height) => !cache.has(height));
      for (const block of await adapter.getBlockSummaries(missing)) {
        cache.set(block.height, block);
      }
      for (const height of cache.keys()) {
        if (!heights.includes(height)) cache.delete(height);
      }

      setData((prev) => ({ ...prev, latestBlocks: collectBlocks(), loadingBlocks: false }));
    } catch (err) {
      setData((prev) => ({
        ...prev,
        loading: false,
        loadingBlocks: false,
        error: err instanceof Error ? err : new Error(String(err)),
      }));
    } finally {
      isFetchingRef.current = false;
    }
  }, [dataService]);

  // Initial fetch
  useEffect(() => {
    setData(initialState);
    blockCacheRef.current.clear();
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Set up polling interval
  useEffect(() => {
    const intervalId = setInterval(fetchDashboardData, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [fetchDashboardData]);

  return data;
}
