import type { Context } from "hono";
import type { AnalyzeRequestBody, Env } from "../types";

const MAX_TOKENS = 4096;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function analyzeHandler(c: Context<{ Bindings: Env }>) {
  const body = c.get("validatedBody" as never) as unknown as AnalyzeRequestBody;
  const model = c.env.GROQ_MODEL || "groq/compound";

  const groqBody = {
    model,
    messages: body.messages,
    max_tokens: MAX_TOKENS,
    temperature: 0,
  };

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${c.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(groqBody),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        if (retryAfter) c.header("Retry-After", retryAfter);
        return c.json({ error: "Groq rate limit exceeded" }, 429);
      }
      if (status === 401) {
        return c.json({ error: "AI service configuration error" }, 500);
      }
      return c.json({ error: `AI service error (HTTP ${status})` }, 502);
    }

    const data = await response.json();
    return c.json(data);
  } catch {
    return c.json({ error: "Failed to connect to AI service" }, 502);
  }
}
