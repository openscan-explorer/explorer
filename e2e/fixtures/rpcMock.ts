import type { Page, Route } from "@playwright/test";

/**
 * Playwright route helpers for simulating RPC-layer failures and serving
 * canned JSON-RPC responses.
 *
 * Use these in the `mocked` Playwright project (see `playwright.config.ts`)
 * where the test drives the app against a synthetic RPC endpoint rather than
 * a live provider. This keeps strategy / error-path / worker-fallover tests
 * deterministic.
 *
 * Typical usage:
 *   await mockJsonRpc(page, "https://mock-rpc.local/", {
 *     eth_blockNumber: () => "0x10",
 *     eth_chainId: () => "0x1",
 *   });
 */

type RpcMethodHandler =
  | ((params: unknown[]) => unknown)
  | { result: unknown }
  | { error: { code: number; message: string } };

export interface MockOptions {
  /** Return HTTP status instead of a JSON-RPC response. Overrides handlers. */
  httpStatus?: number;
  /** Delay before responding, in ms. */
  delayMs?: number;
  /** Abort the request entirely (simulates ECONNREFUSED). */
  abort?: boolean;
}

/**
 * Intercept all requests matching `urlPattern` and respond with canned JSON-RPC
 * results keyed by method name. Methods not listed return
 * `{ error: { code: -32601, message: "method not found" } }`.
 */
export async function mockJsonRpc(
  page: Page,
  urlPattern: string | RegExp,
  handlers: Record<string, RpcMethodHandler> = {},
  options: MockOptions = {},
): Promise<void> {
  await page.route(urlPattern, async (route: Route) => {
    if (options.abort) {
      await route.abort("connectionrefused");
      return;
    }
    if (options.delayMs) {
      await new Promise((r) => setTimeout(r, options.delayMs));
    }
    if (options.httpStatus && options.httpStatus >= 400) {
      await route.fulfill({
        status: options.httpStatus,
        contentType: "application/json",
        body: JSON.stringify({ error: `HTTP ${options.httpStatus}` }),
      });
      return;
    }

    const req = route.request();
    const postDataRaw = req.postData() ?? "{}";
    let parsed: { id?: number | string; method?: string; params?: unknown[] } = {};
    try {
      parsed = JSON.parse(postDataRaw);
    } catch {
      // fall through — empty method
    }
    const { id = 1, method = "", params = [] } = parsed;

    const handler = handlers[method];
    let body: unknown;
    if (!handler) {
      body = {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `method ${method} not mocked` },
      };
    } else if (typeof handler === "function") {
      body = { jsonrpc: "2.0", id, result: handler(params) };
    } else if ("result" in handler) {
      body = { jsonrpc: "2.0", id, result: handler.result };
    } else {
      body = { jsonrpc: "2.0", id, error: handler.error };
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

/**
 * Return an HTTP error (useful for worker fallover tests: Cloudflare 503 →
 * Vercel primary).
 */
export async function mockHttpError(
  page: Page,
  urlPattern: string | RegExp,
  status: number,
): Promise<void> {
  await page.route(urlPattern, async (route) => {
    await route.fulfill({
      status,
      contentType: "text/plain",
      body: `mock ${status}`,
    });
  });
}

/** Simulate rate-limiting on the first N requests, then succeed. */
export async function mock429ThenSuccess(
  page: Page,
  urlPattern: string | RegExp,
  failuresBeforeSuccess: number,
  successBody: unknown,
): Promise<void> {
  let calls = 0;
  await page.route(urlPattern, async (route) => {
    calls += 1;
    if (calls <= failuresBeforeSuccess) {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        headers: { "retry-after": "0" },
        body: JSON.stringify({ error: "rate limited" }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(successBody),
    });
  });
}

/** Abort every matching request — simulates total RPC outage. */
export async function mockOffline(page: Page, urlPattern: string | RegExp): Promise<void> {
  await page.route(urlPattern, async (route) => {
    await route.abort("connectionrefused");
  });
}
