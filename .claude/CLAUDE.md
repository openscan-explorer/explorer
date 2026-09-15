# OpenScan - Claude Code Instructions

OpenScan is a trustless, open-source, standalone web-app and multi-chain blockchain explorer for Ethereum and Layer 2 networks. It allows direct interaction with verified smart contracts and supports local development chains.

## Quick Reference

- **Package Manager**: Bun 1.4.2 (lockfile: `bun.lock`, pinned via the `packageManager` field in `package.json`; the lockfile is `lockfileVersion` 3, which needs Bun 1.4 or newer). The repo's documented commands use `npm run` because they invoke `package.json` scripts — `bun run` works equivalently.
- **Bundler**: Vite
- **Dev Server**: `npm start` (http://localhost:3030)
- **Type Check**: `npm run typecheck`
- **Format**: `npm run format:fix`
- **Lint**: `npm run lint:fix`
- **Combined Biome check**: `npm run check`
- **Test (unit)**: `npm run test:run`
- **Test (e2e)**: `npm run test:e2e` (or `test:e2e:eth-mainnet` / `test:e2e:evm-networks` for focused runs)
- **Local node + explorer**: `npm run dev`

## Modular Instructions

Detailed instructions are organized in the rules directory:

@.claude/rules/commands.md - Development commands and scripts
@.claude/rules/architecture.md - Data flow and architecture patterns
@.claude/rules/code-style.md - Code style, formatting, and quality requirements
@.claude/rules/workflow.md - Git workflow, branches, PRs, and issues
@.claude/rules/patterns.md - Important coding patterns for this codebase
@.claude/rules/testing.md - Vitest + Playwright testing model (projects, suites, mocking)
@.claude/rules/i18n.md - Internationalization guidelines and best practices
