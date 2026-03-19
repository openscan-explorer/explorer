import type { Context } from "hono";
import type { EtherscanVerifyRequestBody, Env } from "../types";

const ETHERSCAN_V2_API = "https://api.etherscan.io/v2/api";

export async function etherscanVerifyHandler(c: Context<{ Bindings: Env }>) {
  const body = c.get("validatedBody" as never) as unknown as EtherscanVerifyRequestBody;

  const params = new URLSearchParams({
    chainid: String(body.chainId),
    module: "contract",
    action: "getsourcecode",
    address: body.address,
    apikey: c.env.ETHERSCAN_API_KEY,
  });

  try {
    const response = await fetch(`${ETHERSCAN_V2_API}?${params.toString()}`);

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        if (retryAfter) c.header("Retry-After", retryAfter);
        return c.json({ error: "Etherscan rate limit exceeded" }, 429);
      }
      return c.json({ error: `Etherscan API error (HTTP ${status})` }, 502);
    }

    const data = await response.json();
    return c.json(data);
  } catch {
    return c.json({ error: "Failed to connect to Etherscan API" }, 502);
  }
}
