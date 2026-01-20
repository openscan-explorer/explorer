/**
 * Service for fetching native token prices from on-chain DEX pools
 * Uses Uniswap V2-style getReserves() to calculate prices
 * For ETH L2s (Arbitrum, Optimism, Base), fetches ETH price from mainnet
 */

import { getPricePoolsForNetwork, type PricePoolConfig } from "../config/priceFeeds";

// Chain IDs that use ETH as their native token (L2s)
const ETH_NATIVE_CHAINS = new Set([
  42161, // Arbitrum One
  10, // Optimism
  8453, // Base
  11155111, // Sepolia (testnet)
]);

// Ethereum mainnet chain ID
const MAINNET_CHAIN_ID = 1;

// Uniswap V2 getReserves() function selector
const GET_RESERVES_SELECTOR = "0x0902f1ac";

interface ReservesResult {
  reserve0: bigint;
  reserve1: bigint;
}

/**
 * Decode getReserves() return data
 * Returns: (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)
 */
function decodeReserves(data: string): ReservesResult | null {
  try {
    if (!data || data === "0x" || data.length < 194) {
      return null;
    }

    // Remove 0x prefix
    const hex = data.slice(2);

    // reserve0 is bytes 0-64 (first 32 bytes, but only 112 bits used)
    // reserve1 is bytes 64-128 (second 32 bytes, but only 112 bits used)
    const reserve0Hex = hex.slice(0, 64);
    const reserve1Hex = hex.slice(64, 128);

    return {
      reserve0: BigInt(`0x${reserve0Hex}`),
      reserve1: BigInt(`0x${reserve1Hex}`),
    };
  } catch {
    return null;
  }
}

/**
 * Calculate price from pool reserves
 */
function calculatePriceFromReserves(
  reserves: ReservesResult,
  config: PricePoolConfig,
): number | null {
  try {
    const { reserve0, reserve1 } = reserves;

    if (reserve0 === BigInt(0) || reserve1 === BigInt(0)) {
      return null;
    }

    // Determine which reserve is native and which is stablecoin
    const nativeReserve = config.isToken0Native ? reserve0 : reserve1;
    const stableReserve = config.isToken0Native ? reserve1 : reserve0;

    // Adjust for decimals difference
    const decimalsDiff = config.nativeTokenDecimals - config.stablecoinDecimals;

    // Calculate price: stableReserve / nativeReserve, adjusted for decimals
    // Price = (stableReserve * 10^decimalsDiff) / nativeReserve
    if (decimalsDiff >= 0) {
      const adjustedStable = stableReserve * BigInt(10 ** decimalsDiff);
      return Number(adjustedStable) / Number(nativeReserve);
    }
    const adjustedNative = nativeReserve * BigInt(10 ** -decimalsDiff);
    return Number(stableReserve) / Number(adjustedNative);
  } catch {
    return null;
  }
}

/**
 * Fetch price from a single pool
 */
async function fetchPriceFromPool(rpcUrl: string, config: PricePoolConfig): Promise<number | null> {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_call",
        params: [
          {
            to: config.poolAddress,
            data: GET_RESERVES_SELECTOR,
          },
          "latest",
        ],
        id: 1,
      }),
    });

    const data = await response.json();

    if (data.error || !data.result) {
      return null;
    }

    const reserves = decodeReserves(data.result);
    if (!reserves) {
      return null;
    }

    return calculatePriceFromReserves(reserves, config);
  } catch {
    return null;
  }
}

/**
 * Calculate median of an array of numbers
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;

  const firstValue = values[0];
  if (values.length === 1 && firstValue !== undefined) return firstValue;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    const midValue = sorted[mid];
    const prevValue = sorted[mid - 1];
    if (midValue !== undefined && prevValue !== undefined) {
      return (prevValue + midValue) / 2;
    }
  }

  const midValue = sorted[mid];
  return midValue !== undefined ? midValue : 0;
}

/**
 * Fetch native token price for a network
 * Returns median price from all configured pools
 * For ETH L2s, uses mainnet pools to fetch ETH price
 */
export async function getNativeTokenPrice(
  chainId: number,
  rpcUrl: string,
  mainnetRpcUrl?: string,
): Promise<number | null> {
  // For ETH-based L2s, use mainnet pools and RPC
  const useMainnet = ETH_NATIVE_CHAINS.has(chainId);
  const targetChainId = useMainnet ? MAINNET_CHAIN_ID : chainId;
  const targetRpcUrl = useMainnet && mainnetRpcUrl ? mainnetRpcUrl : rpcUrl;

  const pools = getPricePoolsForNetwork(targetChainId);

  if (pools.length === 0) {
    return null;
  }

  // Fetch prices from all pools in parallel
  const pricePromises = pools.map((pool) => fetchPriceFromPool(targetRpcUrl, pool));
  const prices = await Promise.all(pricePromises);

  // Filter out null values
  const validPrices = prices.filter((p): p is number => p !== null && p > 0);

  if (validPrices.length === 0) {
    return null;
  }

  // Return median price for manipulation resistance
  return median(validPrices);
}

/**
 * Format price for display
 */
export function formatPrice(price: number | null): string {
  if (price === null) {
    return "—";
  }

  if (price >= 1000) {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  if (price >= 1) {
    return `$${price.toFixed(2)}`;
  }

  // For very small prices (unlikely for native tokens but just in case)
  return `$${price.toPrecision(4)}`;
}
