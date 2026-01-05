// cspell:ignore arbos nitro uniswap sequencer
export const ARBITRUM = {
  chainId: "42161",

  // Arbitrum One mainnet launched: August 31, 2021
  // Nitro upgrade: Block #22,207,817 (August 31, 2022)
  // Block time: ~0.25 seconds (variable)

  blocks: {
    // Genesis block - Arbitrum One launch
    "0": {
      number: 0,
      txCount: 0,
      gasUsed: "0",
      gasLimit: "288,000,000",
      hash: "0x7ee576b35482195fc49205cec9af72ce14f003b9ae69f6ba0faef4514be8b442",
    },
    // Nitro upgrade block (August 31, 2022)
    // Massive upgrade - new architecture, faster, cheaper
    "22207817": {
      number: 22207817,
      txCount: 0,
      gasUsed: "0",
      size: "553 bytes",
      upgradeNote: "Nitro upgrade - new architecture",
    },
    // Block 100,000,000 (June 11, 2023)
    // Post-Nitro, pre-ArbOS 11
    "100000000": {
      number: 100000000,
      txCount: 4,
      gasUsed: "2,059,307",
      gasUsedPercent: "0.0%", // Very large gas limit on Arbitrum
      gasLimit: "1,125,899,906,842,624",
      size: "1,225 bytes",
      baseFeePerGas: "0.1 Gwei",
      // Fee recipient is the sequencer address
      feeRecipientPartial: "0xa4b00000",
      // More details section
      hash: "0xb5aeb03c97e45c59596b70905d077663bccfea4533bf3b2c3264871725ea86a8",
      parentHash: "0x1e3abf9d4545f0ed50137b68e1a5044fcad217d492ba2d92585cc101bbf03c9d",
      nonce: "0x00000000000dd6ce",
    },
    // Block 200,000,000 (April 11, 2024)
    // Post-ArbOS 20 Atlas (Dencun support)
    "200000000": {
      number: 200000000,
      txCount: 2,
      gasUsed: "55,132",
      gasUsedPercent: "0.0%",
      gasLimit: "1,125,899,906,842,624",
      size: "801 bytes",
      baseFeePerGas: "0.01 Gwei",
      feeRecipientPartial: "0xa4b00000",
      // More details section
      hash: "0xfbb039d0d0e358b4d65f3df3058026fe5576beee3ed1fa2c1ad677d2efe0f3c1",
      parentHash: "0x76bb92461bfba3e3d0dffd589b47170979891096d39f0173b41b7ce25bb9b5b1",
    },
    // Block 300,000,000 (January 28, 2025)
    // Post-ArbOS 32 Bianca (Stylus)
    "300000000": {
      number: 300000000,
      txCount: 4,
      gasUsed: "913,478",
      gasUsedPercent: "0.0%",
      gasLimit: "1,125,899,906,842,624",
      size: "1,073 bytes",
      baseFeePerGas: "0.01 Gwei",
      feeRecipientPartial: "0xa4b00000",
    },
  },

  transactions: {
    // ============================================
    // LEGACY TRANSACTIONS (Type 0)
    // ============================================

    // Uniswap V3 swap via multicall - Legacy transaction
    "0x87815a816c02b5a563a026e4a37d423734204b50972e75284b62f05e4134ae44": {
      hash: "0x87815a816c02b5a563a026e4a37d423734204b50972e75284b62f05e4134ae44",
      type: 0, // Legacy transaction
      from: "0x6Cd9642Af3991e761C2785f9C958F148d6AeA4F8",
      to: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Uniswap V3 Router
      value: "0x31c7fb4fe7a0717", // ~0.224 ETH
      blockNumber: 416908399,
      gas: "1,200,000",
      gasUsed: "143,833",
      gasPrice: "0.01 Gwei",
      nonce: 82,
      status: "success" as const,
      hasInputData: true,
      method: "multicall",
    },

    // ============================================
    // EIP-1559 TRANSACTIONS (Type 2)
    // ============================================

    // USDC transfer (EIP-1559)
    "0x160687cbf03f348cf36997dbab53abbd32d91af5971bccac4cfa1577da27607e": {
      hash: "0x160687cbf03f348cf36997dbab53abbd32d91af5971bccac4cfa1577da27607e",
      type: 2, // EIP-1559
      from: "0xb7990f2266a97A1f06b0F1828b2fE46B3582456F",
      to: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC
      value: "0x0",
      blockNumber: 416908475,
      gas: "45,632",
      gasUsed: "40,235",
      maxFeePerGas: "0.01 Gwei",
      maxPriorityFeePerGas: "0.000159827 Gwei",
      nonce: 4,
      status: "success" as const,
      hasInputData: true,
      method: "transfer",
    },
  },

  addresses: {
    // ============================================
    // ERC20 TOKENS
    // ============================================

    // Native USDC on Arbitrum - Circle's native USDC
    usdc: {
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      type: "erc20" as const,
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
    // Bridged USDC.e (legacy)
    usdce: {
      address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
      type: "erc20" as const,
      symbol: "USDC.e",
      name: "Bridged USDC",
      decimals: 6,
    },
    // WETH on Arbitrum
    weth: {
      address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      type: "erc20" as const,
      symbol: "WETH",
      name: "Wrapped Ether",
      decimals: 18,
    },
    // ARB token - Arbitrum governance token
    arb: {
      address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
      type: "erc20" as const,
      symbol: "ARB",
      name: "Arbitrum",
      decimals: 18,
    },
    // GMX token
    gmx: {
      address: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
      type: "erc20" as const,
      symbol: "GMX",
      name: "GMX",
      decimals: 18,
    },

    // ============================================
    // DEX CONTRACTS
    // ============================================

    // Uniswap V3 Router
    uniswapV3Router: {
      address: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      type: "contract" as const,
      name: "Uniswap V3: Swap Router",
    },
    // Uniswap Universal Router
    uniswapUniversalRouter: {
      address: "0x4C60051384bd2d3C01bfc845Cf5F4b44bcbE9de5",
      type: "contract" as const,
      name: "Uniswap: Universal Router",
    },
    // GMX Vault
    gmxVault: {
      address: "0x489ee077994B6658eAfA855C308275EAd8097C4A",
      type: "contract" as const,
      name: "GMX: Vault",
    },
    // GMX Position Router
    gmxPositionRouter: {
      address: "0xb87a436B93fFe9D75c5cFA7baCFFF96430b09868",
      type: "contract" as const,
      name: "GMX: Position Router",
    },

    // ============================================
    // ARBITRUM SYSTEM CONTRACTS (precompiles)
    // ============================================

    // ArbSys - Arbitrum system precompile
    arbSys: {
      address: "0x0000000000000000000000000000000000000064",
      type: "contract" as const,
      name: "ArbSys",
    },
    // ArbRetryableTx - Retryable ticket system
    arbRetryableTx: {
      address: "0x000000000000000000000000000000000000006E",
      type: "contract" as const,
      name: "ArbRetryableTx",
    },
    // NodeInterface - Node queries
    nodeInterface: {
      address: "0x00000000000000000000000000000000000000C8",
      type: "contract" as const,
      name: "NodeInterface",
    },
  },

  // ArbOS upgrade history
  upgrades: {
    nitro: {
      block: 22207817,
      date: "2022-08-31T14:32:22Z",
      description: "Nitro upgrade - new architecture, faster, cheaper",
    },
    arbos11: {
      timestamp: 1708809673,
      date: "2024-02-24T20:01:13Z",
      description: "Shanghai EVM support, PUSH0 opcode",
    },
    arbos20Atlas: {
      timestamp: 1710424089,
      date: "2024-03-14T13:48:09Z",
      description: "Dencun support (EIP-4844 blobs)",
    },
    arbos31Bianca: {
      timestamp: 1725386400,
      date: "2024-09-03T17:00:00Z",
      description: "Stylus prep",
    },
    arbos32Bianca: {
      timestamp: 1727239050,
      date: "2024-09-25T02:37:30Z",
      description: "Stylus activation (WASM VM alongside EVM)",
    },
    bold: {
      timestamp: 1739368811,
      date: "2025-02-12T14:00:11Z",
      description: "BoLD dispute resolution",
    },
    arbos40Callisto: {
      timestamp: 1750197383,
      date: "2025-06-17T22:56:23Z",
      description: "Pectra support (EIP-7702)",
    },
    arbos51Dia: {
      timestamp: 1736355600,
      date: "2026-01-08T17:00:00Z",
      description: "Fusaka support (pending)",
    },
  },
};
