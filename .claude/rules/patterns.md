# Important Coding Patterns

## When Modifying Data Fetching

- Always maintain the adapter pattern: Fetcher → Adapter → Service
- If adding parallel strategy support, ensure complete objects are built for each provider
- Test both `fallback` and `parallel` strategies
- Update TypeScript types in `src/types/index.ts` if adding new fields

## When Adding L2-Specific Features

- Check if network is OP Stack-based (Optimism, Base) or Arbitrum
- Add network-specific types (e.g., `TransactionOptimism extends Transaction`)
- Create adapters that inherit base behavior and add L2 fields
- Update `DataService` conditional logic in constructor and relevant methods

## When Working with Cache

- Cache keys format: `${networkId}:${type}:${identifier}`
- Don't cache "latest" block queries
- Clear cache when switching networks using `clearCacheForChain(networkId)`
- Default timeout: 30 seconds

## RPC Strategy Switching

- Strategy is set per-DataService instance via constructor
- User setting stored in `SettingsContext.settings.rpcStrategy`
- `useDataService` hook automatically applies current strategy
- All service methods check `this.rpcClient.getStrategy()` to determine behavior

## Adding a New Network

1. Add chain ID to `src/types/index.ts` if creating new domain types
2. Add default RPC endpoints to `src/config/rpcConfig.ts`
3. Determine if network needs custom fetchers/adapters (L1, Arbitrum-like, OP Stack-like)
4. If custom: create `src/services/EVM/[Network]/fetchers/` and `adapters/`
5. Update `DataService` constructor to detect chain ID and instantiate correct fetchers/adapters
6. Add network config to `ALL_NETWORKS` in `src/config/networks.ts`
7. Add network logo to `public/` and update `logoType` in network config

## Testing with Local Networks

OpenScan includes special support for localhost development:

- **Hardhat 3 Ignition**: Import deployment artifacts via Settings → Import Ignition Deployment
- **Trace Support**: `debug_traceTransaction`, `debug_traceBlockByHash`, `debug_traceCall` available on localhost (31337)
- **Auto-detection**: Port 8545 automatically recognized as localhost network

## Component Patterns

### Address Page Components
- Use display components for different address types: `AccountDisplay`, `ContractDisplay`, `ERC20Display`, `ERC721Display`, `ERC1155Display`
- Shared components in `src/components/pages/address/shared/`
- Card-based layout with Overview and More Info sections

### Theming
- Use CSS variables from `src/theme.tsx`
- Use `--overlay-light-*` variables for backgrounds that need to work in both themes
- Use `--text-primary`, `--text-secondary`, `--text-tertiary` for text colors
- Never hardcode `rgba(255, 255, 255, X)` - use CSS variables instead

## Logger Utility

Always use the logger utility instead of `console.*` methods for runtime logging.

### Usage

```typescript
import { logger } from "../utils/logger";

logger.debug("Debug info for development");
logger.info("General information");
logger.warn("Warning message");
logger.error("Error message", error);
```

### Log Level Guidelines

- **debug**: Development-only information (verbose data, state dumps, request/response details)
- **info**: General operational information (feature activity, successful operations)
- **warn**: Potential issues that don't break functionality (fallbacks, deprecations, recoverable errors)
- **error**: Actual errors that affect functionality (failed operations, exceptions)

### Environment Filtering

| Environment | Visible Levels           |
|-------------|--------------------------|
| development | debug, info, warn, error |
| staging     | info, warn, error        |
| production  | warn, error              |

### Build-time Safety

In production builds, `console.log` calls are stripped via Vite's terser `pure_funcs` option as a safety net for any missed migrations.
