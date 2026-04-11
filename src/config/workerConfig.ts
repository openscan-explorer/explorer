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

/** HTTP status codes that trigger failover to the next worker */
const FAILOVER_STATUSES = new Set([429, 502, 503]);

/**
 * Fetch from the worker proxy with automatic failover across platforms.
 * Tries each worker URL in order (Cloudflare → Vercel).
 * Falls through on network errors, 429, 502, and 503 responses.
 */
export async function fetchWithWorkerFailover(path: string, init?: RequestInit): Promise<Response> {
  let lastResponse: Response | undefined;
  let lastError: Error | undefined;

  for (const baseUrl of WORKER_URLS) {
    try {
      const response = await fetch(`${baseUrl}${path}`, init);
      if (!FAILOVER_STATUSES.has(response.status)) {
        return response;
      }
      lastResponse = response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError ?? new Error("All worker proxies failed");
}
