import type { Context, Next } from "hono";
import type { EtherscanVerifyRequestBody, Env } from "../types";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export async function validateEtherscanMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  let body: EtherscanVerifyRequestBody;
  try {
    body = await c.req.json<EtherscanVerifyRequestBody>();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  if (typeof body.chainId !== "number" || !Number.isInteger(body.chainId) || body.chainId <= 0) {
    return c.json({ error: "chainId must be a positive integer" }, 400);
  }

  if (typeof body.address !== "string" || !ADDRESS_RE.test(body.address)) {
    return c.json({ error: "address must be a valid 0x-prefixed Ethereum address" }, 400);
  }

  c.set("validatedBody" as never, body as never);
  await next();
}
