/**
 * Deno Deploy entry point for the OpenScan worker proxy.
 *
 * Hono's `app.fetch(request, env)` accepts env bindings as the second argument,
 * so all existing route handlers and middleware work unchanged — we just source
 * the values from `Deno.env` instead of Cloudflare Worker bindings.
 */
import app from "./index";
import type { Env } from "./types";

function getEnv(): Env {
  return {
    GROQ_API_KEY: Deno.env.get("GROQ_API_KEY") ?? "",
    ETHERSCAN_API_KEY: Deno.env.get("ETHERSCAN_API_KEY") ?? "",
    ALCHEMY_API_KEY: Deno.env.get("ALCHEMY_API_KEY") ?? "",
    INFURA_API_KEY: Deno.env.get("INFURA_API_KEY") ?? "",
    DRPC_API_KEY: Deno.env.get("DRPC_API_KEY") ?? "",
    ONFINALITY_BTC_API_KEY: Deno.env.get("ONFINALITY_BTC_API_KEY") ?? "",
    ANKR_API_KEY: Deno.env.get("ANKR_API_KEY") ?? "",
    ALLOWED_ORIGINS: Deno.env.get("ALLOWED_ORIGINS") ?? "",
    GROQ_MODEL: Deno.env.get("GROQ_MODEL") ?? "groq/compound",
  };
}

Deno.serve((request) => app.fetch(request, getEnv()));
