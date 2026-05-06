import type { Context, Next } from "hono";
import type { Env } from "../types";

/**
 * SSRF guard list — the security boundary for /proxy/metadata.
 *
 * Rejects requests targeting the worker's local network or other privileged
 * destinations. If you add a new pattern here, add a matching test case in
 * the worker validator tests (or, until those exist, manually exercise it
 * via `wrangler dev`).
 *
 * Blocked:
 *  - non-HTTPS schemes (http, data, file, ipfs, ftp, …)
 *  - URLs with userinfo (`user:pass@host`)
 *  - `localhost` (and any `*.localhost` subdomain)
 *  - IPv4 loopback / private / link-local / unspecified ranges:
 *      127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16,
 *      169.254.0.0/16, 0.0.0.0/8
 *  - IPv6 loopback (`::1`), ULA (`fd00::/8`), link-local (`fe80::/10`),
 *    and IPv4-mapped variants of the above (`::ffff:<v4>`)
 *  - Pathnames containing `..` segments
 */

function isPrivateIPv4(host: string): boolean {
  // Match dotted-quad with each octet 0-255
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const octets = [m[1], m[2], m[3], m[4]].map((s) => Number(s));
  if (octets.some((o) => o === undefined || Number.isNaN(o) || o < 0 || o > 255)) return false;
  const [a, b] = octets as [number, number, number, number];
  // 0.0.0.0/8 — "this host on this network"
  if (a === 0) return true;
  // 127.0.0.0/8 — loopback
  if (a === 127) return true;
  // 10.0.0.0/8 — private
  if (a === 10) return true;
  // 172.16.0.0/12 — private
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 — private
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 — link-local
  if (a === 169 && b === 254) return true;
  return false;
}

function isPrivateIPv6(host: string): boolean {
  // URL.hostname returns IPv6 wrapped in brackets only if you read .host;
  // .hostname strips them. Handle either form just in case.
  let h = host.toLowerCase();
  if (h.startsWith("[") && h.endsWith("]")) h = h.slice(1, -1);

  // Loopback
  if (h === "::1") return true;
  // Unspecified
  if (h === "::") return true;

  // IPv4-mapped IPv6: ::ffff:a.b.c.d — apply IPv4 rules to the trailing v4
  const v4Mapped = h.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4Mapped?.[1] && isPrivateIPv4(v4Mapped[1])) return true;

  // Pure IPv6 — strip zone id
  const noZone = h.split("%")[0] ?? h;

  // ULA: fc00::/7 (covers fd00::/8 and fc00::/8)
  if (/^f[cd][0-9a-f]{2}:/.test(noZone)) return true;
  // Link-local: fe80::/10 — first 10 bits are 1111111010xx, so prefix fe8x..febx
  if (/^fe[89ab][0-9a-f]:/.test(noZone)) return true;

  return false;
}

function isLocalhostHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost") return true;
  if (h.endsWith(".localhost")) return true;
  return false;
}

export async function validateMetadataProxyMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const target = c.req.query("url");
  if (!target) {
    return c.json({ error: "url query parameter is required" }, 400);
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return c.json({ error: "url is not a valid URL" }, 400);
  }

  if (parsed.protocol !== "https:") {
    return c.json({ error: "Only https:// URLs are allowed" }, 400);
  }

  if (parsed.username || parsed.password) {
    return c.json({ error: "URLs with userinfo are not allowed" }, 400);
  }

  if (parsed.pathname.split("/").includes("..")) {
    return c.json({ error: "URL path must not contain '..' segments" }, 400);
  }

  const hostname = parsed.hostname;
  if (!hostname) {
    return c.json({ error: "url must include a hostname" }, 400);
  }

  if (isLocalhostHost(hostname) || isPrivateIPv4(hostname) || isPrivateIPv6(hostname)) {
    return c.json({ error: "URL targets a disallowed host" }, 400);
  }

  c.set("validatedUrl" as never, parsed.toString() as never);
  await next();
}
