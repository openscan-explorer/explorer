/**
 * Price feed configuration for on-chain native token price fetching
 * Uses Uniswap V2-style DEX pools to calculate price from reserves
 */

export interface PricePoolConfig {
  poolAddress: string;
  stablecoinDecimals: number;
  nativeTokenDecimals: number;
  isToken0Native: boolean; // Is wrapped native token token0 in the pair?
  name: string; // For debugging
}

/**
 * DEX pool addresses for native token / stablecoin pairs
 * Multiple pools per network allow for median price calculation
 */
export const PRICE_POOLS: Record<number, PricePoolConfig[]> = {
  // Ethereum Mainnet
  1: [
    {
      poolAddress: "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc", // USDC/WETH Uniswap V2
      stablecoinDecimals: 6,
      nativeTokenDecimals: 18,
      isToken0Native: false, // USDC is token0, WETH is token1
      name: "Uniswap V2 USDC/WETH",
    },
    {
      poolAddress: "0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852", // WETH/USDT Uniswap V2
      stablecoinDecimals: 6,
      nativeTokenDecimals: 18,
      isToken0Native: true, // WETH is token0, USDT is token1
      name: "Uniswap V2 WETH/USDT",
    },
  ],

  // Arbitrum, Optimism, Base use ETH - price fetched from mainnet pools
  // See PriceService.ts ETH_NATIVE_CHAINS

  // Polygon
  137: [
    {
      poolAddress: "0x6e7a5FAFcec6BB1e78bAE2A1F0B612012BF14827", // WMATIC/USDC QuickSwap
      stablecoinDecimals: 6,
      nativeTokenDecimals: 18,
      isToken0Native: true,
      name: "QuickSwap WMATIC/USDC",
    },
  ],

  // BNB Chain
  56: [
    {
      poolAddress: "0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16", // WBNB/BUSD PancakeSwap
      stablecoinDecimals: 18,
      nativeTokenDecimals: 18,
      isToken0Native: true,
      name: "PancakeSwap WBNB/BUSD",
    },
  ],

  // Sepolia Testnet - no price feeds
  11155111: [],

  // BNB Testnet - no price feeds
  97: [],

  // Localhost - no price feeds
  31337: [],
};

/**
 * WBTC/stablecoin pools on Ethereum mainnet for BTC price
 * WBTC has 8 decimals
 */
export const WBTC_POOLS: PricePoolConfig[] = [
  {
    poolAddress: "0x004375Dff511095CC5A197A54140a24eFEF3A416", // WBTC/USDC Uniswap V2
    stablecoinDecimals: 6,
    nativeTokenDecimals: 8, // WBTC has 8 decimals
    isToken0Native: true, // WBTC is token0, USDC is token1
    name: "Uniswap V2 WBTC/USDC",
  },
  {
    poolAddress: "0x0de845955E2bF089012F682fE9bC81dD5f11B372", // WBTC/USDT Uniswap V2
    stablecoinDecimals: 6,
    nativeTokenDecimals: 8, // WBTC has 8 decimals
    isToken0Native: true, // WBTC is token0, USDT is token1
    name: "Uniswap V2 WBTC/USDT",
  },
];

/**
 * Get price pool configs for a network
 */
export function getPricePoolsForNetwork(chainId: number): PricePoolConfig[] {
  return PRICE_POOLS[chainId] || [];
}

/**
 * Get WBTC pools for BTC price calculation
 */
export function getWBTCPools(): PricePoolConfig[] {
  return WBTC_POOLS;
}

/**
 * Check if a network has price feeds configured
 */
export function hasPriceFeeds(chainId: number): boolean {
  const pools = PRICE_POOLS[chainId];
  return pools !== undefined && pools.length > 0;
}
