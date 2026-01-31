/**
 * Hook for fetching EVM network dashboard data with auto-refresh
 * Combines network stats, price, latest blocks, and transactions
 * Note: For Bitcoin networks, use useBitcoinDashboard instead
 */

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppContext } from "../context/AppContext";
import { getNativeTokenPrice } from "../services/PriceService";
import type { Block, GasPrices, NetworkConfig, NetworkStats, Transaction } from "../types";
import { getChainIdFromNetwork } from "../utils/networkResolver";
import { useDataService } from "./useDataService";

const REFRESH_INTERVAL = 10000; // 10 seconds
const BLOCKS_TO_FETCH = 5;
const TXS_TO_FETCH = 10;

export interface DashboardData {
  price: number | null;
  gasPrice: string | null;
  gasPrices: GasPrices | null;
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
  gasPrices: null,
  blockNumber: null,
  latestBlocks: [],
  latestTransactions: [],
  loading: true,
  error: null,
  lastUpdated: null,
};

export function useNetworkDashboard(network: NetworkConfig | number): DashboardData {
  const { rpcUrls } = useContext(AppContext);
  const dataService = useDataService(network);
  const [data, setData] = useState<DashboardData>(initialState);
  const isFetchingRef = useRef(false);

  // Get networkId for RPC lookups and chainId for EVM-specific operations (price)
  const networkId = typeof network === "number" ? `eip155:${network}` : network.networkId;
  const chainId = typeof network === "number" ? network : getChainIdFromNetwork(network);
  // Get RPC URL for the network and mainnet (for L2 ETH price)
  const rpcUrl = rpcUrls[networkId]?.[0] || null;
  const mainnetRpcUrl = rpcUrls["eip155:1"]?.[0] || null;

  const fetchDashboardData = useCallback(async () => {
    if (!dataService || !dataService.isEVM() || isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;

    try {
      const adapter = dataService.getEVMAdapter();
      // Fetch network stats, gas prices, and price in parallel
      // For L2s, price is fetched from mainnet pools
      const [statsResult, gasPricesResult, priceResult] = await Promise.all([
        adapter.getNetworkStats(),
        adapter.getGasPrices().catch(() => null),
        rpcUrl && chainId
          ? getNativeTokenPrice(chainId, rpcUrl, mainnetRpcUrl || undefined)
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
        blockNumbers.map((num) => adapter.getBlock(num).catch(() => null)),
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
        allTxHashes.map((hash) => adapter.getTransaction(hash).catch(() => null)),
      );

      const transactions = txResults
        .filter((r): r is { data: Transaction } => r !== null)
        .map((r) => r.data);

      setData({
        price: priceResult,
        gasPrice: stats.currentGasPrice,
        gasPrices: gasPricesResult?.data || null,
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
  }, [dataService, chainId, rpcUrl, mainnetRpcUrl]);

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
