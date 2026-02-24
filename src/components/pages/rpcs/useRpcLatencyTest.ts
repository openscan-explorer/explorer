import { useCallback, useRef, useState } from "react";
import type { NetworkType } from "../../../types";
import { logger } from "../../../utils/logger";

export type RpcTestStatus = "online" | "offline" | "timeout" | "pending" | "untested";

export interface RpcTestResult {
  url: string;
  status: RpcTestStatus;
  latency: number | null;
  blockNumber: string | null;
  error: string | null;
}

const TIMEOUT_MS = 10_000;
const BATCH_SIZE = 6;

function buildRpcBody(networkType: NetworkType): string {
  if (networkType === "bitcoin") {
    return JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getblockcount", params: [] });
  }
  return JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] });
}

async function testEndpoint(
  url: string,
  signal: AbortSignal,
  networkType: NetworkType,
): Promise<RpcTestResult> {
  const start = performance.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: buildRpcBody(networkType),
      signal,
    });

    if (!res.ok) {
      return {
        url,
        status: "offline",
        latency: null,
        blockNumber: null,
        error: `HTTP ${res.status}`,
      };
    }

    const json = await res.json();
    const latency = Math.round(performance.now() - start);

    if (json.error) {
      return {
        url,
        status: "offline",
        latency,
        blockNumber: null,
        error: typeof json.error === "object" ? (json.error.message ?? "RPC error") : "RPC error",
      };
    }

    const blockNumber =
      networkType === "bitcoin" ? String(json.result ?? "") : (json.result ?? null);

    return {
      url,
      status: "online",
      latency,
      blockNumber,
      error: null,
    };
  } catch (err) {
    if (signal.aborted) {
      return { url, status: "timeout", latency: null, blockNumber: null, error: "Timeout" };
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.debug(`RPC test failed for ${url}: ${message}`);
    return { url, status: "offline", latency: null, blockNumber: null, error: message };
  }
}

export function useRpcLatencyTest() {
  const [results, setResults] = useState<Map<string, RpcTestResult>>(new Map());
  const [isTesting, setIsTesting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const testSingle = useCallback(async (url: string, networkType: NetworkType = "evm") => {
    setResults((prev) => {
      const next = new Map(prev);
      next.set(url, { url, status: "pending", latency: null, blockNumber: null, error: null });
      return next;
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const result = await testEndpoint(url, controller.signal, networkType);
    clearTimeout(timeout);

    setResults((prev) => {
      const next = new Map(prev);
      next.set(url, result);
      return next;
    });
    return result;
  }, []);

  const testAll = useCallback(async (urls: string[], networkType: NetworkType = "evm") => {
    // Cancel any in-flight test run
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsTesting(true);

    // Mark all as pending
    setResults(() => {
      const next = new Map<string, RpcTestResult>();
      for (const url of urls) {
        next.set(url, { url, status: "pending", latency: null, blockNumber: null, error: null });
      }
      return next;
    });

    // Process in batches
    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      if (controller.signal.aborted) break;

      const batch = urls.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((url) => {
          const itemController = new AbortController();
          const itemTimeout = setTimeout(() => itemController.abort(), TIMEOUT_MS);

          const onParentAbort = () => itemController.abort();
          controller.signal.addEventListener("abort", onParentAbort);

          return testEndpoint(url, itemController.signal, networkType).finally(() => {
            clearTimeout(itemTimeout);
            controller.signal.removeEventListener("abort", onParentAbort);
          });
        }),
      );

      if (controller.signal.aborted) break;

      setResults((prev) => {
        const next = new Map(prev);
        for (const r of batchResults) {
          next.set(r.url, r);
        }
        return next;
      });
    }

    setIsTesting(false);
  }, []);

  const clearResults = useCallback(() => {
    abortRef.current?.abort();
    setResults(new Map());
    setIsTesting(false);
  }, []);

  return { results, isTesting, testAll, testSingle, clearResults };
}
