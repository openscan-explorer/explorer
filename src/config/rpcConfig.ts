// src/config/rpcConfig.ts
/**
 * RPC endpoint configuration for different networks
 * In production, consider using environment variables for API keys
 */
export const RPC_ENDPOINTS: Record<number, string> = {
  // Mainnet
  1: process.env.REACT_APP_MAINNET_RPC || 'https://eth.llamarpc.com',
  
  // Sepolia
  11155111: process.env.REACT_APP_SEPOLIA_RPC || 'https://rpc.sepolia.org',
  
  // Hardhat/Localhost
  31337: process.env.REACT_APP_LOCAL_RPC || 'http://127.0.0.1:8545',
};

/**
 * Get RPC URL for a given chain ID
 */
export function getRPCUrl(chainId: number): string {
  const url = RPC_ENDPOINTS[chainId];
  if (!url) {
    throw new Error(`No RPC endpoint configured for chain ID ${chainId}`);
  }
  return url;
}