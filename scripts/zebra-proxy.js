#!/usr/bin/env node
/**
 * CORS proxy for a self-hosted Zcash node (Zebra / Zaino).
 *
 * Zebra and Zaino serve no CORS headers and answer preflight OPTIONS with 405, so a browser
 * cannot read their responses. This proxy terminates CORS in front of the node and, when the
 * node uses cookie auth, injects the credentials the browser cannot send.
 *
 * Usage:
 *   node scripts/zebra-proxy.js [options]
 *
 * Options:
 *   --port <n>                 Listen port (default 8231), bound to 127.0.0.1 only
 *   --upstream <url>           Node RPC URL (default http://127.0.0.1:8232)
 *   --origin <url|*>           Allowed browser origin, repeatable. Default: any localhost or
 *                              127.0.0.1 origin, on any port. Pass '*' to accept every site.
 *   --cookie-file <path>       Read Zebra's auth cookie from this file
 *   --docker-container <name>  Read the cookie via `docker exec <name> cat <cookie-path>`
 *   --cookie-path <path>       Cookie path inside the container
 *                              (default /home/zebra/.cache/zebra/.cookie)
 *   --allow-method <name>      Extra allowed RPC method, repeatable
 */

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const DEFAULT_COOKIE_PATH = "/home/zebra/.cache/zebra/.cookie";

/** The methods OpenScan's Zcash adapter actually calls. Everything else is refused. */
const DEFAULT_METHODS = [
  "getblock",
  "getblockchaininfo",
  "getblockcount",
  "getmempoolinfo",
  "getrawmempool",
  "getrawtransaction",
  "getaddressbalance",
  "getaddresstxids",
  "getaddressutxos",
  "z_listunifiedreceivers",
];

/** Any loopback origin, whatever port the dev server ended up on. */
const LOOPBACK_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

function parseArgs(argv) {
  const opts = {
    port: 8231,
    upstream: "http://127.0.0.1:8232",
    origins: [],
    allowAnyOrigin: false,
    methods: [...DEFAULT_METHODS],
    cookieFile: null,
    dockerContainer: null,
    cookiePath: DEFAULT_COOKIE_PATH,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[(i += 1)];
    if (arg === "--port") opts.port = Number(next());
    else if (arg === "--upstream") opts.upstream = next();
    else if (arg === "--origin") {
      const value = next();
      if (value === "*") opts.allowAnyOrigin = true;
      else opts.origins.push(value);
    } else if (arg === "--cookie-file") opts.cookieFile = next();
    else if (arg === "--docker-container") opts.dockerContainer = next();
    else if (arg === "--cookie-path") opts.cookiePath = next();
    else if (arg === "--allow-method") opts.methods.push(next());
    else {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    }
  }
  return opts;
}

const options = parseArgs(process.argv);
const allowedMethods = new Set(options.methods);

/**
 * Origin policy, in order: '*' accepts everything; an explicit --origin list accepts exactly
 * those; otherwise any loopback origin is accepted, so the dev server's port does not matter.
 */
function isOriginAllowed(origin) {
  if (!origin) return false;
  if (options.allowAnyOrigin) return true;
  if (options.origins.length > 0) return options.origins.includes(origin);
  return LOOPBACK_ORIGIN.test(origin);
}

function originPolicy() {
  if (options.allowAnyOrigin) return "any origin (*)";
  if (options.origins.length > 0) return options.origins.join(", ");
  return "any localhost / 127.0.0.1 port";
}

/**
 * Zebra writes a new cookie on every restart, and a stale cookie is indistinguishable from no
 * cookie (the connection is closed with an empty reply), so the value is cached but re-read
 * whenever an upstream call fails.
 */
let cachedAuth = null;

function readCookie() {
  if (process.env.ZEBRA_RPC_AUTH) return process.env.ZEBRA_RPC_AUTH.trim();
  if (options.cookieFile) return readFileSync(options.cookieFile, "utf8").trim();
  if (options.dockerContainer) {
    return execFileSync("docker", ["exec", options.dockerContainer, "cat", options.cookiePath], {
      encoding: "utf8",
    }).trim();
  }
  return null;
}

function authHeader({ refresh = false } = {}) {
  if (refresh) cachedAuth = null;
  if (cachedAuth === null) {
    const cookie = readCookie();
    cachedAuth = cookie ? `Basic ${Buffer.from(cookie).toString("base64")}` : "";
  }
  return cachedAuth;
}

/** Echo the caller's origin; origin-less callers (curl) need no CORS headers at all. */
const corsHeaders = (origin) =>
  origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {};

function send(res, status, headers, body) {
  res.writeHead(status, { ...headers, "Content-Type": "application/json; charset=utf-8" });
  res.end(body === undefined ? "" : body);
}

/**
 * Refuse with a JSON-RPC error inside a 200 response rather than an HTTP error status.
 * OpenScan maps -32601 to "unsupported" (the UI degrades gracefully) but maps any HTTP error
 * to "failed" (a hard error banner), so the envelope matters.
 */
function sendRpcError(res, origin, id, code, message) {
  send(
    res,
    200,
    corsHeaders(origin),
    JSON.stringify({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }),
  );
}

async function forward(body) {
  const auth = authHeader();
  const headers = { "Content-Type": "application/json" };
  if (auth) headers.Authorization = auth;
  return fetch(options.upstream, { method: "POST", headers, body });
}

/**
 * A rejected origin is otherwise invisible: the browser only reports a missing
 * Access-Control-Allow-Origin header, so log which origin asked and what is allowed.
 */
function rejectOrigin(res, origin) {
  console.warn(
    `refused origin ${origin || "(none)"} — allowed: ${originPolicy()}. ` +
      `Restart with --origin ${origin || "<url>"} to permit it.`,
  );
  return send(
    res,
    403,
    {},
    JSON.stringify({ error: "Origin not allowed", allowed: originPolicy() }),
  );
}

const server = createServer((req, res) => {
  const origin = req.headers.origin ?? "";
  const originAllowed = isOriginAllowed(origin);

  if (req.method === "OPTIONS") {
    if (!originAllowed) return rejectOrigin(res, origin);
    res.writeHead(204, {
      ...corsHeaders(origin),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    });
    return res.end();
  }

  if (req.method !== "POST") {
    return send(
      res,
      405,
      corsHeaders(originAllowed ? origin : ""),
      JSON.stringify({ error: "Use POST" }),
    );
  }

  // A browser request always carries Origin; allow origin-less callers (curl) for debugging.
  if (origin && !originAllowed) {
    return rejectOrigin(res, origin);
  }
  const responseOrigin = originAllowed ? origin : "";

  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", async () => {
    const raw = Buffer.concat(chunks).toString("utf8");
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return sendRpcError(res, responseOrigin, null, -32700, "Parse error");
    }
    if (Array.isArray(parsed)) {
      return sendRpcError(res, responseOrigin, null, -32600, "Batch requests are not supported");
    }
    if (!allowedMethods.has(parsed.method)) {
      return sendRpcError(res, responseOrigin, parsed.id, -32601, "Method not found");
    }

    for (const attempt of [0, 1]) {
      try {
        const upstream = await forward(raw);
        if (upstream.status === 401 && attempt === 0) {
          authHeader({ refresh: true });
          continue;
        }
        const text = await upstream.text();
        return send(res, upstream.status, corsHeaders(responseOrigin), text);
      } catch (err) {
        // An empty reply also means a stale cookie, so refresh once before giving up.
        if (attempt === 0) {
          authHeader({ refresh: true });
          continue;
        }
        // Zebra enables cookie auth by default, and an unauthenticated request is simply
        // closed with an empty reply, so point at the cookie when no credentials are set.
        const hint = authHeader()
          ? ""
          : " — no credentials configured; if the node has enable_cookie_auth = true, pass" +
            " --cookie-file <path> or --docker-container <name>";
        return send(
          res,
          502,
          corsHeaders(responseOrigin),
          JSON.stringify({ error: `Upstream request failed: ${err.message}${hint}` }),
        );
      }
    }
  });
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${options.port} is already in use — another proxy is probably running.`);
    console.error(`Stop it, or start this one elsewhere with --port <n>.`);
  } else {
    console.error(`zebra-proxy failed to start: ${err.message}`);
  }
  process.exit(1);
});

// Read the cookie before binding. execFileSync blocks the event loop, so reading it after the
// port is open would stall whatever request arrives first.
const authState = authHeader() ? "on" : "off";

server.listen(options.port, "127.0.0.1", () => {
  console.log(`zebra-proxy listening on http://127.0.0.1:${options.port}`);
  console.log(`  upstream: ${options.upstream}  (auth: ${authState})`);
  console.log(`  origins:  ${originPolicy()}`);
  console.log(`  methods:  ${options.methods.length} allowed`);
  if (options.allowAnyOrigin) {
    console.warn(
      "  WARNING: every site is accepted. Any page you visit can query this node through the" +
        " proxy, with the node's credentials attached.",
    );
  }
});
