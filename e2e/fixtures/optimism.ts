// cspell:ignore velodrome bedrock ecotone fjord holocene isthmus sequencer
export const OPTIMISM = {
  chainId: "10",

  // Optimism mainnet regenesis: November 11, 2021 (current chain)
  // Bedrock upgrade: June 6, 2023 (block ~105,235,063)
  // Block time: 2 seconds
  // Upgrades follow Superchain-wide activation timestamps

  blocks: {
    // Genesis block - Optimism mainnet (post-regenesis)
    // Note: Contains 8,893 transactions from state migration
    "0": {
      number: 0,
      txCount: 8893,
      gasUsed: "0",
      gasLimit: "15,000,000",
      hash: "0x7ca38a1916c42007829c55e69d3e9a73265554b586a499015373241b8a3fa48b",
      parentHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    },
    // Block 100,000,000 (May 20, 2023)
    // Pre-Bedrock block
    "100000000": {
      number: 100000000,
      txCount: 1,
      gasUsed: "108,922",
      gasUsedPercent: "0.7%",
      gasLimit: "15,000,000",
      hash: "0x9bb1d3a1d3deb6f1298011d4bebf994f3ed7d02ae64a491568f78c4ed5124cb5",
      parentHash: "0x9f423a470be5e8c2bcd3c046dd67ceb9f184af92fea432a4016da68240510ce9",
    },
    // Block 110,000,000 (September 24, 2023)
    // Post-Bedrock, pre-Ecotone
    "110000000": {
      number: 110000000,
      txCount: 4,
      gasUsed: "301,587",
      gasUsedPercent: "1.0%",
      gasLimit: "30,000,000",
      baseFeePerGas: "0.063 Gwei",
      hash: "0x429308982bd568afa89a04ccbbc2f07b9058176e19fd6622fd87e346ef07ed23",
      parentHash: "0xdd6583a74ad3d1c383d9f657268d085f6f39d11a53daf0e5fd873dfeb09f0ac7",
      feeRecipientPartial: "0x42000000",
    },
    // Block 120,000,000 (May 13, 2024)
    // Post-Ecotone (EIP-4844 blob support)
    "120000000": {
      number: 120000000,
      txCount: 21,
      gasUsed: "27,554,949",
      gasUsedPercent: "91.9%",
      gasLimit: "30,000,000",
      baseFeePerGas: "0.06 Gwei",
      hash: "0xcad6bf99757384f6f16fac0974aa234bb9bc866d8c89d9a56addbd9a3f13dc13",
      parentHash: "0x8bce6c507e43379bef7817dbf57b9b0181e744a6c5f841d5ee57b4e09f6b09df",
      feeRecipientPartial: "0x42000000",
    },
    // Block 130,000,000 (December 30, 2024)
    // Post-Holocene
    "130000000": {
      number: 130000000,
      txCount: 13,
      gasUsed: "1,535,948",
      gasUsedPercent: "2.6%",
      gasLimit: "60,000,000",
      baseFeePerGas: "0.00000026 Gwei",
      hash: "0xaf131f54209291613f0b74e61903405ea84bf30368ea5c6cf787992351ad843d",
      parentHash: "0x547a69b3a63b80cee045cdcb0759bad305f42aa30dbf6c4fa8fbe70d44e37e65",
      feeRecipientPartial: "0x42000000",
    },
  },

  transactions: {
    // ============================================
    // LEGACY TRANSACTIONS (Type 0)
    // ============================================

    // Velodrome Finance swap - Legacy transaction
    "0xa8d73ea0639f39157f787a29591b36fc73c19b443bbe8416d8d6f24858063910": {
      hash: "0xa8d73ea0639f39157f787a29591b36fc73c19b443bbe8416d8d6f24858063910",
      type: 0, // Legacy transaction
      from: "0x1dE686d54FA9b786870c3b67e1430BD1F08C1c5F",
      to: "0x9c12939390052919aF3155f41Bf4160Fd3666A6f", // Velodrome Router
      value: "0x0",
      blockNumber: 84855387,
      gas: "331,424",
      gasUsed: "249,652",
      gasPrice: "0.001 Gwei",
      nonce: 89,
      position: 0,
      status: "success" as const,
      hasInputData: true,
      method: "swapExactTokensForTokens",
      // L2 fee breakdown (Optimism specific)
      l2Fee: "0.000000249652 ETH",
      l1Fee: "0.000229678666963588 ETH",
      txFee: "0.000229928318963588 ETH",
    },

    // ============================================
    // EIP-1559 TRANSACTIONS (Type 2)
    // ============================================

    // OP token transfer (EIP-1559)
    "0xdcf7c4afb479cd47f7ce263cbbb298f559b81fc592cc07737935a6166fb90f0c": {
      hash: "0xdcf7c4afb479cd47f7ce263cbbb298f559b81fc592cc07737935a6166fb90f0c",
      type: 2, // EIP-1559
      from: "0x29185eB8cfD22Aa719529217bFbadE61677e0Ad2",
      to: "0x4200000000000000000000000000000000000042", // OP Token
      value: "0x0",
      blockNumber: 120011272,
      gas: "40,358",
      gasUsed: "39,988",
      maxFeePerGas: "0.191 Gwei",
      maxPriorityFeePerGas: "0.004 Gwei",
      effectiveGasPrice: "0.066 Gwei",
      nonce: 190,
      position: 11,
      status: "success" as const,
      hasInputData: true,
      method: "transfer",
      txFee: "0.000002714211193107 ETH",
    },

    // OP token delegate (EIP-1559)
    "0x36a239e68d43afbb742a66e2c5456f443e20e2bf79812f8ee80d2c444bcb5d89": {
      hash: "0x36a239e68d43afbb742a66e2c5456f443e20e2bf79812f8ee80d2c444bcb5d89",
      type: 2, // EIP-1559
      from: "0x7192744441e4C9845408b5928b80cA5dd40C41bF",
      to: "0x4200000000000000000000000000000000000042", // OP Token
      value: "0x0",
      blockNumber: 129267009,
      gas: "99,799",
      gasUsed: "98,824",
      maxFeePerGas: "0.000108 Gwei",
      maxPriorityFeePerGas: "0.0001 Gwei",
      nonce: 161,
      status: "success" as const,
      hasInputData: true,
      method: "delegate",
    },

    // ============================================
    // SYSTEM TRANSACTIONS (Type 126) - OP Stack specific
    // ============================================

    // L2 Cross Domain Messenger relay - System transaction (Type 126)
    "0x5d3522dad0d0745b59e9443733f8423548f99856c00768aba9779ae288dedd0a": {
      hash: "0x5d3522dad0d0745b59e9443733f8423548f99856c00768aba9779ae288dedd0a",
      type: 126, // Deposit transaction type
      from: "0x36BDE71C97B33Cc4729cf772aE268934f7AB70B2", // Aliased L1 Cross-Domain Messenger
      to: "0x4200000000000000000000000000000000000007", // L2CrossDomainMessenger
      value: "0x0",
      blockNumber: 106744423,
      gas: "387,675",
      gasUsed: "96,955",
      nonce: 370362,
      status: "success" as const,
      hasInputData: true,
      method: "relayMessage",
      // System transactions have zero fees
      txFee: "0 ETH",
    },
  },

  addresses: {
    // ============================================
    // ERC20 TOKENS
    // ============================================

    // Native USDC on Optimism - Circle's native USDC
    usdc: {
      address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      type: "erc20" as const,
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
    // Bridged USDC.e (legacy)
    usdce: {
      address: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
      type: "erc20" as const,
      symbol: "USDC.e",
      name: "Bridged USDC",
      decimals: 6,
    },
    // WETH on Optimism (predeploy)
    weth: {
      address: "0x4200000000000000000000000000000000000006",
      type: "erc20" as const,
      symbol: "WETH",
      name: "Wrapped Ether",
      decimals: 18,
    },
    // OP token - Optimism governance token
    op: {
      address: "0x4200000000000000000000000000000000000042",
      type: "erc20" as const,
      symbol: "OP",
      name: "Optimism",
      decimals: 18,
    },
    // USDT on Optimism
    usdt: {
      address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
      type: "erc20" as const,
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
    },
    // DAI on Optimism
    dai: {
      address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
      type: "erc20" as const,
      symbol: "DAI",
      name: "Dai Stablecoin",
      decimals: 18,
    },

    // ============================================
    // DEX CONTRACTS
    // ============================================

    // Velodrome Finance Router - Main DEX on Optimism
    velodromeRouter: {
      address: "0x9c12939390052919aF3155f41Bf4160Fd3666A6f",
      type: "contract" as const,
      name: "Velodrome Finance: Router",
    },
    // Velodrome Universal Router (V2)
    velodromeUniversalRouter: {
      address: "0x01D40099fCD87C018969B0e8D4aB1633Fb34763C",
      type: "contract" as const,
      name: "Velodrome: Universal Router",
    },
    // Uniswap V3 Router
    uniswapV3Router: {
      address: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      type: "contract" as const,
      name: "Uniswap V3: Swap Router",
    },
    // Uniswap Universal Router
    uniswapUniversalRouter: {
      address: "0xCb1355ff08Ab38bBCE60111F1bb2B784bE25D7e8",
      type: "contract" as const,
      name: "Uniswap: Universal Router",
    },

    // ============================================
    // BRIDGE CONTRACTS
    // ============================================

    // Optimism Portal (L1 to L2 deposits)
    optimismPortal: {
      address: "0xbEb5Fc579115071764c7423A4f12eDde41f106Ed",
      type: "contract" as const,
      name: "Optimism: Portal",
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
    // L2ToL1MessagePasser - Withdrawals
    l2ToL1MessagePasser: {
      address: "0x4200000000000000000000000000000000000016",
      type: "contract" as const,
      name: "L2ToL1MessagePasser",
    },
    // BaseFeeVault - Collects base fees
    baseFeeVault: {
      address: "0x4200000000000000000000000000000000000019",
      type: "contract" as const,
      name: "BaseFeeVault",
    },
    // L1FeeVault - Collects L1 data fees
    l1FeeVault: {
      address: "0x420000000000000000000000000000000000001A",
      type: "contract" as const,
      name: "L1FeeVault",
    },
  },

  // Upgrade timestamps (Unix) for reference
  upgrades: {
    bedrock: {
      timestamp: 1686079703,
      date: "2023-06-06T16:28:23Z",
      description: "Major architecture upgrade - modular rollup design",
    },
    canyon: {
      timestamp: 1704992401,
      date: "2024-01-11T17:00:01Z",
      description: "Shapella support, EIP-4788 beacon root",
    },
    delta: {
      timestamp: 1708560000,
      date: "2024-02-22T00:00:00Z",
      description: "Span batches for data compression",
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
      description: "Permissionless fault proofs re-enabled",
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
    jovian: {
      timestamp: 1764691201,
      date: "2025-12-02T16:00:01Z",
      description: "Future upgrade (pending)",
    },
  },
};
