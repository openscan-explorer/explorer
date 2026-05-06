/**
 * Hook for fetching Solana network dashboard data with auto-refresh
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { NetworkConfig, SolanaBlock, SolanaNetworkStats, SolanaTransaction } from "../types";
import { useDataService } from "./useDataService";

const REFRESH_INTERVAL = 10000; // 10 seconds (Solana slots ~400ms)
const BLOCKS_TO_FETCH = 10;

export interface SolanaDashboardData {
  stats: SolanaNetworkStats | null;
  latestBlocks: SolanaBlock[];
  latestTransactions: SolanaTransaction[];
  solPrice: number | null;
  loading: boolean;
  loadingTransactions: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const initialState: SolanaDashboardData = {
  stats: null,
  latestBlocks: [],
  latestTransactions: [],
  solPrice: null,
  loading: true,
  loadingTransactions: true,
  error: null,
  lastUpdated: null,
};

export function useSolanaDashboard(network: NetworkConfig): SolanaDashboardData {
  const dataService = useDataService(network);
  const [data, setData] = useState<SolanaDashboardData>(initialState);
  const isFetchingRef = useRef(false);

  const fetchDashboardData = useCallback(async () => {
    if (!dataService || !dataService.isSolana() || isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;

    try {
      const adapter = dataService.getSolanaAdapter();

      // Fetch stats and latest blocks in parallel
      const [statsResult, blocksResult] = await Promise.all([
        adapter.getNetworkStats(),
        adapter.getLatestBlocks(BLOCKS_TO_FETCH),
      ]);

      setData((prev) => ({
        ...prev,
        stats: statsResult.data,
        latestBlocks: blocksResult,
        loading: false,
        error: null,
        lastUpdated: Date.now(),
      }));

      // Latest transactions: extract signatures from the most recent block
      const recentSignatures: string[] = [];
      for (const block of blocksResult) {
        if (block.signatures) {
          recentSignatures.push(...block.signatures.slice(0, 10));
          if (recentSignatures.length >= 20) break;
        }
      }

      // Fetch full details for the first few signatures
      const txPromises = recentSignatures.slice(0, 10).map((sig) =>
        adapter
          .getTransaction(sig)
          .then((r) => r.data)
          .catch(() => null),
      );
      const txResults = await Promise.all(txPromises);
      const transactions = txResults.filter((tx): tx is SolanaTransaction => tx !== null);

      setData((prev) => ({
        ...prev,
        latestTransactions: transactions,
        loadingTransactions: false,
      }));
    } catch (err) {
      setData((prev) => ({
        ...prev,
        loading: false,
        loadingTransactions: false,
        error: err instanceof Error ? err.message : "Failed to fetch Solana dashboard data",
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

  // Polling
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
