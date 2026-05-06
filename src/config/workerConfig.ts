/** Worker proxy URLs in failover order: Cloudflare → Vercel */
export const WORKER_URLS: string[] = [
  import.meta.env.OPENSCAN_WORKER_URL || "https://openscan-worker-proxy.openscan.workers.dev",
  "https://openscan-worker-proxy.vercel.app",
];

/** Primary worker URL — used for building default RPC endpoint URLs */
export const OPENSCAN_WORKER_URL = WORKER_URLS[0] as string;

/** Check whether a URL points to any of the OpenScan worker proxies */
export function isWorkerProxyUrl(url: string): boolean {
  return WORKER_URLS.some((baseUrl) => url.startsWith(baseUrl));
}

/** HTTP status codes that trigger immediate failover to the next worker */
const FAILOVER_STATUSES = new Set([502, 503]);

/** Per-request timeout — if a worker hangs, abort and try the next one */
const REQUEST_TIMEOUT_MS = 15_000;

/** Delay before retrying a 429'd request on the same worker */
const RETRY_DELAY_MS = 3_000;

/**
 * Fetch with a timeout. Aborts the request if it exceeds REQUEST_TIMEOUT_MS.
 */
async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch from the worker proxy with automatic failover across platforms.
 * Tries each worker URL in order (Cloudflare → Vercel).
 *
 * Per worker:
 *  - Aborts after 15s if hanging (timeout → try next worker)
 *  - On 429 (rate limited): waits Retry-After header (or 3s) and retries once on the same worker
 *  - On 502/503: immediately fails over to the next worker
 *  - On network error: immediately fails over to the next worker
 */
export async function fetchWithWorkerFailover(path: string, init?: RequestInit): Promise<Response> {
  let lastResponse: Response | undefined;
  let lastError: Error | undefined;

  for (const baseUrl of WORKER_URLS) {
    try {
      const url = `${baseUrl}${path}`;
      const response = await fetchWithTimeout(url, init);

      // 502/503 → immediately try next worker
      if (FAILOVER_STATUSES.has(response.status)) {
        lastResponse = response;
        continue;
      }

      // 429 → retry once on the same worker after a delay
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const delayMs = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : RETRY_DELAY_MS;
        await new Promise((r) => setTimeout(r, Math.min(delayMs, 10_000)));

        const retryResponse = await fetchWithTimeout(url, init);
        if (!FAILOVER_STATUSES.has(retryResponse.status) && retryResponse.status !== 429) {
          return retryResponse;
        }
        lastResponse = retryResponse;
        continue;
      }

      return response;
    } catch (error) {
      // Network error or timeout → try next worker
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError ?? new Error("All worker proxies failed");
}
