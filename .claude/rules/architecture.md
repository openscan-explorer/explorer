# Architecture Overview

## Data Flow Pattern

OpenScan follows a layered architecture with clear separation between data fetching, transformation, and presentation:

### 1. RPC Layer (`RPCClient.ts`)
Handles JSON-RPC communication with blockchain nodes:
- Supports two strategies: `fallback` (sequential with automatic failover) and `parallel` (query all providers simultaneously)
- Strategy is configurable via user settings (`useDataService` hook applies strategy)
- Parallel mode enables provider comparison and inconsistency detection

### 2. Fetcher Layer (`services/EVM/*/fetchers/`)
Makes raw RPC calls for specific data types:
- Network-specific implementations: `L1/`, `Arbitrum/`, `Optimism/`
- Each fetcher handles one domain (blocks, transactions, addresses, network stats)

### 3. Adapter Layer (`services/EVM/*/adapters/`)
Transforms raw RPC responses into typed domain objects:
- Normalizes network-specific fields (e.g., Arbitrum's `l1BlockNumber`, Optimism's L1 fee data)
- Ensures consistent type structure across networks

### 4. Service Layer (`DataService.ts`)
Orchestrates data fetching with caching and metadata:
- Instantiates network-specific fetchers/adapters based on chain ID
- Returns `DataWithMetadata<T>` when using parallel strategy
- 30-second in-memory cache keyed by `networkId:type:identifier`
- Supports trace operations for localhost networks only

### 5. Hook Layer (`hooks/`)
React integration:
- `useDataService(networkId)`: Creates DataService instance with strategy from settings
- `useProviderSelection`: Manages user's selected RPC provider in parallel mode
- `useSelectedData`: Extracts data from specific provider based on user selection

### 6. Context Layer (`context/`)
Global state management:
- `AppContext`: RPC URLs configuration
- `SettingsContext`: User settings including `rpcStrategy` ('fallback' | 'parallel')

## Network-Specific Handling

Chain ID detection in `DataService` constructor determines which adapters/fetchers to use:

- **Arbitrum** (42161): `BlockFetcherArbitrum`, `BlockArbitrumAdapter` - adds `l1BlockNumber`, `sendCount`, `requestId`
- **OP Stack** (10, 8453): Optimism (10), Base (8453) - adds L1 fee breakdown (`l1Fee`, `l1GasPrice`, `l1GasUsed`)
- **Localhost** (31337): All networks + trace support (`debug_traceTransaction`, `trace_block`, etc.)
- **Default**: L1 fetchers/adapters for Ethereum (1), BSC (56, 97), Polygon (137), Sepolia (11155111)

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
  - `REACT_APP_COMMIT_HASH` - Git commit hash
  - `REACT_APP_OPENSCAN_NETWORKS` - Comma-separated chain IDs to display
  - `REACT_APP_ENVIRONMENT` - production/development
