// cspell:ignore aerodrome superchain sequencer
export const BASE = {
  chainId: "8453",

  // Base genesis: June 15, 2023 (timestamp 1686789347)
  // Block time: 2 seconds
  // Upgrades follow Superchain-wide activation timestamps

  blocks: {
    // Genesis block - Base mainnet launch (June 15, 2023)
    "0": {
      number: 0,
      txCount: 0,
      gasUsed: "0",
      gasLimit: "30,000,000",
      hash: "0xf712aa9241cc24369b143cf6dce85f0902a9731e70d66818a3a5845b296c73dd",
      parentHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    },
    // Block 1,000,000 - Early Base block (July 8, 2023)
    // 1 transaction, minimal gas usage
    "1000000": {
      number: 1000000,
      txCount: 1,
      gasUsed: "46,913",
      gasUsedPercent: "0.2%",
      gasLimit: "30,000,000",
      size: "869 bytes",
      baseFeePerGas: "50 wei",
      feeRecipientPartial: "0x42000000",
    },
    // Block 10,000,000 - Pre-Ecotone (February 1, 2024)
    // Before EIP-4844 blob support
    "10000000": {
      number: 10000000,
      txCount: 11,
      gasUsed: "979,572",
      gasUsedPercent: "3.3%",
      gasLimit: "30,000,000",
      size: "4,718 bytes",
      baseFeePerGas: "265 wei",
      feeRecipientPartial: "0x42000000",
    },
    // Block 25,000,000 - Post-Holocene (January 13, 2025)
    // Recent block with increased gas limit
    "25000000": {
      number: 25000000,
      txCount: 248,
      gasUsed: "59,984,755",
      gasUsedPercent: "25.0%",
      gasLimit: "240,000,000",
      size: "91,675 bytes",
      baseFeePerGas: "0.020162741 Gwei",
      feeRecipientPartial: "0x42000000",
    },
  },

  transactions: {
    // ============================================
    // EIP-1559 TRANSACTIONS (Type 2) - Standard on Base
    // ============================================

    // Aerodrome DEX swap transaction - swapExactTokensForTokens
    "0x961cf2c57f006d8c6fdbe266b2ef201159dd135dc560155e8c16d307ee321681": {
      hash: "0x961cf2c57f006d8c6fdbe266b2ef201159dd135dc560155e8c16d307ee321681",
      type: 2,
      from: "0xF9b6a1EB0190bf76274B0876957Ee9F4f508Af41",
      to: "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43", // Aerodrome Router
      value: "0x0",
      gasUsed: "176,474",
      status: "success" as const,
      hasInputData: true,
      method: "swapExactTokensForTokens",
    },

    // USDC transferWithAuthorization - ERC20 interaction
    "0x6b212a5069286d710f388b948364452d28b8c33e0f39b8f50b394ff4deff1f03": {
      hash: "0x6b212a5069286d710f388b948364452d28b8c33e0f39b8f50b394ff4deff1f03",
      type: 2,
      from: "0x3A70788150c7645a21b95b7062ab1784D3cc2104",
      to: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
      value: "0x0",
      gasUsed: "86,212",
      status: "success" as const,
      hasInputData: true,
      method: "transferWithAuthorization",
    },

    // ============================================
    // SYSTEM TRANSACTIONS - OP Stack specific
    // ============================================

    // L1Block setL1BlockValues - System transaction (Type 126)
    // First transaction in block 1 - sets L1 block attributes
    "0x68736fb400dc3b69ab1c4c2cbe75a600aa7ba7cd8d025797ebd8a0108955c91f": {
      hash: "0x68736fb400dc3b69ab1c4c2cbe75a600aa7ba7cd8d025797ebd8a0108955c91f",
      type: 126, // Deposit transaction type
      from: "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001", // System address
      to: "0x4200000000000000000000000000000000000015", // L1Block
      value: "0x0",
      gasUsed: "64,013",
      status: "success" as const,
      hasInputData: true,
      method: "setL1BlockValues",
    },
  },

  addresses: {
    // ============================================
    // ERC20 TOKENS
    // ============================================

    // USDC on Base - Circle's native USDC
    usdc: {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      type: "erc20" as const,
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
    // USDbC - Bridged USDC (legacy)
    usdbc: {
      address: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA",
      type: "erc20" as const,
      symbol: "USDbC",
      name: "USD Base Coin",
      decimals: 6,
    },
    // WETH on Base (predeploy)
    weth: {
      address: "0x4200000000000000000000000000000000000006",
      type: "erc20" as const,
      symbol: "WETH",
      name: "Wrapped Ether",
      decimals: 18,
    },
    // AERO token - Aerodrome governance token
    aero: {
      address: "0x940181a94A35A4569E4529A3CDFb74e38FD98631",
      type: "erc20" as const,
      symbol: "AERO",
      name: "Aerodrome",
      decimals: 18,
    },

    // ============================================
    // DEX CONTRACTS
    // ============================================

    // Aerodrome Router - Main DEX on Base
    aerodromeRouter: {
      address: "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43",
      type: "contract" as const,
      name: "Aerodrome: Router",
    },

    // ============================================
    // SYSTEM CONTRACTS (OP Stack predeploys)
    // ============================================

    // SequencerFeeVault - Receives transaction fees (fee recipient)
    sequencerFeeVault: {
      address: "0x4200000000000000000000000000000000000011",
      type: "contract" as const,
      name: "SequencerFeeVault",
    },
    // L2CrossDomainMessenger - Bridge messaging
    l2CrossDomainMessenger: {
      address: "0x4200000000000000000000000000000000000007",
      type: "contract" as const,
      name: "L2CrossDomainMessenger",
    },
    // L2StandardBridge - Token bridging
    l2StandardBridge: {
      address: "0x4200000000000000000000000000000000000010",
      type: "contract" as const,
      name: "L2StandardBridge",
    },
    // GasPriceOracle - L1 fee calculation
    gasPriceOracle: {
      address: "0x420000000000000000000000000000000000000F",
      type: "contract" as const,
      name: "GasPriceOracle",
    },
    // L1Block - L1 block attributes
    l1Block: {
      address: "0x4200000000000000000000000000000000000015",
      type: "contract" as const,
      name: "L1Block",
    },
  },

  // Upgrade timestamps (Unix) for reference
  upgrades: {
    canyon: {
      timestamp: 1704992401,
      date: "2024-01-11T16:00:01Z",
    },
    delta: {
      timestamp: 1708560000,
      date: "2024-02-22T00:00:00Z",
    },
    ecotone: {
      timestamp: 1710374401,
      date: "2024-03-14T00:00:01Z",
      description: "EIP-4844 blob support, ~90% fee reduction",
    },
    fjord: {
      timestamp: 1720627201,
      date: "2024-07-10T16:00:01Z",
      description: "Brotli compression, RIP-7212 secp256r1 precompile",
    },
    granite: {
      timestamp: 1726070401,
      date: "2024-09-11T16:00:01Z",
      description: "Gas optimizations, permissionless fault proofs",
    },
    holocene: {
      timestamp: 1736445601,
      date: "2025-01-09T18:00:01Z",
      description: "Stricter derivation, EIP-1559 configurability",
    },
    isthmus: {
      timestamp: 1746806401,
      date: "2025-05-09T16:00:01Z",
      description: "Pectra L2 support",
    },
  },
};
