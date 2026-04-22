# OpenScan Worker Proxy

Shared RPC proxy built with [Hono](https://hono.dev) that routes requests to blockchain RPC providers (Alchemy, Infura, dRPC, Ankr, OnFinality), the Etherscan API, Beacon API, and AI services (Groq). Includes CORS, rate limiting, and request validation.

Deployed on multiple platforms for redundancy. If Cloudflare fails or hits rate limits the frontend automatically falls over to Vercel. A Deno Deploy entry point is also available if a third platform is needed in the future.

## Architecture

```
worker/
  src/
    index.ts          # Hono app — routes, middleware (shared by all platforms)
    entry-deno.ts     # Deno Deploy entry point
    types.ts          # Env interface, allowed methods/networks
    middleware/        # CORS, rate limiting, request validation
    routes/            # Route handlers (EVM, BTC, Beacon, AI, Etherscan)
  api/
    index.ts          # Vercel Edge Functions entry point
  wrangler.toml       # Cloudflare Workers config
  deno.json           # Deno Deploy config
  vercel.json         # Vercel config
```

All platforms share the same Hono app (`src/index.ts`). Each entry point bridges the platform's env var mechanism into Hono's `app.fetch(request, env)` — zero code duplication.

## Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ai/analyze` | Groq AI analysis proxy |
| POST | `/etherscan/verify` | Etherscan V2 contract verification |
| GET | `/beacon/alchemy/:networkId/blob_sidecars/:slot` | Beacon API blob sidecars |
| POST | `/evm/alchemy/:networkId` | EVM RPC via Alchemy |
| POST | `/evm/infura/:networkId` | EVM RPC via Infura |
| POST | `/evm/drpc/:networkId` | EVM RPC via dRPC |
| POST | `/evm/ankr/:networkId` | EVM RPC via Ankr |
| POST | `/btc/alchemy` | Bitcoin RPC via Alchemy |
| POST | `/btc/drpc` | Bitcoin RPC via dRPC |
| POST | `/btc/ankr` | Bitcoin RPC via Ankr |
| POST | `/btc/onfinality/:networkId` | Bitcoin RPC via OnFinality |
| GET | `/health` | Health check |

## Environment Variables

All platforms require the same secrets:

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq AI API key for `/ai/analyze` |
| `ETHERSCAN_API_KEY` | Etherscan V2 API key for `/etherscan/verify` |
| `ALCHEMY_API_KEY` | Alchemy API key for `/evm/alchemy/*`, `/btc/alchemy`, `/beacon/*` |
| `INFURA_API_KEY` | Infura API key for `/evm/infura/*` |
| `DRPC_API_KEY` | dRPC API key for `/evm/drpc/*`, `/btc/drpc` |
| `ANKR_API_KEY` | Ankr API key for `/evm/ankr/*`, `/btc/ankr` |
| `ONFINALITY_BTC_API_KEY` | OnFinality API key for `/btc/onfinality/*` |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins. Entries prefixed with `re:` are anchored regex patterns matched against the full origin (e.g. `re:^https://(pr-\d+\|deploy-preview-\d+)--openscan\.netlify\.app$`). Other entries are exact matches. |
| `GROQ_MODEL` | AI model (default: `groq/compound`) |

## Deployment

### Prerequisites

```bash
cd worker
npm install
```

### Cloudflare Workers (primary)

**First-time setup:**

```bash
# Login to Cloudflare
npx wrangler login

# Add secrets (prompts for each value)
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put ETHERSCAN_API_KEY
npx wrangler secret put ALCHEMY_API_KEY
npx wrangler secret put INFURA_API_KEY
npx wrangler secret put DRPC_API_KEY
npx wrangler secret put ANKR_API_KEY
npx wrangler secret put ONFINALITY_BTC_API_KEY
```

`ALLOWED_ORIGINS` and `GROQ_MODEL` are set in `wrangler.toml` as non-secret vars.

**Deploy:**

```bash
npx wrangler deploy
```

**Local dev:**

```bash
npx wrangler dev
```

### Deno Deploy (optional, not currently active)

Entry point and config are ready at `src/entry-deno.ts` and `deno.json`. To activate:

1. Install `deployctl`: `deno install -Arf jsr:@deno/deployctl`
2. Create a project on [console.deno.com](https://console.deno.com)
3. Get an access token from your account settings
4. Add all env vars from the table above via the Deno console
5. Deploy: `deployctl deploy --project=openscan-worker-proxy src/entry-deno.ts --token=$DENO_DEPLOY_TOKEN`
6. Add the deployment URL to `WORKER_URLS` in `src/config/workerConfig.ts`

**Local dev:**

```bash
deno task dev
```

### Vercel Edge Functions (failover)

**First-time setup:**

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# First deploy (creates the project)
vercel --yes

# Add secrets (each command prompts for the value)
vercel env add GROQ_API_KEY production
vercel env add ETHERSCAN_API_KEY production
vercel env add ALCHEMY_API_KEY production
vercel env add INFURA_API_KEY production
vercel env add DRPC_API_KEY production
vercel env add ANKR_API_KEY production
vercel env add ONFINALITY_BTC_API_KEY production
vercel env add ALLOWED_ORIGINS production
```

**Deploy to production:**

```bash
vercel --prod
```

**Verify:**

```bash
curl https://openscan-worker-proxy.vercel.app/health
# {"status":"ok"}
```

## Frontend Failover

The explorer frontend (`src/config/workerConfig.ts`) automatically tries each worker URL in order:

1. **Cloudflare** — `https://openscan-worker-proxy.openscan.workers.dev`
2. **Vercel** — `https://openscan-worker-proxy.vercel.app`

Falls through to the next platform on network errors, 429 (rate limited), 502, or 503 responses.

## Development

```bash
# Cloudflare (recommended for local dev)
npm run dev

# Type check
npm run typecheck
```
