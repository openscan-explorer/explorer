import type { Context, Next } from "hono";
import type { Env } from "../types";

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 30; // More generous than AI (10)

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 300_000; // 5 minutes

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.timestamps.every((ts) => now - ts > WINDOW_MS)) {
      store.delete(key);
    }
  }
}

export async function rateLimitEtherscanMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const ip = c.req.header("CF-Connecting-IP") ?? c.req.header("X-Forwarded-For") ?? "unknown";
  const now = Date.now();

  cleanup(now);

  let entry = store.get(ip);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(ip, entry);
  }

  entry.timestamps = entry.timestamps.filter((ts) => now - ts < WINDOW_MS);

  if (entry.timestamps.length >= MAX_REQUESTS) {
    const oldestInWindow = entry.timestamps[0]!;
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - oldestInWindow)) / 1000);
    c.header("Retry-After", String(retryAfterSec));
    return c.json({ error: "Rate limit exceeded. Try again later." }, 429);
  }

  entry.timestamps.push(now);
  await next();
}
