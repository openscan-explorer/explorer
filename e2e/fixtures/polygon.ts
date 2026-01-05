// cspell:ignore quickswap uniswap aavegotchi opensea matic heimdall
export const POLYGON = {
  chainId: "137",

  // Polygon PoS mainnet launch: May 30, 2020
  // Originally Matic Network, rebranded to Polygon in February 2021
  // Block time: ~2 seconds
  // Consensus: Proof-of-Stake with Heimdall (consensus) + Bor (block production)
  // Native token: MATIC (migrated to POL in September 2024)

  blocks: {
    // Genesis block - Polygon PoS mainnet launch (May 30, 2020)
    "0": {
      number: 0,
      txCount: 0,
      gasUsed: "0",
      gasLimit: "10,000,000",
      hash: "0xa9c28ce2141b56c474f1dc504bee9b01eb1bd7d1a507580d5519d4437a97de1b",
      parentHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    },
    // Block 10,000,000 (January 2021)
    // Early Polygon activity
    "10000000": {
      number: 10000000,
      txCount: 5,
      gasUsed: "4,278,607",
      gasUsedPercent: "21.4%",
      gasLimit: "20,000,000",
      hash: "0x57d179b4ed2379580c46d9809c8918e28c4f1debea8e15013749694f37c14105",
      parentHash: "0xee82cb38f164bfdb75092bcc5c1cb302385a48b2d9abd647af934ecb89db61f4",
    },
    // Block 20,000,000 (October 2021)
    // Growing DeFi activity
    "20000000": {
      number: 20000000,
      txCount: 110,
      gasUsed: "19,998,514",
      gasUsedPercent: "100.0%",
      gasLimit: "20,000,000",
      hash: "0x8b047896ef57b3ebe10a6b0e4cc28a1e0491b09706c6e0f2b5eff3992cf04730",
      parentHash: "0x3a61eaf4cc52b8c3a217fbcfd0e862b59e01d504368b659db9314921879dcf9e",
    },
    // Block 30,000,000 (July 2022)
    // Mature network, increased gas limit
    "30000000": {
      number: 30000000,
      txCount: 133,
      gasUsed: "18,658,580",
      gasUsedPercent: "62.2%",
      gasLimit: "30,000,000",
      hash: "0xd409f8e3d2db0568634bcedc71ae48f4ed8dfcececb723db218a0fc37a5e8d44",
      parentHash: "0xa9d361ef8ba2d3c4d05ea5bee19026e9cad27ae1e95cf9bc86ec30e246aba9f4",
    },
    // Block 38,189,056 (January 17, 2023)
    // Delhi Hard Fork - reduced sprint length, smoothed baseFee
    "38189056": {
      number: 38189056,
      txCount: 121,
      gasUsed: "19,246,742",
      gasUsedPercent: "68.2%",
      gasLimit: "28,207,416",
      hash: "0x19bcd5f19d3f928aae2b582b0e005c963a8ef0bfd005d1b639a5b0b5dbd632d6",
      parentHash: "0x9c0a52241e01b66eb8987f894dea8b22d4ba1e2261217ddbaf4638c8699df79e",
    },
    // Block 50,000,000 (November 2023)
    // Post-Delhi, high activity
    "50000000": {
      number: 50000000,
      txCount: 564,
      gasUsed: "26,134,824",
      gasUsedPercent: "88.4%",
      gasLimit: "29,563,532",
      hash: "0xed6bc55bb3fbf391fb47a96bb0327906a2dab5f50c1330f89684b79a5195efaa",
      parentHash: "0xafe719f6ca102ab7b7b9fd367688e73a777d02d21d6a692a8ff6a6eb3c2f7c27",
    },
    // Block 62,278,656 (September 25, 2024)
    // Ahmedabad Hard Fork - MATIC to POL migration
    "62278656": {
      number: 62278656,
      txCount: 65,
      gasUsed: "7,292,621",
      gasUsedPercent: "24.0%",
      gasLimit: "30,442,418",
      hash: "0xc207d13429c37fded959648b9f6d5d51d4cb65371c9b2f3a40f93f750cf000c4",
      parentHash: "0xbfe87634499bbba796ad1b7d064c97354a12ea43c3f2f8f0a91a3d9987ef883e",
    },
    // Block 65,000,000 (December 2024)
    // Post-Ahmedabad, POL era
    "65000000": {
      number: 65000000,
      txCount: 103,
      gasUsed: "13,884,738",
      gasUsedPercent: "46.3%",
      gasLimit: "30,000,000",
      hash: "0x40a243f82db77b7557e7b56808e93ef72c5bc83f16ad5ede236b496a78736eb6",
      parentHash: "0x5fa5e769a0b2bd46a7f857af0507587d2d02f67305d917dfdeeb2d6087b21a18",
    },
  },

  transactions: {
    // ============================================
    // LEGACY TRANSACTIONS (Type 0)
    // ============================================

    // OpenSea NFT transfer from block 30,000,000 - Legacy transaction
    "0xb14598e46791c2f0ab366ba2fd4a533e21a0c9894f902773e02e3869b7373c3e": {
      hash: "0xb14598e46791c2f0ab366ba2fd4a533e21a0c9894f902773e02e3869b7373c3e",
      type: 0, // Legacy transaction
      from: "0x3ce07ad298ee2b3aabea8c8b3f496c3acc51e647",
      to: "0x2953399124f0cbb46d2cbacd8a89cf0599974963", // OpenSea Storefront
      value: "0x0",
      blockNumber: 30000000,
      gas: "189,792",
      gasUsed: "89,556",
      gasPrice: "125 Gwei",
      nonce: 30554656,
      position: 0,
      status: "success" as const,
      hasInputData: true,
    },

    // ============================================
    // EIP-1559 TRANSACTIONS (Type 2)
    // ============================================

    // Failed DeFi swap from block 50,000,000 - EIP-1559 transaction
    "0x1ed0c46bafb76d5a3d8201cdf8fc732efa97b000d88bd48dc203ac45d6340af0": {
      hash: "0x1ed0c46bafb76d5a3d8201cdf8fc732efa97b000d88bd48dc203ac45d6340af0",
      type: 2, // EIP-1559
      from: "0x2c61d22af7b615d7d41def680b6edac29076709d",
      to: "0x826a4f4da02588737d3c27325b14f39b5151ca3c",
      value: "0x0",
      blockNumber: 50000000,
      gas: "1,000,014",
      gasUsed: "66,787",
      nonce: 2151,
      position: 0,
      status: "failed" as const, // Failed: ERC20 transfer amount exceeds balance
      hasInputData: true,
    },

    // Contract interaction from block 65,000,000 - EIP-1559 transaction
    "0x65edbf03a20a0317295efaeb9c20836b20b16740c8311ce51ceee91d7674b20d": {
      hash: "0x65edbf03a20a0317295efaeb9c20836b20b16740c8311ce51ceee91d7674b20d",
      type: 2, // EIP-1559
      from: "0x706c7fa886ccaf510e570c5fa91f5988b15a8a56",
      to: "0xe957a692c97566efc85f995162fa404091232b2e",
      value: "0x0",
      blockNumber: 65000000,
      gas: "234,624",
      gasUsed: "225,106",
      nonce: 34547,
      position: 0,
      status: "success" as const,
      hasInputData: true,
    },
  },

  addresses: {
    // ============================================
    // ERC20 TOKENS
    // ============================================

    // Wrapped POL (WPOL) - formerly WMATIC
    wpol: {
      address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      type: "erc20" as const,
      symbol: "WPOL",
      name: "Wrapped POL",
      decimals: 18,
    },
    // USDC (Bridged from Ethereum)
    usdc: {
      address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      type: "erc20" as const,
      symbol: "USDC.e",
      name: "USD Coin (Bridged)",
      decimals: 6,
    },
    // Native USDC on Polygon
    usdcNative: {
      address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      type: "erc20" as const,
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
    // USDT on Polygon
    usdt: {
      address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      type: "erc20" as const,
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
    },
    // WETH on Polygon
    weth: {
      address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      type: "erc20" as const,
      symbol: "WETH",
      name: "Wrapped Ether",
      decimals: 18,
    },
    // DAI on Polygon
    dai: {
      address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
      type: "erc20" as const,
      symbol: "DAI",
      name: "Dai Stablecoin",
      decimals: 18,
    },
    // AAVE on Polygon
    aave: {
      address: "0xD6DF932A45C0f255f85145f286eA0b292B21C90B",
      type: "erc20" as const,
      symbol: "AAVE",
      name: "Aave",
      decimals: 18,
    },
    // LINK on Polygon
    link: {
      address: "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39",
      type: "erc20" as const,
      symbol: "LINK",
      name: "ChainLink Token",
      decimals: 18,
    },

    // ============================================
    // DEX CONTRACTS
    // ============================================

    // QuickSwap Router - Main DEX on Polygon
    quickswapRouter: {
      address: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
      type: "contract" as const,
      name: "QuickSwap: Router",
    },
    // Uniswap V3 Router on Polygon
    uniswapV3Router: {
      address: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      type: "contract" as const,
      name: "Uniswap V3: SwapRouter",
    },
    // SushiSwap Router
    sushiswapRouter: {
      address: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
      type: "contract" as const,
      name: "SushiSwap: Router",
    },

    // ============================================
    // NFT CONTRACTS
    // ============================================

    // OpenSea Storefront (Polygon)
    openseaStorefront: {
      address: "0x2953399124F0cBB46d2CbACD8A89cF0599974963",
      type: "contract" as const,
      name: "OpenSea Shared Storefront",
    },

    // ============================================
    // LENDING PROTOCOLS
    // ============================================

    // Aave V3 Pool on Polygon
    aaveV3Pool: {
      address: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
      type: "contract" as const,
      name: "Aave V3: Pool",
    },

    // ============================================
    // BRIDGE CONTRACTS
    // ============================================

    // Polygon PoS Bridge (RootChainManager on Ethereum side)
    polygonBridge: {
      address: "0xA0c68C638235ee32657e8f720a23ceC1bFc77C77",
      type: "contract" as const,
      name: "Polygon: ERC20 Bridge",
    },

    // ============================================
    // SYSTEM CONTRACTS
    // ============================================

    // Child Chain Manager - manages token deposits
    childChainManager: {
      address: "0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa",
      type: "contract" as const,
      name: "Polygon: ChildChainManager",
    },
    // State Receiver - receives state from Ethereum
    stateReceiver: {
      address: "0x0000000000000000000000000000000000001001",
      type: "contract" as const,
      name: "Polygon: StateReceiver",
    },
    // Matic Token (native, system address)
    maticToken: {
      address: "0x0000000000000000000000000000000000001010",
      type: "contract" as const,
      name: "Polygon: POL Token",
    },
  },

  // Upgrade timestamps and block heights for reference
  upgrades: {
    mainnetLaunch: {
      blockHeight: 0,
      timestamp: 1590824836,
      date: "2020-05-30T07:47:16Z",
      description: "Polygon PoS mainnet launch (as Matic Network)",
    },
    rebranding: {
      timestamp: 1613001600,
      date: "2021-02-11T00:00:00Z",
      description: "Matic Network rebrands to Polygon",
    },
    eip1559: {
      blockHeight: 23850000,
      timestamp: 1647619200,
      date: "2022-03-18T08:00:00Z",
      description: "EIP-1559 and London hard fork activation",
    },
    delhi: {
      blockHeight: 38189056,
      timestamp: 1673974800,
      date: "2023-01-17T18:00:00Z",
      description: "Delhi hard fork - reduced sprint length (64→16), smoothed baseFee",
    },
    napoli: {
      timestamp: 1710892800,
      date: "2024-03-20T00:00:00Z",
      description: "Napoli hard fork - RIP-7212 secp256r1 precompile support",
    },
    ahmedabad: {
      blockHeight: 62278656,
      timestamp: 1727344800,
      date: "2024-09-26T09:00:00Z",
      description: "Ahmedabad hard fork - MATIC to POL migration, code size limit increase",
    },
    heimdallV2: {
      heimdallHeight: 24404500,
      timestamp: 1752159600,
      date: "2025-07-10T14:00:00Z",
      description: "Heimdall v2 - consensus layer upgrade to CometBFT, ~5s finality",
    },
    madhugiri: {
      timestamp: 1763920800,
      date: "2025-12-09T00:00:00Z",
      description: "Madhugiri hard fork - 33% throughput increase, 1s consensus time",
    },
  },
};
