/**
 * Hook for fetching network dashboard data with auto-refresh
 * Combines network stats, price, latest blocks, and transactions
 */

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppContext } from "../context/AppContext";
import { getNativeTokenPrice } from "../services/PriceService";
import type { Block, NetworkStats, Transaction } from "../types";
import { useDataService } from "./useDataService";

const REFRESH_INTERVAL = 10000; // 10 seconds
const BLOCKS_TO_FETCH = 5;
const TXS_TO_FETCH = 10;

export interface DashboardData {
  price: number | null;
  gasPrice: string | null;
  blockNumber: string | null;
  latestBlocks: Block[];
  latestTransactions: Transaction[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const initialState: DashboardData = {
  price: null,
  gasPrice: null,
  blockNumber: null,
  latestBlocks: [],
  latestTransactions: [],
  loading: true,
  error: null,
  lastUpdated: null,
};

export function useNetworkDashboard(networkId: number): DashboardData {
  const { rpcUrls } = useContext(AppContext);
  const dataService = useDataService(networkId);
  const [data, setData] = useState<DashboardData>(initialState);
  const isFetchingRef = useRef(false);

  // Get RPC URL for the network and mainnet (for L2 ETH price)
  const rpcUrl = rpcUrls[networkId]?.[0] || null;
  const mainnetRpcUrl = rpcUrls[1]?.[0] || null;

  const fetchDashboardData = useCallback(async () => {
    if (!dataService || isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;

    try {
      // Fetch network stats and price in parallel
      // For L2s, price is fetched from mainnet pools
      const [statsResult, priceResult] = await Promise.all([
        dataService.networkAdapter.getNetworkStats(),
        rpcUrl
          ? getNativeTokenPrice(networkId, rpcUrl, mainnetRpcUrl || undefined)
          : Promise.resolve(null),
      ]);

      const stats: NetworkStats = statsResult.data;
      const blockNumber = stats.currentBlockNumber;
      const currentBlockNum = Number.parseInt(blockNumber, 16);

      // Fetch latest blocks
      const blockNumbers = Array.from(
        { length: BLOCKS_TO_FETCH },
        (_, i) => currentBlockNum - i,
      ).filter((n) => n >= 0);

      const blockResults = await Promise.all(
        blockNumbers.map((num) => dataService.networkAdapter.getBlock(num).catch(() => null)),
      );

      const blocks = blockResults
        .filter((r): r is { data: Block } => r !== null)
        .map((r) => r.data);

      // Extract transaction hashes from blocks and fetch first N transactions
      const allTxHashes: string[] = [];
      for (const block of blocks) {
        if (block.transactions && allTxHashes.length < TXS_TO_FETCH) {
          for (const txHash of block.transactions) {
            if (allTxHashes.length < TXS_TO_FETCH) {
              allTxHashes.push(txHash);
            }
          }
        }
      }

      // Fetch transaction details
      const txResults = await Promise.all(
        allTxHashes.map((hash) =>
          dataService.networkAdapter.getTransaction(hash).catch(() => null),
        ),
      );

      const transactions = txResults
        .filter((r): r is { data: Transaction } => r !== null)
        .map((r) => r.data);

      setData({
        price: priceResult,
        gasPrice: stats.currentGasPrice,
        blockNumber: stats.currentBlockNumber,
        latestBlocks: blocks,
        latestTransactions: transactions,
        loading: false,
        error: null,
        lastUpdated: Date.now(),
      });
    } catch (err) {
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to fetch dashboard data",
      }));
    } finally {
      isFetchingRef.current = false;
    }
  }, [dataService, networkId, rpcUrl, mainnetRpcUrl]);

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
