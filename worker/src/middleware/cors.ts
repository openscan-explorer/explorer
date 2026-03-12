import type { Context, Next } from "hono";
import type { Env } from "../types";

/**
 * Check if an origin is allowed.
 * Entries starting with "*" are suffix patterns on the hostname — e.g.
 * "*--openscan.netlify.app" matches "https://pr-306--openscan.netlify.app".
 * All other entries are exact origin matches.
 */
function isOriginAllowed(origin: string, allowed: string[]): boolean {
  for (const entry of allowed) {
    if (entry.startsWith("*")) {
      const suffix = entry.slice(1); // e.g. "--openscan.netlify.app"
      try {
        const { hostname } = new URL(origin);
        if (hostname.endsWith(suffix)) {
          return true;
        }
      } catch {
        continue;
      }
    } else if (origin === entry) {
      return true;
    }
  }
  return false;
}

export async function corsMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const origin = c.req.header("Origin") ?? "";
  const allowed = c.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());

  if (c.req.method === "OPTIONS") {
    if (!isOriginAllowed(origin, allowed)) {
      return c.text("Forbidden", 403);
    }
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (origin && !isOriginAllowed(origin, allowed)) {
    return c.text("Forbidden", 403);
  }

  await next();

  if (origin && isOriginAllowed(origin, allowed)) {
    c.header("Access-Control-Allow-Origin", origin);
  }
}
