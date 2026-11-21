/**
 * Hook for fetching Zcash network dashboard data with auto-refresh
 *
 * Hosted Zcash gateways allow only a few requests per minute, so data loads in two stages:
 * network stats and the tip block (3 calls, the stats call shared with the navbar) render
 * first, then summaries for the previous blocks load one at a time. Summaries are cached
 * across refreshes, so a refresh usually only fetches the stats, the new tip and any block
 * mined since; heights that failed are retried on the next refresh.
 */

import { useEffect, useState } from "react";
import { DASHBOARD_BLOCKS, DASHBOARD_TXS, REFRESH_INTERVAL_MS } from "../config/zcashConstants";
import type { NetworkConfig, ZcashBlock, ZcashNetworkStats, ZcashTransaction } from "../types";
import { useDataService } from "./useDataService";

export interface ZcashDashboardData {
  stats: ZcashNetworkStats | null;
  latestBlocks: ZcashBlock[];
  /** Recent heights whose summary couldn't be loaded */
  failedHeights: number[];
  latestTransactions: ZcashTransaction[];
  loading: boolean;
  error: Error | null;
}

const initialState: ZcashDashboardData = {
  stats: null,
  latestBlocks: [],
  failedHeights: [],
  latestTransactions: [],
  loading: true,
  error: null,
};

export function useZcashDashboard(network: NetworkConfig): ZcashDashboardData {
  const dataService = useDataService(network);
  const [data, setData] = useState<ZcashDashboardData>(initialState);

  useEffect(() => {
    setData(initialState);
    if (!dataService?.isZcash()) return;

    // Everything below belongs to this network: switching networks aborts it, so a slow
    // (rate-limited) response for the previous network can't land on this one
    const controller = new AbortController();
    const { signal } = controller;
    const adapter = dataService.getZcashAdapter();
    const cache = new Map<number, ZcashBlock>();
    let inFlight = false;

    const refresh = async () => {
      if (inFlight) return;
      inFlight = true;

      try {
        // Stage 1: stats and value pools, then the tip block with its transactions
        const { data: stats } = await adapter.getNetworkStats({ signal });
        const { data: tip } = await adapter.getBlock(stats.blockHeight, { signal });
        if (signal.aborted) return;
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
        }));

        // Stage 2: summaries only for blocks not fetched by an earlier refresh
        const missing = heights.filter((height) => !cache.has(height));
        const { blocks, failedHeights } = await adapter.getBlockSummaries(missing, { signal });
        if (signal.aborted) return;
        for (const block of blocks) {
          cache.set(block.height, block);
        }
        for (const height of cache.keys()) {
          if (!heights.includes(height)) cache.delete(height);
        }

        setData((prev) => ({ ...prev, latestBlocks: collectBlocks(), failedHeights }));
      } catch (err) {
        if (signal.aborted) return;
        setData((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        }));
      } finally {
        inFlight = false;
      }
    };

    refresh();
    const intervalId = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => {
      controller.abort();
      clearInterval(intervalId);
    };
  }, [dataService]);

  return data;
}
