// cspell:ignore pancakeswap binance busd wbnb staking validator
export const BSC = {
  chainId: "56",

  // BNB Smart Chain mainnet launch: September 1, 2020
  // Original block time: 3 seconds
  // After Lorentz (April 2025): 1.5 seconds
  // After Maxwell (June 30, 2025): 0.75 seconds
  // Consensus: Proof-of-Staked-Authority (PoSA) with 21+ validators

  blocks: {
    // Genesis block - BSC mainnet launch (September 1, 2020)
    // Contains initial validator setup and seed fund distribution
    "0": {
      number: 0,
      txCount: 0,
      gasUsed: "0",
      gasLimit: "30,000,000",
      hash: "0x0d21840abff46b96c84b2ac9e10e4f5cdaeb5693cb665db62a2f3b02d2d57b5b",
      parentHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    },
    // Block 10,000,000 (December 2021)
    // Pre-Euler, early BSC activity
    "10000000": {
      number: 10000000,
      gasUsed: "36,309,493",
      gasUsedPercent: "42.8%",
      gasLimit: "84,934,464",
      hash: "0xd08dca8c7d87780ca6f2faed2e12508d431939f7d7c3fa0d052f0744e1a47e55",
      parentHash: "0x6b77d2519fc680931d57729aac79a1a30c9c7a9e684499d7ed52fa800f9c799c",
    },
    // Block 20,000,000 (August 2022)
    // Post-Euler upgrade
    "20000000": {
      number: 20000000,
      txCount: 321,
      gasUsed: "26,602,654",
      gasUsedPercent: "28.3%",
      gasLimit: "94,082,549",
      hash: "0xba219d00ab4ea174ead8efa90c80e9d9f9990e221bf8e7da1881ec210edbb879",
      parentHash: "0xafbeac4631e64db3bb1a23d318b3fd9cb6c81b2d9e8bc50c5c46d25eb2aa6dfc",
    },
    // Block 30,000,000 (July 2023)
    // Post-Luban, fast finality enabled
    "30000000": {
      number: 30000000,
      gasUsed: "21,238,276",
      gasUsedPercent: "15.2%",
      gasLimit: "140,001,959",
      hash: "0x0fe1b87f3d62477a866bbd2327139b884c0dc057f11dc273f8bed34fe699efbd",
      parentHash: "0x577bde40f5e997be68cc6b2e98ae97024b86e6a15ac00b6a515dc373ec9d57c4",
    },
    // Block 40,000,000 (June 2024)
    // Post-Feynman, after BNB Chain Fusion
    "40000000": {
      number: 40000000,
      txCount: 107,
      gasUsed: "11,270,569",
      gasUsedPercent: "8.1%",
      gasLimit: "139,456,038",
      hash: "0x095f88c4f4855eab7bc6bb7161ade81adf7d60e11804d40197e4388227d1eddf",
      parentHash: "0x5743a53c47bccbc29dad622be65ac9652b7980eefc9776e1e328b190c546851f",
    },
    // Block 50,000,000 (May 2025)
    // Post-Maxwell, 0.75s block time
    "50000000": {
      number: 50000000,
      txCount: 358,
      gasUsed: "50,409,444",
      gasUsedPercent: "72.0%",
      gasLimit: "70,000,000",
      hash: "0x66132739a8759cd2fc911fb31eee5a6beaefaa25cf25385b6dec775f7ba02192",
      parentHash: "0x551190b5d3d2a5de87becc1612c03a2568e7fc1c865a0e3d68776b16573c2789",
    },
  },

  transactions: {
    // ============================================
    // LEGACY TRANSACTIONS (Type 0)
    // ============================================

    // Contract interaction from block 20,000,000 - Legacy transaction
    // Real transaction with verified on-chain data
    "0xad5c9b13688627d670985d68a5be0fadd5f0e34d3ff20e35c655ef4bceec7e7c": {
      hash: "0xad5c9b13688627d670985d68a5be0fadd5f0e34d3ff20e35c655ef4bceec7e7c",
      type: 0, // Legacy transaction
      from: "0x67e83034d88c665c661c77f8c9a1a6464224ee9d",
      to: "0x0303d52057efef51eeea9ad36bc788df827f183d",
      value: "0x0",
      blockNumber: 20000000,
      gas: "700,000",
      gasUsed: "40,462",
      gasPrice: "25.21 Gwei",
      nonce: 266694,
      position: 0,
      status: "success" as const,
      hasInputData: true,
    },

    // DEX swap from block 40,000,000 - Legacy transaction
    // swapExactTokensForTokens on a DEX router
    "0x0e3384ad2350d20921190b15e29305ed08eecfe97de975b6e015a6c6d476a90a": {
      hash: "0x0e3384ad2350d20921190b15e29305ed08eecfe97de975b6e015a6c6d476a90a",
      type: 0, // Legacy transaction
      from: "0xbb6694f2ce58d9c83b35ad65da6f6423756e0585",
      to: "0xeddb16da43daed83158417955dc0c402c61e7e7d",
      value: "0x0",
      blockNumber: 40000000,
      gas: "257,348",
      gasUsed: "170,460",
      gasPrice: "7 Gwei",
      nonce: 39,
      position: 0,
      status: "success" as const,
      hasInputData: true,
      method: "swapExactTokensForTokens",
    },

    // DEX aggregator swap from block 50,000,000 - Legacy transaction
    // Complex multi-hop swap with many token transfers
    "0x874a90a47bc3140adbffff0f4b89da4bea48f9420f97bc5a50e2e478d9a06176": {
      hash: "0x874a90a47bc3140adbffff0f4b89da4bea48f9420f97bc5a50e2e478d9a06176",
      type: 0, // Legacy transaction
      from: "0x05a13e324ac38d76e06dd95f72194f1570f5fa7d",
      to: "0x22444f9024367c1313613d54efa31f0aaf8627d7",
      value: "0x0",
      blockNumber: 50000000,
      gas: "1,397,513",
      gasUsed: "906,323",
      gasPrice: "0.1 Gwei",
      nonce: 20548,
      position: 2,
      status: "success" as const,
      hasInputData: true,
    },
  },

  addresses: {
    // ============================================
    // ERC20/BEP20 TOKENS
    // ============================================

    // Wrapped BNB (WBNB)
    wbnb: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      type: "erc20" as const,
      symbol: "WBNB",
      name: "Wrapped BNB",
      decimals: 18,
    },
    // USDT (Binance-Peg BSC-USD)
    usdt: {
      address: "0x55d398326f99059fF775485246999027B3197955",
      type: "erc20" as const,
      symbol: "USDT",
      name: "Binance-Peg BSC-USD",
      decimals: 18,
    },
    // BUSD (Binance-Peg BUSD Token)
    busd: {
      address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
      type: "erc20" as const,
      symbol: "BUSD",
      name: "Binance-Peg BUSD Token",
      decimals: 18,
    },
    // USDC (Binance-Peg USD Coin)
    usdc: {
      address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      type: "erc20" as const,
      symbol: "USDC",
      name: "Binance-Peg USD Coin",
      decimals: 18,
    },
    // CAKE (PancakeSwap Token)
    cake: {
      address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
      type: "erc20" as const,
      symbol: "Cake",
      name: "PancakeSwap Token",
      decimals: 18,
    },
    // DAI (Binance-Peg Dai Token)
    dai: {
      address: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3",
      type: "erc20" as const,
      symbol: "DAI",
      name: "Binance-Peg Dai Token",
      decimals: 18,
    },

    // ============================================
    // DEX CONTRACTS
    // ============================================

    // PancakeSwap Router v2 - Main DEX on BSC
    pancakeswapRouterV2: {
      address: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
      type: "contract" as const,
      name: "PancakeSwap: Router v2",
    },
    // PancakeSwap Factory v2
    pancakeswapFactoryV2: {
      address: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
      type: "contract" as const,
      name: "PancakeSwap: Factory v2",
    },
    // PancakeSwap Universal Router
    pancakeswapUniversalRouter: {
      address: "0x1A0A18AC4BECDDbd6389559687d1A73d8927E416",
      type: "contract" as const,
      name: "PancakeSwap: Universal Router",
    },

    // ============================================
    // SYSTEM CONTRACTS (BSC predeploys)
    // ============================================

    // Validator Set Contract - Manages validator elections
    validatorSet: {
      address: "0x0000000000000000000000000000000000001000",
      type: "contract" as const,
      name: "BSC: Validator Set",
    },
    // Slash Contract - Handles validator slashing
    slashContract: {
      address: "0x0000000000000000000000000000000000001001",
      type: "contract" as const,
      name: "BSC: Slash Contract",
    },
    // System Reward Contract - Distributes system rewards
    systemReward: {
      address: "0x0000000000000000000000000000000000001002",
      type: "contract" as const,
      name: "BSC: System Reward",
    },
    // Light Client Contract
    lightClient: {
      address: "0x0000000000000000000000000000000000001003",
      type: "contract" as const,
      name: "BSC: Light Client",
    },
    // Token Hub - Cross-chain token management
    tokenHub: {
      address: "0x0000000000000000000000000000000000001004",
      type: "contract" as const,
      name: "BSC: Token Hub",
    },
    // Relayer Hub - Cross-chain relayer management
    relayerHub: {
      address: "0x0000000000000000000000000000000000001006",
      type: "contract" as const,
      name: "BSC: Relayer Hub",
    },
    // Staking Contract - Manages BNB staking
    stakeHub: {
      address: "0x0000000000000000000000000000000000002002",
      type: "contract" as const,
      name: "BSC: Stake Hub",
    },
    // Governor Contract - Governance
    governor: {
      address: "0x0000000000000000000000000000000000002004",
      type: "contract" as const,
      name: "BSC: Governor",
    },

    // ============================================
    // STAKING CONTRACTS
    // ============================================

    // PancakeSwap Main Staking Contract
    pancakeswapStaking: {
      address: "0x73feaa1eE314F8c655E354234017bE2193C9E24E",
      type: "contract" as const,
      name: "PancakeSwap: Main Staking Contract",
    },
    // PancakeSwap Cake Pool
    pancakeswapCakePool: {
      address: "0x45c54210128a065de780C4B0Df3d16664f7f859e",
      type: "contract" as const,
      name: "PancakeSwap: Cake Pool",
    },
  },

  // Upgrade block heights and timestamps for reference
  upgrades: {
    bruno: {
      blockHeight: 13082000,
      timestamp: 1638259200,
      date: "2021-11-30T08:00:00Z",
      description: "Real-time BNB burning mechanism (BEP-95)",
    },
    euler: {
      blockHeight: 18907621,
      timestamp: 1655884800,
      date: "2022-06-22T08:00:00Z",
      description: "Increased validators, enhanced decentralization (BEP-127/131)",
    },
    planck: {
      blockHeight: 27281024,
      timestamp: 1681274400,
      date: "2023-04-12T05:30:00Z",
      description: "Cross-chain security enhancements (ICS23)",
    },
    luban: {
      blockHeight: 29020050,
      timestamp: 1686516600,
      date: "2023-06-11T21:30:00Z",
      description: "Fast finality mechanism capability (BEP-126)",
    },
    plato: {
      blockHeight: 30720096,
      timestamp: 1691668800,
      date: "2023-08-10T12:00:00Z",
      description: "Fast finality fully enabled (BEP-126)",
    },
    hertz: {
      blockHeight: 31302048,
      timestamp: 1693382400,
      date: "2023-08-30T07:30:00Z",
      description: "Berlin/London EIPs for EVM compatibility",
    },
    feynman: {
      timestamp: 1713430140,
      date: "2024-04-18T05:49:00Z",
      description: "BNB Chain Fusion, validators increased to 45",
    },
    tycho: {
      timestamp: 1718668800,
      date: "2024-06-18T00:00:00Z",
      description: "Blob transactions support (BEP-336)",
    },
    bohr: {
      timestamp: 1727350800,
      date: "2024-09-26T12:00:00Z",
      description: "Consecutive block production (BEP-341)",
    },
    pascal: {
      timestamp: 1741996800,
      date: "2025-03-15T00:00:00Z",
      description: "Smart contract wallets (EIP-7702), BLS12-381",
    },
    lorentz: {
      timestamp: 1745366400,
      date: "2025-04-22T00:00:00Z",
      description: "Block time reduced to 1.5 seconds",
    },
    maxwell: {
      timestamp: 1751270400,
      date: "2025-06-30T00:00:00Z",
      description: "Block time reduced to 0.75 seconds (BEP-524/563/564)",
    },
    fermi: {
      timestamp: 1736825400,
      date: "2026-01-14T02:30:00Z",
      description: "Block time reduced to 0.45 seconds (BEP-619/590)",
    },
  },
};
