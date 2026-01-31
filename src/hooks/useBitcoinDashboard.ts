/**
 * Hook for fetching Bitcoin network dashboard data with auto-refresh
 */

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppContext } from "../context/AppContext";
import { getBTCPrice } from "../services/PriceService";
import type {
  BitcoinBlock,
  BitcoinFeeEstimates,
  BitcoinNetworkStats,
  BitcoinTransaction,
  NetworkConfig,
} from "../types";
import { useDataService } from "./useDataService";

const REFRESH_INTERVAL = 60000; // 60 seconds (Bitcoin blocks ~10 minutes)
const BLOCKS_TO_FETCH = 10;
const TXS_TO_FETCH = 20;

export interface BitcoinDashboardData {
  stats: BitcoinNetworkStats | null;
  latestBlocks: BitcoinBlock[];
  latestTransactions: BitcoinTransaction[];
  btcPrice: number | null;
  feeEstimates: BitcoinFeeEstimates | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const initialState: BitcoinDashboardData = {
  stats: null,
  latestBlocks: [],
  latestTransactions: [],
  btcPrice: null,
  feeEstimates: null,
  loading: true,
  error: null,
  lastUpdated: null,
};

export function useBitcoinDashboard(network: NetworkConfig): BitcoinDashboardData {
  const { rpcUrls } = useContext(AppContext);
  const dataService = useDataService(network);
  const [data, setData] = useState<BitcoinDashboardData>(initialState);
  const isFetchingRef = useRef(false);

  // Get Ethereum mainnet RPC URL for fetching BTC price via WBTC pools
  const mainnetRpcUrl = rpcUrls["eip155:1"]?.[0] || null;

  const fetchDashboardData = useCallback(async () => {
    if (!dataService || !dataService.isBitcoin() || isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;

    try {
      const adapter = dataService.getBitcoinAdapter();

      // Fetch network stats, latest block headers, fee estimates, and BTC price in parallel
      const [statsResult, blocksResult, feeResult, priceResult] = await Promise.all([
        adapter.getNetworkStats(),
        adapter.getLatestBlockHeaders(BLOCKS_TO_FETCH),
        adapter.getFeeEstimates(),
        mainnetRpcUrl ? getBTCPrice(mainnetRpcUrl) : Promise.resolve(null),
      ]);

      // Update with blocks, fees, and price first, then fetch transactions (slower due to block verbosity 2)
      setData((prev) => ({
        ...prev,
        stats: statsResult.data,
        latestBlocks: blocksResult,
        btcPrice: priceResult,
        feeEstimates: feeResult,
        loading: false,
        error: null,
        lastUpdated: Date.now(),
      }));

      // Fetch latest transactions (heavier call - fetches full block data)
      const txsResult = await adapter.getLatestTransactions(TXS_TO_FETCH);

      setData((prev) => ({
        ...prev,
        latestTransactions: txsResult,
      }));
    } catch (err) {
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to fetch Bitcoin dashboard data",
      }));
    } finally {
      isFetchingRef.current = false;
    }
  }, [dataService, mainnetRpcUrl]);

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
