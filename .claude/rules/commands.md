# Development Commands

## Start Development Server

```bash
npm start
# Runs on http://localhost:3030
```

## Build for Production

```bash
# Production build
npm run build:production

# Staging build
npm run build:staging

# Output: dist/
```

## Type Checking

```bash
npm run typecheck
```

## Formatting and Linting

```bash
# Check formatting (dry run)
npm run format

# Fix formatting issues automatically
npm run format:fix

# Check linting issues (dry run)
npm run lint

# Fix linting issues automatically
npm run lint:fix
```

## Testing

```bash
# Run unit tests
npm run test:run

# Run unit tests in watch mode
npm run test

# Run e2e tests (Playwright)
npm run test:e2e

# Run e2e tests with UI
npm run test:e2e:ui

# Run e2e tests in debug mode
npm run test:e2e:debug
```

## Test Environment with Local Node

```bash
npm run dev
# Starts Hardhat node + OpenScan with sample contracts
# Creates hardhat-test-artifacts.zip for importing ABIs
```

## Individual Script Execution

```bash
# Build for production deployment
bash scripts/build-production.sh

# Build for staging
bash scripts/build-staging.sh

# Run test environment
bash scripts/run-test-env.sh
```

## Network Configuration

Networks are defined in `src/config/networks.ts`. To control which networks are displayed:

```bash
# Show only specific networks (comma-separated chain IDs)
REACT_APP_OPENSCAN_NETWORKS="1,31337" npm start

# Show all networks (default)
npm start
```

Supported chain IDs: 1 (Ethereum), 42161 (Arbitrum), 10 (Optimism), 8453 (Base), 56 (BSC), 137 (Polygon), 31337 (Localhost), 97 (BSC Testnet), 11155111 (Sepolia)
