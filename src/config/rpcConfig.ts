// src/config/rpcConfig.ts
/**
 * RPC endpoint configuration for different networks
 * In production, consider using environment variables for API keys
 * Multiple URLs per network are supported for fallback functionality
 */
export const RPC_ENDPOINTS: Record<number, string[]> = {
  // Mainnet - with fallback URLs
  1: [
    process.env.REACT_APP_MAINNET_RPC || 'https://eth.llamarpc.com',
    'https://rpc.ankr.com/eth',
    'https://ethereum.publicnode.com',
    'https://1rpc.io/eth',
  ].filter(Boolean),
  
  // Sepolia - with fallback URLs
  11155111: [
    process.env.REACT_APP_SEPOLIA_RPC || 'https://rpc.sepolia.org',
    'https://rpc2.sepolia.org',
    'https://ethereum-sepolia.publicnode.com',
  ].filter(Boolean),
  
  // Hardhat/Localhost
  31337: [
    process.env.REACT_APP_LOCAL_RPC || 'http://127.0.0.1:8545',
  ].filter(Boolean),
};

/**
 * Get RPC URLs for a given chain ID (returns array for fallback support)
 */
export function getRPCUrls(chainId: number): string[] {
  const urls = RPC_ENDPOINTS[chainId];
  if (!urls || urls.length === 0) {
    throw new Error(`No RPC endpoint configured for chain ID ${chainId}`);
  }
  return urls;
}

/**
 * Get primary RPC URL for a given chain ID (for backwards compatibility)
 * @deprecated Use getRPCUrls instead for fallback support
 */
export function getRPCUrl(chainId: number): string {
  const urls = getRPCUrls(chainId);
  return urls[0]!;
}