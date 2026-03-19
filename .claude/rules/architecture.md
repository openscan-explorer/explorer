# Architecture Overview

## Data Flow Pattern

OpenScan follows a layered architecture with clear separation between data fetching, transformation, and presentation:

### 1. Client Layer (`@openscan/network-connectors`)
Typed RPC clients for blockchain communication:
- `EthereumClient` - Standard JSON-RPC for EVM chains
- `HardhatClient` - Extended client with Hardhat-specific methods (`hardhat_*`, `evm_*`, `debug_*`)
- `BitcoinClient` - Bitcoin JSON-RPC (`getblock`, `getrawtransaction`, etc.)
- Supports `fallback`, `parallel`, and `race` strategies

### 2. Adapter Layer (`services/adapters/`)
Abstract `NetworkAdapter` base class with chain-specific implementations:
- `EVMAdapter` - Default EVM adapter (Ethereum, BSC, Polygon, Sepolia)
- `ArbitrumAdapter` - Adds `l1BlockNumber`, `sendCount`, `sendRoot`
- `OptimismAdapter` / `BaseAdapter` - Adds L1 fee breakdown (`l1Fee`, `l1GasPrice`, `l1GasUsed`)
- `HardhatAdapter` - Localhost (31337) with trace support via struct log conversion
- `BitcoinAdapter` - Bitcoin networks with UTXO model, mempool, and block explorer
- Each adapter implements: `getBlock`, `getTransaction`, `getAddress`, `getNetworkStats`, trace methods
- `AdapterFactory` routes chain ID to the correct adapter

### 3. Service Layer (`DataService.ts`)
Orchestrates data fetching with caching and metadata:
- Instantiates the correct adapter via `AdapterFactory` based on chain ID
- Returns `DataWithMetadata<T>` when using parallel strategy
- 30-second in-memory cache keyed by `networkId:type:identifier`

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

Chain ID detection in `AdapterFactory` determines which adapter to instantiate:

- **Arbitrum** (42161): `ArbitrumAdapter` - adds `l1BlockNumber`, `sendCount`, `sendRoot`
- **OP Stack** (10, 8453): `OptimismAdapter`, `BaseAdapter` - adds L1 fee breakdown
- **Hardhat** (31337): `HardhatAdapter` - trace support via struct log conversion (`buildCallTreeFromStructLogs`, `buildPrestateFromStructLogs`)
- **Bitcoin** (bip122:*): `BitcoinAdapter` - UTXO model, mempool transactions, block rewards
- **Default**: `EVMAdapter` for Ethereum (1), BSC (56, 97), Polygon (137), Sepolia (11155111), BNB (56)

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
