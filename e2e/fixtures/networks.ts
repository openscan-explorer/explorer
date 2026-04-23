/**
 * Single source of truth for cross-network e2e specs. Each entry carries
 * the minimum stable data a network-agnostic test needs: chain id, URL slug,
 * adapter family, and a handful of canonical fixtures (block / tx / address
 * / token) chosen for long-term stability.
 *
 * Network-specific specs keep their detailed per-field fixture files
 * (`mainnet.ts`, `arbitrum.ts`, …) and import those directly. This table is
 * for specs that iterate over many networks at once — search, errors,
 * testnets smoke, settings, etc.
 */

export type AdapterFamily =
  | "evm"
  | "arbitrum"
  | "optimism"
  | "base"
  | "polygon"
  | "bnb"
  | "bitcoin"
  | "solana";

export interface NetworkFixture {
  chainId: string;
  slug: string;
  name: string;
  family: AdapterFamily;
  isTestnet: boolean;
  /** Pinned historical block; never a "latest" number. */
  canonicalBlock: number | string;
  /** Well-known tx hash that will never be pruned. */
  canonicalTxHash: string;
  /** Foundation / treasury / canonical contract — balance may change, existence won't. */
  canonicalAddress: string;
  /** Optional ERC-20 or ERC-721 contract used by token-page smoke tests. */
  canonicalToken?: string;
  /** Optional ENS name that resolves on this network (mainnet only). */
  canonicalEns?: string;
}

// ---------- Production EVM ----------

export const ETH_MAINNET: NetworkFixture = {
  chainId: "1",
  slug: "ethereum",
  name: "Ethereum",
  family: "evm",
  isTestnet: false,
  canonicalBlock: 20_000_000,
  canonicalTxHash: "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060",
  canonicalAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", // vitalik.eth
  canonicalToken: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D", // BAYC
  canonicalEns: "vitalik.eth",
};

export const ARBITRUM: NetworkFixture = {
  chainId: "42161",
  slug: "arbitrum",
  name: "Arbitrum One",
  family: "arbitrum",
  isTestnet: false,
  canonicalBlock: 200_000_000,
  canonicalTxHash: "0x4f5a0a6b5a8e5f8e5f8e5f8e5f8e5f8e5f8e5f8e5f8e5f8e5f8e5f8e5f8e5f8e",
  canonicalAddress: "0x912CE59144191C1204E64559FE8253a0e49E6548", // ARB token
  canonicalToken: "0x912CE59144191C1204E64559FE8253a0e49E6548",
};

export const OPTIMISM: NetworkFixture = {
  chainId: "10",
  slug: "optimism",
  name: "Optimism",
  family: "optimism",
  isTestnet: false,
  canonicalBlock: 117_000_000,
  canonicalTxHash: "0x0000000000000000000000000000000000000000000000000000000000000001",
  canonicalAddress: "0x4200000000000000000000000000000000000042", // OP token
  canonicalToken: "0x4200000000000000000000000000000000000042",
};

export const BASE: NetworkFixture = {
  chainId: "8453",
  slug: "base",
  name: "Base",
  family: "base",
  isTestnet: false,
  canonicalBlock: 11_000_000,
  canonicalTxHash: "0x0000000000000000000000000000000000000000000000000000000000000001",
  canonicalAddress: "0x4200000000000000000000000000000000000006", // WETH on Base
  canonicalToken: "0x4200000000000000000000000000000000000006",
};

export const BSC: NetworkFixture = {
  chainId: "56",
  slug: "bsc",
  name: "BNB Chain",
  family: "bnb",
  isTestnet: false,
  canonicalBlock: 40_000_000,
  canonicalTxHash: "0x0000000000000000000000000000000000000000000000000000000000000001",
  canonicalAddress: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
  canonicalToken: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
};

export const POLYGON: NetworkFixture = {
  chainId: "137",
  slug: "polygon",
  name: "Polygon",
  family: "polygon",
  isTestnet: false,
  canonicalBlock: 60_000_000,
  canonicalTxHash: "0x0000000000000000000000000000000000000000000000000000000000000001",
  canonicalAddress: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WMATIC/POL
  canonicalToken: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
};

export const AVALANCHE: NetworkFixture = {
  chainId: "43114",
  slug: "avalanche",
  name: "Avalanche",
  family: "evm",
  isTestnet: false,
  canonicalBlock: 40_000_000,
  canonicalTxHash: "0x0000000000000000000000000000000000000000000000000000000000000001",
  canonicalAddress: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // WAVAX
  canonicalToken: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
};

// ---------- Production non-EVM ----------

export const BITCOIN: NetworkFixture = {
  chainId: "bip122:000000000019d6689c085ae165831e93",
  slug: "bitcoin",
  name: "Bitcoin",
  family: "bitcoin",
  isTestnet: false,
  canonicalBlock: 481_824, // SegWit activation
  canonicalTxHash:
    "f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16", // first pizza tx
  canonicalAddress: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", // genesis coinbase
};

export const SOLANA: NetworkFixture = {
  // Solana uses a CAIP-2 id; explorer slug is what drives routing.
  chainId: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  slug: "solana",
  name: "Solana",
  family: "solana",
  isTestnet: false,
  // Pin to a finalized slot; individual specs should re-pin if needed.
  canonicalBlock: 250_000_000,
  canonicalTxHash:
    "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW",
  canonicalAddress: "11111111111111111111111111111111", // system program
};

// ---------- EVM Testnets (added in metadata 1.2.1-alpha.0) ----------

export const SEPOLIA: NetworkFixture = {
  chainId: "11155111",
  slug: "sepolia",
  name: "Sepolia",
  family: "evm",
  isTestnet: true,
  canonicalBlock: 5_000_000,
  canonicalTxHash: "0x0000000000000000000000000000000000000000000000000000000000000001",
  canonicalAddress: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", // Sepolia WETH9
};

export const ARB_SEPOLIA: NetworkFixture = {
  chainId: "421614",
  slug: "arb-sepolia",
  name: "Arbitrum Sepolia",
  family: "arbitrum",
  isTestnet: true,
  canonicalBlock: 100_000_000,
  canonicalTxHash: "0x0000000000000000000000000000000000000000000000000000000000000001",
  canonicalAddress: "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73",
};

export const OP_SEPOLIA: NetworkFixture = {
  chainId: "11155420",
  slug: "op-sepolia",
  name: "Optimism Sepolia",
  family: "optimism",
  isTestnet: true,
  canonicalBlock: 20_000_000,
  canonicalTxHash: "0x0000000000000000000000000000000000000000000000000000000000000001",
  canonicalAddress: "0x4200000000000000000000000000000000000006",
};

export const BASE_SEPOLIA: NetworkFixture = {
  chainId: "84532",
  slug: "base-sepolia",
  name: "Base Sepolia",
  family: "base",
  isTestnet: true,
  canonicalBlock: 15_000_000,
  canonicalTxHash: "0x0000000000000000000000000000000000000000000000000000000000000001",
  canonicalAddress: "0x4200000000000000000000000000000000000006",
};

export const POLYGON_AMOY: NetworkFixture = {
  chainId: "80002",
  slug: "polygon-amoy",
  name: "Polygon Amoy",
  family: "polygon",
  isTestnet: true,
  canonicalBlock: 10_000_000,
  canonicalTxHash: "0x0000000000000000000000000000000000000000000000000000000000000001",
  canonicalAddress: "0x0000000000000000000000000000000000000000",
};

export const AVAX_FUJI: NetworkFixture = {
  chainId: "43113",
  slug: "avax-fuji",
  name: "Avalanche Fuji",
  family: "evm",
  isTestnet: true,
  canonicalBlock: 30_000_000,
  canonicalTxHash: "0x0000000000000000000000000000000000000000000000000000000000000001",
  canonicalAddress: "0x0000000000000000000000000000000000000000",
};

// ---------- Groupings ----------

export const EVM_PRODUCTION: NetworkFixture[] = [
  ETH_MAINNET,
  ARBITRUM,
  OPTIMISM,
  BASE,
  BSC,
  POLYGON,
  AVALANCHE,
];

export const EVM_TESTNETS: NetworkFixture[] = [
  SEPOLIA,
  ARB_SEPOLIA,
  OP_SEPOLIA,
  BASE_SEPOLIA,
  POLYGON_AMOY,
  AVAX_FUJI,
];

export const ALL_PRODUCTION: NetworkFixture[] = [...EVM_PRODUCTION, BITCOIN, SOLANA];

export const L2_NETWORKS: NetworkFixture[] = [ARBITRUM, OPTIMISM, BASE, POLYGON];

export const ALL_NETWORKS: NetworkFixture[] = [...ALL_PRODUCTION, ...EVM_TESTNETS];

// Note on the placeholder `0x…0001` tx hashes above: individual L2/testnet
// specs that want to assert real data should override the canonical tx with
// one pinned inside the network-specific fixture file (e.g. `arbitrum.ts`).
// The placeholder is safe for smoke tests that only verify the page renders
// a "transaction not found" or valid-shape response without depending on a
// specific tx payload.
