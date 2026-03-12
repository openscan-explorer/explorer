import { Hono } from "hono";
import type { Env } from "./types";
import { corsMiddleware } from "./middleware/cors";
import { rateLimitMiddleware } from "./middleware/rateLimit";
import { validateMiddleware } from "./middleware/validate";
import { analyzeHandler } from "./routes/analyze";

const app = new Hono<{ Bindings: Env }>();

// Global CORS handling (including preflight)
app.use("*", corsMiddleware);

// POST /ai/analyze — rate limit, validate, then handle
app.post("/ai/analyze", rateLimitMiddleware, validateMiddleware, analyzeHandler);

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// 404 for everything else
app.all("*", (c) => c.json({ error: "Not found" }, 404));

export default app;
