# Architecture Overview

## Data Flow Pattern

OpenScan follows a layered architecture with clear separation between data fetching, transformation, and presentation:

### 1. Client Layer (`@openscan/network-connectors`)
Typed RPC clients for blockchain communication:
- `EthereumClient` - Standard JSON-RPC for EVM chains
- `HardhatClient` - Extended client with Hardhat-specific methods (`hardhat_*`, `evm_*`, `debug_*`)
- `BitcoinClient` - Bitcoin JSON-RPC (`getblock`, `getrawtransaction`, etc.)
- `ZcashClient` - Zebra (`zebrad`) JSON-RPC. HTTP only; heights are passed to `getblock` as decimal strings
- Supports `fallback`, `parallel`, and `race` strategies

### 2. Adapter Layer (`services/adapters/`)
Abstract `NetworkAdapter` base class with chain-specific implementations:
- `EVMAdapter` - Default EVM adapter (Ethereum mainnet 1, Sepolia 11155111, Avalanche 43114 + Fuji 43113)
- `ArbitrumAdapter` - Arbitrum One (42161) + Sepolia (421614). Adds `l1BlockNumber`, `sendCount`, `sendRoot`
- `OptimismAdapter` - Optimism (10) + Sepolia (11155420). Adds L1 fee breakdown (`l1Fee`, `l1GasPrice`, `l1GasUsed`)
- `BaseAdapter` - Base (8453) + Sepolia (84532). Adds L1 fee breakdown
- `BNBAdapter` - BSC mainnet (56) + testnet (97)
- `PolygonAdapter` - Polygon (137) + Amoy testnet (80002)
- `HardhatAdapter` - Localhost (31337) with trace support via struct log conversion
- `BitcoinAdapter` - Bitcoin networks (bip122:*) with UTXO model, mempool, and block explorer
- `ZcashAdapter` - Zcash networks (bip122:00040fe8…, bip122:05a60a92…) with shielded pools. Budgets RPC calls for rate-limited hosted gateways and throws `ZcashRpcError` instead of returning empty data
- `SolanaAdapter` - Solana networks
- Each adapter implements: `getBlock`, `getTransaction`, `getAddress`, `getNetworkStats`, trace methods
- `AdapterFactory` routes chain ID to the correct adapter via four entry points:
  `createAdapter` (EVM), `createBitcoinAdapter`, `createZcashAdapter`, `createSolanaAdapter`

### 3. Service Layer (`DataService.ts`)
Orchestrates data fetching with caching and metadata:
- Instantiates the correct adapter via `AdapterFactory` based on chain ID
- Returns `DataWithMetadata<T>` when using parallel strategy
- 30-second in-memory cache keyed by `networkId:type:identifier`
- Supports trace operations for Hardhat (31337) and localhost networks

### 4. Hook Layer (`hooks/`)
React integration:
- `useDataService(networkId)`: Creates DataService instance with strategy from settings
- `useProviderSelection`: Manages user's selected RPC provider in parallel mode
- `useSelectedData`: Extracts data from specific provider based on user selection

### 5. Context Layer (`context/`)
Global state management:
- `AppContext`: RPC URLs configuration
- `SettingsContext`: User settings including `rpcStrategy` ('fallback' | 'parallel' | 'race')

## Network-Specific Handling

Chain ID detection in `AdapterFactory` determines which adapter to instantiate
(see [src/services/adapters/adaptersFactory.ts](../../src/services/adapters/adaptersFactory.ts)):

- **Arbitrum** (42161, 421614): `ArbitrumAdapter` - adds `l1BlockNumber`, `sendCount`, `sendRoot`
- **OP Stack — Optimism** (10, 11155420): `OptimismAdapter` - adds L1 fee breakdown (`l1Fee`, `l1GasPrice`, `l1GasUsed`)
- **OP Stack — Base** (8453, 84532): `BaseAdapter` - adds L1 fee breakdown
- **BSC** (56, 97): `BNBAdapter`
- **Polygon** (137, 80002): `PolygonAdapter`
- **Bitcoin** (bip122:*): `BitcoinAdapter` - UTXO model, mempool transactions, block rewards (constructed via `createBitcoinAdapter`)
- **Zcash** (bip122:00040fe8…, bip122:05a60a92…): `ZcashAdapter` - transparent UTXOs plus Sprout/Sapling/Orchard/Ironwood shielded bundles (constructed via `createZcashAdapter`). Zcash shares the bip122 namespace with Bitcoin, so routing keys off `type: "zcash"`, never the prefix
- **Solana**: `SolanaAdapter` (constructed via `createSolanaAdapter`)
- **Hardhat** (31337): `HardhatAdapter` - uses `HardhatClient` from `@openscan/network-connectors`; trace support via struct log conversion (`buildCallTreeFromStructLogs`, `buildPrestateFromStructLogs` in `src/utils/structLogConverter.ts`) since Hardhat v3 does not support `callTracer`/`prestateTracer`
- **Default EVM**: `EVMAdapter` for Ethereum (1), Sepolia (11155111), Avalanche (43114, 43113)

## Key Type Definitions

Located in `src/types/index.ts`:

- **Block** / **BlockArbitrum** - Block data with optional L2 fields
- **Transaction** / **TransactionArbitrum** - Transaction data with optional receipt
- **Address** - Balance, code, tx count, recent transactions
- **NetworkStats** - Gas price, sync status, block number
- **DataWithMetadata<T>** - Wrapper type for data + optional RPC metadata
- **RPCMetadata** - Contains strategy, timestamp, provider responses, and inconsistency flags

## Build Configuration

- **Vite** (`vite.config.ts`) - Fast bundler with TypeScript, CSS, and asset loading
- **GitHub Pages**: Set `GITHUB_PAGES=true` for `/explorer/` base path
- **Environment Variables**: Injected via Vite's `define` option:
  - `OPENSCAN_COMMIT_HASH` - Git commit hash
  - `OPENSCAN_NETWORKS` - Comma-separated chain IDs to display
  - `OPENSCAN_ENVIRONMENT` - production/development

## Companion Sub-Project: `worker/`

Separate Hono-based RPC proxy at [worker/](../../worker/), deployable to
Cloudflare Workers, Vercel Edge Functions, or Deno Deploy. Routes browser
requests to upstream RPC providers (Alchemy, Infura, dRPC, Ankr, OnFinality),
the Etherscan V2 verification API, the Beacon API for blob sidecars, and Groq
for AI analysis. Includes CORS, rate limiting, and method allow-listing.

- Single Hono app in `worker/src/index.ts` shared across all platforms; each
  platform has a thin entry point (`api/index.ts` for Vercel,
  `src/entry-deno.ts` for Deno, `wrangler.toml` for Cloudflare).
- Has its own `package.json`, `tsconfig.json`, and `deno.json`. Linted by the
  root `biome.json` config (worker sources are inside Biome's scope).
- Frontend automatically falls over between Cloudflare and Vercel deployments
  for redundancy.
