import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Env } from "../types";

const FETCH_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 1_048_576; // 1 MB

export async function metadataProxyHandler(c: Context<{ Bindings: Env }>) {
  const targetUrl = c.get("validatedUrl" as never) as unknown as string;

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "TimeoutError";
    if (isAbort) {
      return c.json({ error: "Upstream timeout" }, 504);
    }
    return c.json({ error: "Failed to fetch upstream URL" }, 502);
  }

  // Reject early if upstream advertises a body larger than our cap.
  const contentLengthHeader = upstream.headers.get("content-length");
  if (contentLengthHeader) {
    const declared = Number.parseInt(contentLengthHeader, 10);
    if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
      return c.json({ error: "Response too large" }, 413);
    }
  }

  // Buffer the body, enforcing the cap. arrayBuffer() may decompress, so we
  // also check the resulting byteLength.
  let bodyBytes: ArrayBuffer;
  try {
    bodyBytes = await upstream.arrayBuffer();
  } catch {
    return c.json({ error: "Failed to read upstream response" }, 502);
  }
  if (bodyBytes.byteLength > MAX_RESPONSE_BYTES) {
    return c.json({ error: "Response too large" }, 413);
  }

  // Parse and re-emit as JSON only. The route is reachable via top-level
  // navigation (CORS fails open on missing Origin), so passing through the
  // upstream Content-Type would let an attacker URL render arbitrary HTML/JS
  // on the worker origin. Forcing JSON-parse + JSON content-type closes that
  // vector and also transitively defends against a redirect chain landing on
  // a non-JSON body. Frontend callers only ever invoke `response.json()`, so
  // this is not a behavior change for them.
  let parsed: unknown;
  try {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bodyBytes);
    parsed = JSON.parse(text);
  } catch {
    return c.json({ error: "Upstream response is not valid JSON" }, 415);
  }

  // Mirror upstream status, but cap network/origin failure codes at 502 so
  // clients can distinguish proxy issues from request issues.
  let status = upstream.status;
  if (status >= 500) status = 502;

  c.header("Content-Type", "application/json; charset=utf-8");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Content-Disposition", 'attachment; filename="metadata.json"');
  c.header("Cache-Control", "public, max-age=300");
  return c.body(JSON.stringify(parsed), status as ContentfulStatusCode);
}
