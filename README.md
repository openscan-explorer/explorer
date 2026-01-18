<p align="center">
  <img src="https://openscan-explorer.github.io/explorer/openscan-logo.png" alt="OpenScan Logo" width="128" height="128">
</p>

# OpenScan

![Production IPFS Hash](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/openscan-explorer/explorer/meta/ipfs-hash.json)

A trustless, open-source blockchain explorer for Ethereum and Layer 2 networks. OpenScan connects directly to blockchain nodes via RPC, giving you unfettered access to on-chain data without intermediaries or centralized services.

> *We choose to build trustless systems even when it is harder.*
> *We pay the cost of openness over the convenience of control.*

**Official URL:** [https://openscan.eth.link/](https://openscan.eth.link/)
**GitHub Pages:** [https://openscan-explorer.github.io/explorer/](https://openscan-explorer.github.io/explorer/)

## Features

### 🌐 Multi-Chain Support

- **Ethereum Mainnet** - The main Ethereum network
- **Sepolia Testnet** - Ethereum test network for development
- **Arbitrum One** - Ethereum Layer 2 scaling solution
- **Optimism** - Ethereum Layer 2 with low fees
- **Base** - Coinbase's Layer 2 network
- **BSC (BNB Chain)** - Binance Smart Chain mainnet
- **BSC Testnet** - Binance Smart Chain testnet
- **Polygon POS** - Polygon proof-of-stake mainnet
- **Localhost** - Local development networks (Hardhat/Anvil)

### 🔍 Core Functionality

- **Block Explorer** - View detailed block information including transactions, gas usage, and timestamps
- **Transaction Details** - Inspect transaction data, receipts, logs, and execution details
- **Address Lookup** - Check balance, transaction history, and contract code
- **Contract Interaction** - Read from and write to verified smart contracts with an interactive interface
- **Network Statistics** - Track chain metrics, gas prices, and block times
- **Read/Write Operations** - Execute smart contract calls on verified smart contracts.

### 🎨 User Experience

- **Modern UI** - Clean, card-based design with smooth animations
- **Dark Mode** - Toggle between light and dark themes
- **Responsive** - Mobile-friendly interface
- **Network Cards** - Visual network selection with logos and descriptions
- **Real-time Updates** - Live data from RPC endpoints

### 🛠️ Developer Tools

- **Hex Encoder/Decoder** - Convert between hex and text formats
- **Unit Converter** - Convert between Wei, Gwei, and ETH
- **Custom RPC Support** - Configure custom RPC endpoints for each network
- **HH3 Ignition Support** – Import, inspect, and interact with Hardhat 3 Ignition deployments locally
- **Multiple Fallback URLs** - Automatic failover to backup RPC providers
- **Read/Write Operations** - Execute smart contract calls on verified smart contracts.

### ⚡ Layer 2 Support

- **Arbitrum-Specific Fields** - Display L1 block numbers, send counts, and request IDs
- **Optimism Fee Data** - Show L1 fee breakdown (l1Fee, l1GasPrice, l1GasUsed, l1FeeScalar)

## Getting Started

### Prerequisites

- Node.js v24.12.0
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/openscan.git

# Navigate to the project directory
cd openscan

# Install dependencies
npm install

# Start the development server
npm start
```

The app will open at `http://localhost:3030`

### Use with Anvil/Foundry

After following the installation steps here <https://getfoundry.sh/introduction/installation/> you can just run an anvil mainnet fork with `anvil --fork-url https://reth-ethereum.ithaca.xyz/rpc` or if you run any Anvil instance on the port 8545 it would be automatically detected by Openscan, if you run Anvil on a different port make sure to change the RPC on the app settings.

### Use with Hardhat node

If you run any Hardhat node instance on the port 8545 it would be automatically detected by Openscan, if you run hardhat node on a different port make sure to change the RPC on the app settings.

### Test Environment Script

For development and testing, use the included script that starts a local node with sample transactions and OpenScan:

```bash
# Run with npm script
npm run dev

# Run the script directly
bash scripts/run-test-hardhat-env.sh
```

This script will:

1. Start a Hardhat or Anvil node on port 8545.
2. Deploy test contracts and generate sample transactions
3. Start OpenScan with only Ethereum Mainnet and Localhost networks enabled
4. Create a `hardhat-test-artifacts.zip` for importing contract ABIs

### Build for Production

```bash
# Production build
npm run build:production

# Staging build
npm run build:staging
```

> **Note:** Build scripts require bash (Linux/macOS/WSL). Windows users should use WSL or run builds via CI.

### Type guards

```bash
npm run typecheck
```

### Lint and prettier

```bash
npm run format:fix
```

```bash
npm run lint:fix
```

### End-to-End Tests

The project uses Playwright for E2E testing against Ethereum mainnet data.

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI mode (for debugging)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug
```

**Test Coverage:**

- **Block Page** - Pre/post London blocks, hash fields, navigation
- **Transaction Page** - Legacy and EIP-1559 transactions, from/to addresses, gas info
- **Address Page** - EOA balances, ENS names, ERC20/ERC721/ERC1155 contracts
- **Token Details** - NFT metadata, properties, token URI, collection info
- **Contract Interaction** - Verified contract functions, events, verification status

Tests run automatically on every PR via GitHub Actions.

## Configuration

### Git pre-commit

1. Create a new file under `.git/hooks/pre-commit`

```bash
#!/bin/sh
set -eu

npx @biomejs/biome check --staged --files-ignore-unknown=true --no-errors-on-unmatched
```

2. Make it executable

```bash
chmod +x pre-commit
```

### Environment Variables

#### `REACT_APP_OPENSCAN_NETWORKS`

Controls which networks are displayed in the application. This is useful for limiting the explorer to specific chains.

**Format:** Comma-separated list of chain IDs

**Default:** If not set, all supported networks are enabled.

**Note:** The Localhost network (31337) is only visible in development mode. To enable it in production/staging, explicitly include it in `REACT_APP_OPENSCAN_NETWORKS`.

**Examples:**

```bash
# Show only Ethereum Mainnet and Localhost
REACT_APP_OPENSCAN_NETWORKS="1,31337" npm start

# Show only Layer 2 networks
REACT_APP_OPENSCAN_NETWORKS="42161,10,8453" npm start

# Show only testnets
REACT_APP_OPENSCAN_NETWORKS="11155111,97" npm start
```

The networks will be displayed in the order specified in the environment variable.

### Custom RPC Endpoints

Navigate to Settings to configure custom RPC endpoints for each network. The app supports multiple fallback URLs for reliability.

Default RPC endpoints:

- **Ethereum**: `https://eth.llamarpc.com`, `https://ethereum.publicnode.com`, `https://1rpc.io/eth`
- **Sepolia**: `https://sepolia.infura.io`, `https://rpc.sepolia.org`, `"https://rpc2.sepolia.org`, `https://ethereum-sepolia.publicnode.com`
- **Arbitrum**: `https://arb1.arbitrum.io/rpc`, `https://arbitrum.llamarpc.com`, `https://arbitrum-one.publicnode.com`
- **Optimism**: `https://mainnet.optimism.io`, `https://optimism.llamarpc.com`, `https://optimism.publicnode.com`
- **Base**: `https://mainnet.base.org`, `https://base.llamarpc.com`, `https://base.publicnode.com`
- **BSC**: `https://bsc-dataseed.binance.org`, `https://bsc.publicnode.com`
- **BSC Testnet**: `https://data-seed-prebsc-1-s1.binance.org:8545`, `https://bsc-testnet.publicnode.com`
- **Polygon**: `https://polygon-rpc.com`, `https://polygon.llamarpc.com`, `https://polygon-bor.publicnode.com`
- **Localhost**: `http://localhost:8545`

### Supported Chain IDs

| Network | Chain ID |
|---------|----------|
| Ethereum Mainnet | 1 |
| Sepolia Testnet | 11155111 |
| Arbitrum One | 42161 |
| Optimism | 10 |
| Base | 8453 |
| BSC (BNB Chain) | 56 |
| BSC Testnet | 97 |
| Polygon POS | 137 |
| Localhost | 31337 |

## Architecture

### Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **React Router** - Client-side routing (HashRouter for IPFS/ENS compatibility)
- **Custom RPC Service** - Direct JSON-RPC calls to blockchain nodes
- **Biome** – Code formatting and linting

### Project Structure

```mermaid
src/
├── components/       # React components
│   ├── common/       # Reusable UI components
│   └── pages/        # Page components
├── config/           # Default RPCs configurations
├── context/          # React context providers
├── hooks/            # Custom React hooks
├── services/         # Blockchain data services
│   ├── adapters      # General reusable adapters
│   └── EVM/          # EVM-compatible chain adapters
│       ├── Arbitrum/ # Arbitrum-specific adapters
│       ├── common/   # EVM common resources
│       ├── L1/       # EVM L1 resources
│       └── Optimism/ # Optimism-specific adapters
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
└── styles/           # CSS stylesheets
```

### Data Flow

1. User selects a network (chain ID)
2. `DataService` instantiates network-specific adapters
3. Fetchers make JSON-RPC calls to configured endpoints
4. Adapters transform raw RPC data into typed structures
5. Components render the processed data

## Development

### Key Components

- **DataService** - Main service layer orchestrating RPC calls
- **Network Adapters** - Transform chain-specific data formats
- **Type Guards** - Runtime type checking for L2-specific fields
- **RPC Storage** - Persistent storage for custom RPC configurations

## Support OpenScan

OpenScan is free for all users. The project is sustained by subscriptions from tokens, networks, apps, and organizations that recognize the value of open blockchain infrastructure.

**Subscription tiers available for:**
- Tokens – Verified contracts, metadata integration, token pages
- Networks – Full RPC support, dedicated subdomain explorers
- Crypto Apps – Verified branding for wallets, dApps, exchanges
- Companies & Orgs – Recognition for infrastructure providers and supporters

[View Subscription Options](https://openscan-explorer.github.io/explorer/#/subscriptions)

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a Pull Request.

- Report bugs and request features via [GitHub Issues](https://github.com/openscan-explorer/explorer/issues)
- All code is publicly auditable and open for review
- Community bounties available for bug fixes and documentation improvements

## License

OpenScan is licensed under the [MIT License](LICENSE).
