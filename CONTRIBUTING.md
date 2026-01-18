# Contributing to OpenScan

Thank you for your interest in contributing to OpenScan! This guide will help you get started.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.1.0 or later

### Setup

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/openscan.git
   cd openscan
   ```
3. Install dependencies:
   ```bash
   bun install
   ```
4. Start the development server:
   ```bash
   npm start
   ```
   The app will be available at http://localhost:3030

## Development Workflow

### Branch Naming

Create feature branches from `dev` using descriptive names:

- `feature/add-new-network` - New features
- `fix/transaction-display` - Bug fixes
- `docs/update-readme` - Documentation changes
- `refactor/data-service` - Code refactoring

### Creating a Branch

```bash
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name
```

## Code Quality Checklist

Before submitting a pull request, you must run these commands and ensure they pass:

```bash
# Fix formatting issues
npm run format:fix

# Fix linting issues
npm run lint:fix

# Verify type safety
npm run typecheck

# Run tests
npm run test:run
```

All code must:

- Pass Biome formatting and linting checks
- Pass TypeScript type checking with zero errors
- Follow the 100-character line width limit
- Use 2-space indentation consistently

## Commit Guidelines

We follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

### Commit Message Format

```
<type>: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring (no feature or bug fix)
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat: add support for Polygon zkEVM network
fix: correct gas estimation for L2 transactions
docs: update network configuration instructions
refactor: extract common adapter logic to base class
```

## Pull Request Process

1. **Target Branch**: All PRs should target the `dev` branch
2. **Title**: Use a clear, descriptive title following commit conventions
3. **Description**: Explain what changed and why
4. **Link Issues**: Reference any related issues (e.g., "Closes #123")
5. **CI Checks**: Ensure all CI checks pass before requesting review

When you open a PR, a template will be provided automatically. Please fill it out completely.

## Architecture Overview

OpenScan follows a layered architecture. For detailed information, see [CLAUDE.md](./CLAUDE.md).

### Key Pattern: Fetcher → Adapter → Service

1. **Fetcher Layer**: Makes raw RPC calls to blockchain nodes
2. **Adapter Layer**: Transforms RPC responses into typed domain objects
3. **Service Layer**: Orchestrates data fetching with caching

When modifying data fetching:

- Maintain the adapter pattern
- Test both `fallback` and `parallel` RPC strategies
- Update TypeScript types in `src/types/index.ts` if adding new fields

## Adding a New Network

1. Add chain ID to `src/types/index.ts` if creating new domain types
2. Add default RPC endpoints to `src/config/rpcConfig.ts`
3. Determine if network needs custom fetchers/adapters
4. If custom: create `src/services/EVM/[Network]/fetchers/` and `adapters/`
5. Update `DataService` constructor to detect chain ID
6. Add network config to `ALL_NETWORKS` in `src/config/networks.ts`
7. Add network logo to `public/` and update `logoType` in network config

## Code Style

- **Formatter/Linter**: Biome (see `biome.json`)
- **Line Width**: 100 characters
- **Indentation**: 2 spaces
- **TypeScript**: Strict mode enabled
- **CSS**: Place styles in `src/styles/`, avoid inline styles

## Testing with Local Networks

For development with local blockchain networks:

```bash
npm run dev
```

This starts a Hardhat node with sample contracts and OpenScan pointing to it.

## Questions?

If you have questions or need help, feel free to open an issue on GitHub.
