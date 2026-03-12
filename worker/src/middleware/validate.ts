import type { Context, Next } from "hono";
import { type AnalyzeRequestBody, VALID_ANALYSIS_TYPES, type Env } from "../types";

const MAX_BODY_SIZE = 32 * 1024; // 32 KB

export async function validateMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const contentLength = c.req.header("Content-Length");
  if (contentLength && Number.parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return c.json({ error: "Request body too large" }, 413);
  }

  let body: AnalyzeRequestBody;
  try {
    body = await c.req.json<AnalyzeRequestBody>();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  if (!body.type || !VALID_ANALYSIS_TYPES.includes(body.type)) {
    return c.json(
      { error: `Invalid type. Must be one of: ${VALID_ANALYSIS_TYPES.join(", ")}` },
      400,
    );
  }

  if (!Array.isArray(body.messages) || body.messages.length !== 2) {
    return c.json({ error: "messages must be an array of exactly 2 entries" }, 400);
  }

  const [systemMsg, userMsg] = body.messages;
  if (systemMsg?.role !== "system" || typeof systemMsg?.content !== "string") {
    return c.json({ error: "First message must have role 'system' with string content" }, 400);
  }
  if (userMsg?.role !== "user" || typeof userMsg?.content !== "string") {
    return c.json({ error: "Second message must have role 'user' with string content" }, 400);
  }

  // Store validated body for route handler
  c.set("validatedBody" as never, body as never);
  await next();
}
