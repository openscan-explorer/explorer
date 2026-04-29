import type { Context, Next } from "hono";
import type { Env } from "../types";

/**
 * Check if an origin is allowed.
 * Entries prefixed with "re:" are anchored regex patterns matched against the
 * full origin — e.g. "re:^https://(pr-\\d+|deploy-preview-\\d+)--openscan\\.netlify\\.app$".
 * All other entries are exact origin matches.
 *
 * Suffix globs like "*--openscan.netlify.app" are intentionally NOT supported:
 * Netlify site names are globally unique but user-chosen, so any tenant can
 * register a site name ending in "--openscan" and satisfy a bare suffix match.
 * Always anchor preview patterns to the expected prefix form.
 */
const regexCache = new Map<string, RegExp | null>();

function compilePattern(entry: string): RegExp | null {
  if (regexCache.has(entry)) return regexCache.get(entry) ?? null;
  let compiled: RegExp | null = null;
  try {
    compiled = new RegExp(entry.slice(3));
  } catch {
    compiled = null;
  }
  regexCache.set(entry, compiled);
  return compiled;
}

function isOriginAllowed(origin: string, allowed: string[]): boolean {
  for (const entry of allowed) {
    if (entry.startsWith("re:")) {
      const re = compilePattern(entry);
      if (re?.test(origin)) return true;
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
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
