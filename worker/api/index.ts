/**
 * Vercel Edge Functions entry point for the OpenScan worker proxy.
 *
 * Hono's `app.fetch(request, env)` accepts env bindings as the second argument,
 * so all existing route handlers and middleware work unchanged — we just source
 * the values from `process.env` instead of Cloudflare Worker bindings.
 */
import app from "../src/index";
import type { Env } from "../src/types";

// Vercel Edge runtime provides process.env but the worker tsconfig
// only includes Cloudflare types — declare it locally to avoid adding
// @types/node as a dependency.
declare const process: { env: Record<string, string | undefined> };

function getEnv(): Env {
  return {
    GROQ_API_KEY: process.env.GROQ_API_KEY ?? "",
    ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY ?? "",
    ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY ?? "",
    INFURA_API_KEY: process.env.INFURA_API_KEY ?? "",
    DRPC_API_KEY: process.env.DRPC_API_KEY ?? "",
    ONFINALITY_BTC_API_KEY: process.env.ONFINALITY_BTC_API_KEY ?? "",
    ANKR_API_KEY: process.env.ANKR_API_KEY ?? "",
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ?? "",
    GROQ_MODEL: process.env.GROQ_MODEL ?? "groq/compound",
  };
}

export const config = { runtime: "edge" };

export default function handler(request: Request) {
  return app.fetch(request, getEnv());
}
