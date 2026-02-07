/**
 * Build RPC URL maps from Infura/Alchemy API keys.
 * Reads from environment variables:
 *   - INFURA_API_KEY
 *   - ALCHEMY_API_KEY
 *
 * Returns a map of chainId -> string[] of RPC URLs.
 * If no API keys are set, returns null (tests will use default public RPCs).
 */

interface RpcUrlMap {
  [chainId: string]: string[];
}

const INFURA_NETWORKS: Record<number, string> = {
  1: "mainnet",
  42161: "arbitrum-mainnet",
  10: "optimism-mainnet",
  8453: "base-mainnet",
  137: "polygon-mainnet",
};

const ALCHEMY_NETWORKS: Record<number, string> = {
  1: "eth-mainnet",
  42161: "arb-mainnet",
  10: "opt-mainnet",
  8453: "base-mainnet",
  137: "polygon-mainnet",
};

export function buildRpcUrls(): RpcUrlMap | null {
  const infuraKey = process.env.INFURA_API_KEY;
  const alchemyKey = process.env.ALCHEMY_API_KEY;

  if (!infuraKey && !alchemyKey) {
    return null;
  }

  const chainIds = [1, 42161, 10, 8453, 137];
  const rpcMap: RpcUrlMap = {};

  for (const chainId of chainIds) {
    const urls: string[] = [];

    if (infuraKey && INFURA_NETWORKS[chainId]) {
      urls.push(`https://${INFURA_NETWORKS[chainId]}.infura.io/v3/${infuraKey}`);
    }

    if (alchemyKey && ALCHEMY_NETWORKS[chainId]) {
      urls.push(`https://${ALCHEMY_NETWORKS[chainId]}.g.alchemy.com/v2/${alchemyKey}`);
    }

    if (urls.length > 0) {
      rpcMap[String(chainId)] = urls;
    }
  }

  return Object.keys(rpcMap).length > 0 ? rpcMap : null;
}
