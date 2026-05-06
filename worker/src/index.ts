import { Hono } from "hono";
import type { Env } from "./types";
import { corsMiddleware } from "./middleware/cors";
import { rateLimitMiddleware } from "./middleware/rateLimit";
import { rateLimitBeaconMiddleware } from "./middleware/rateLimitBeacon";
import { rateLimitBtcMiddleware } from "./middleware/rateLimitBtc";
import { rateLimitEtherscanMiddleware } from "./middleware/rateLimitEtherscan";
import { rateLimitEvmMiddleware } from "./middleware/rateLimitEvm";
import { rateLimitMetadataMiddleware } from "./middleware/rateLimitMetadata";
import { validateMiddleware } from "./middleware/validate";
import { validateBeaconMiddleware } from "./middleware/validateBeacon";
import { validateBtcMiddleware } from "./middleware/validateBtc";
import { validateEtherscanMiddleware } from "./middleware/validateEtherscan";
import { validateEvmMiddleware } from "./middleware/validateEvm";
import { validateMetadataProxyMiddleware } from "./middleware/validateMetadataProxy";
import { analyzeHandler } from "./routes/analyze";
import { btcAnkrHandler, evmAnkrHandler } from "./routes/ankrRpc";
import { beaconAlchemyHandler } from "./routes/beaconBlobSidecars";
import { btcAlchemyHandler } from "./routes/btcRpc";
import { etherscanVerifyHandler } from "./routes/etherscanVerify";
import { btcDrpcHandler, evmDrpcHandler } from "./routes/drpcRpc";
import { evmAlchemyHandler, evmInfuraHandler } from "./routes/evmRpc";
import { metadataProxyHandler } from "./routes/metadataProxy";
import { btcOnfinalityHandler } from "./routes/onfinalityRpc";

const app = new Hono<{ Bindings: Env }>();

// Global CORS handling (including preflight)
app.use("*", corsMiddleware);

// POST /ai/analyze — rate limit, validate, then handle
app.post("/ai/analyze", rateLimitMiddleware, validateMiddleware, analyzeHandler);

// POST /etherscan/verify — rate limit, validate, then proxy to Etherscan V2 API
app.post(
  "/etherscan/verify",
  rateLimitEtherscanMiddleware,
  validateEtherscanMiddleware,
  etherscanVerifyHandler,
);

// GET /beacon/alchemy/:networkId/blob_sidecars/:slot — Beacon API proxy
app.get(
  "/beacon/alchemy/:networkId/blob_sidecars/:slot",
  rateLimitBeaconMiddleware,
  validateBeaconMiddleware,
  beaconAlchemyHandler,
);

// POST /btc/alchemy — Bitcoin JSON-RPC proxy
app.post("/btc/alchemy", rateLimitBtcMiddleware, validateBtcMiddleware, btcAlchemyHandler);

// POST /evm/alchemy/:networkId — EVM JSON-RPC proxy via Alchemy
app.post(
  "/evm/alchemy/:networkId",
  rateLimitEvmMiddleware,
  validateEvmMiddleware,
  evmAlchemyHandler,
);

// POST /evm/infura/:networkId — EVM JSON-RPC proxy via Infura
app.post("/evm/infura/:networkId", rateLimitEvmMiddleware, validateEvmMiddleware, evmInfuraHandler);

// POST /evm/drpc/:networkId — EVM JSON-RPC proxy via dRPC
app.post("/evm/drpc/:networkId", rateLimitEvmMiddleware, validateEvmMiddleware, evmDrpcHandler);

// POST /btc/drpc — Bitcoin JSON-RPC proxy via dRPC
app.post("/btc/drpc", rateLimitBtcMiddleware, validateBtcMiddleware, btcDrpcHandler);

// POST /evm/ankr/:networkId — EVM JSON-RPC proxy via Ankr
app.post("/evm/ankr/:networkId", rateLimitEvmMiddleware, validateEvmMiddleware, evmAnkrHandler);

// POST /btc/ankr — Bitcoin JSON-RPC proxy via Ankr
app.post("/btc/ankr", rateLimitBtcMiddleware, validateBtcMiddleware, btcAnkrHandler);

// POST /btc/onfinality/:networkId — Bitcoin JSON-RPC proxy via OnFinality
app.post(
  "/btc/onfinality/:networkId",
  rateLimitBtcMiddleware,
  validateBtcMiddleware,
  btcOnfinalityHandler,
);

// GET /proxy/metadata?url=<https-url> — CORS-bypassing fetch for NFT metadata JSON
app.get(
  "/proxy/metadata",
  rateLimitMetadataMiddleware,
  validateMetadataProxyMiddleware,
  metadataProxyHandler,
);

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// 404 for everything else
app.all("*", (c) => c.json({ error: "Not found" }, 404));

export default app;
