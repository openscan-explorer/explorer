export const VALID_ANALYSIS_TYPES = [
  "transaction",
  "account",
  "contract",
  "block",
  "bitcoin_transaction",
  "bitcoin_block",
  "bitcoin_address",
  "zcash_transaction",
  "zcash_block",
  "zcash_address",
] as const;

export type AIAnalysisType = (typeof VALID_ANALYSIS_TYPES)[number];

export interface AnalyzeRequestBody {
  type: AIAnalysisType;
  messages: Array<{ role: "system" | "user"; content: string }>;
}

export interface EtherscanVerifyRequestBody {
  chainId: number;
  address: string;
}

export interface Env {
  GROQ_API_KEY: string;
  ETHERSCAN_API_KEY: string;
  ALCHEMY_API_KEY: string;
  INFURA_API_KEY: string;
  DRPC_API_KEY: string;
  ONFINALITY_BTC_API_KEY: string;
  ANKR_API_KEY: string;
  ALLOWED_ORIGINS: string;
  GROQ_MODEL: string;
}

// ── Beacon types ──────────────────────────────────────────────────────────────

/** Beacon API is only supported on these networks */
export const ALLOWED_BEACON_NETWORKS: Record<string, string> = {
  "eip155:1": "eth-mainnet",
  "eip155:11155111": "eth-sepolia",
};

// ── Bitcoin types ─────────────────────────────────────────────────────────────

export const ALLOWED_BTC_METHODS = [
  "getblock",
  "getrawtransaction",
  "getblockchaininfo",
  "getblockcount",
  "getblockhash",
  "getrawmempool",
  "getmempoolinfo",
  "getmempoolentry",
  "estimatesmartfee",
  "gettxout",
  "scantxoutset",
  "getblockheader",
  "decoderawtransaction",
  "listunspent",
  "validateaddress",
  "getblockstats",
] as const;

export interface BtcRpcRequestBody {
  jsonrpc: string;
  method: string;
  params: unknown[];
  id: unknown;
}

// ── EVM types ─────────────────────────────────────────────────────────────────

/** Read-only EVM methods the explorer is allowed to call through the proxy */
export const ALLOWED_EVM_METHODS = [
  // ── Standard read methods ───────────────────────────────────────────────────
  "web3_clientVersion",
  "web3_sha3",
  "net_version",
  "net_listening",
  "net_peerCount",
  "eth_blockNumber",
  "eth_chainId",
  "eth_gasPrice",
  "eth_maxPriorityFeePerGas",
  "eth_feeHistory",
  "eth_syncing",
  "eth_protocolVersion",
  "eth_getBalance",
  "eth_getCode",
  "eth_getStorageAt",
  "eth_getTransactionCount",
  "eth_getProof",
  "eth_call",
  "eth_estimateGas",
  "eth_createAccessList",
  "eth_getLogs",
  // ── Block methods ───────────────────────────────────────────────────────────
  "eth_getBlockByNumber",
  "eth_getBlockByHash",
  "eth_getBlockTransactionCountByHash",
  "eth_getBlockTransactionCountByNumber",
  "eth_getBlockReceipts",
  "eth_getUncleCountByBlockHash",
  "eth_getUncleCountByBlockNumber",
  "eth_getUncleByBlockHashAndIndex",
  "eth_getUncleByBlockNumberAndIndex",
  // ── Transaction methods ─────────────────────────────────────────────────────
  "eth_getTransactionByHash",
  "eth_getTransactionByBlockHashAndIndex",
  "eth_getTransactionByBlockNumberAndIndex",
  "eth_getTransactionReceipt",
  "eth_getTransactionBySenderAndNonce",
  // ── Debug / trace methods ───────────────────────────────────────────────────
  "debug_traceTransaction",
  "debug_traceCall",
  "debug_traceBlockByHash",
  "debug_traceBlockByNumber",
  "trace_transaction",
  "trace_block",
  "trace_call",
  "trace_filter",
  "trace_replayBlockTransactions",
  "trace_replayTransaction",
  // ── Arbitrum-specific ───────────────────────────────────────────────────────
  "arbtrace_transaction",
  "arbtrace_block",
  "arbtrace_call",
  "arbtrace_callMany",
  // ── BNB-specific ────────────────────────────────────────────────────────────
  "eth_getHeaderByNumber",
  "eth_getTransactionsByBlockNumber",
  "eth_getTransactionDataAndReceipt",
  "eth_getFinalizedBlock",
  "eth_getFinalizedHeader",
  "eth_getBlobSidecars",
  "eth_getBlobSidecarByTxHash",
  "eth_health",
  // ── Avalanche-specific ──────────────────────────────────────────────────────
  "eth_baseFee",
  "eth_getChainConfig",
] as const;

/** Maps CAIP-2 networkId → { alchemy slug, infura slug, drpc slug, ankr slug } */
export const ALLOWED_EVM_NETWORKS: Record<
  string,
  { alchemy: string; infura?: string; drpc: string; ankr: string }
> = {
  "eip155:1": { alchemy: "eth-mainnet", infura: "mainnet", drpc: "ethereum", ankr: "eth" },
  "eip155:11155111": {
    alchemy: "eth-sepolia",
    infura: "sepolia",
    drpc: "sepolia",
    ankr: "eth_sepolia",
  },
  "eip155:42161": {
    alchemy: "arb-mainnet",
    infura: "arbitrum-mainnet",
    drpc: "arbitrum",
    ankr: "arbitrum",
  },
  "eip155:10": {
    alchemy: "opt-mainnet",
    infura: "optimism-mainnet",
    drpc: "optimism",
    ankr: "optimism",
  },
  "eip155:8453": { alchemy: "base-mainnet", infura: "base-mainnet", drpc: "base", ankr: "base" },
  "eip155:137": {
    alchemy: "polygon-mainnet",
    infura: "polygon-mainnet",
    drpc: "polygon",
    ankr: "polygon",
  },
  "eip155:56": { alchemy: "bnb-mainnet", drpc: "bsc", ankr: "bsc" },
  "eip155:43114": {
    alchemy: "avax-mainnet",
    infura: "avalanche-mainnet",
    drpc: "avalanche",
    ankr: "avalanche",
  },
};

export interface EvmRpcRequestBody {
  jsonrpc: string;
  method: string;
  params: unknown[];
  id: unknown;
}
