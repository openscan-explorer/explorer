import { Hono } from "hono";
import type { Env } from "./types";
import { corsMiddleware } from "./middleware/cors";
import { rateLimitMiddleware } from "./middleware/rateLimit";
import { rateLimitEtherscanMiddleware } from "./middleware/rateLimitEtherscan";
import { validateMiddleware } from "./middleware/validate";
import { validateEtherscanMiddleware } from "./middleware/validateEtherscan";
import { analyzeHandler } from "./routes/analyze";
import { etherscanVerifyHandler } from "./routes/etherscanVerify";

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

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// 404 for everything else
app.all("*", (c) => c.json({ error: "Not found" }, 404));

export default app;
