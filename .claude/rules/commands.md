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

# Development-mode build (sourcemaps, OPENSCAN_ENVIRONMENT=development)
npm run build:development

# Plain Vite build (no env wrapper)
npm run build

# Preview the built dist/ on http://localhost:3030
npm run preview

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

# Combined Biome check (format + lint, max 1024 diagnostics)
npm run check
```

## Testing

```bash
# Run unit tests
npm run test:run

# Run unit tests in watch mode
npm run test

# Run e2e tests (Playwright) — both `chromium` (live) and `mocked` projects
npm run test:e2e

# Run only the Ethereum mainnet suite
npm run test:e2e:eth-mainnet

# Run only the EVM L2 networks suite (Arbitrum, Base, Optimism, BSC, Polygon, Avalanche)
npm run test:e2e:evm-networks

# Run a single spec file
npx playwright test e2e/tests/shared/errors.spec.ts

# Run only the chromium project (skips hermetic `shared/mocked/` specs)
npx playwright test --project=chromium

# Run only the mocked project (hermetic specs under e2e/tests/shared/mocked/)
npx playwright test --project=mocked

# Run e2e tests with UI
npm run test:e2e:ui

# Run e2e tests in debug mode
npm run test:e2e:debug
```

E2E tests are organised by chain family under [e2e/tests/](../../e2e/tests/):
`bitcoin/`, `eth-mainnet/`, `evm-networks/`, `shared/`, `solana/`, `testnets/`.
See [testing.md](testing.md) for the full testing model (projects, sharding,
mocking).

## Test Environment with Local Node

```bash
npm run dev
# Starts Hardhat node + OpenScan with sample contracts
# Creates hardhat-test-artifacts.zip for importing ABIs
```

## Security Audit

```bash
# Run npm audit at moderate level
# (audit.sh generates a temporary package-lock.json since this repo uses bun)
npm run audit
```

Backed by [scripts/audit.sh](../../scripts/audit.sh).

## Publishing

```bash
# Publish the built dist/ to npm under the @alpha tag
# Uses dist-package.template.json for the published package metadata
npm run publish:dist
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
OPENSCAN_NETWORKS="1,31337" npm start

# Show all networks (default)
npm start
```

Supported chain IDs: 1 (Ethereum), 42161 (Arbitrum), 10 (Optimism), 8453 (Base), 56 (BSC), 137 (Polygon), 31337 (Hardhat), 97 (BSC Testnet), 11155111 (Sepolia), 43114 (Avalanche)

Non-EVM networks are selected by slug: `btc`, `tbtc`, `zec`, `tzec`, `sol`, `sol-devnet`, `sol-testnet` (e.g. `OPENSCAN_NETWORKS="1,btc,zec"`).
