import { logger } from "./logger";

export interface ContractInfo {
  name?: string;
  // biome-ignore lint/suspicious/noExplicitAny: ABI types are dynamic
  abi?: any[];
}

// Session-level cache keyed by "chainId:address"
const cache = new Map<string, ContractInfo | null>();

/**
 * Fetch contract name + ABI for a single address.
 * Tries Sourcify first; falls back to Etherscan V2 API if a key is provided.
 * Results are cached in memory for the session.
 */
export async function fetchContractInfo(
  address: string,
  chainId: number,
  signal?: AbortSignal,
  etherscanKey?: string,
): Promise<ContractInfo | null> {
  const cacheKey = `${chainId}:${address.toLowerCase()}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null;

  // ── Sourcify V2 ──────────────────────────────────────────────────────────
  try {
    const res = await fetch(
      `https://sourcify.dev/server/v2/contract/${chainId}/${address}?fields=abi,compilation,proxyResolution`,
      { signal },
    );
    if (res.ok) {
      const data = await res.json();
      const name = data?.compilation?.name;
      let abi = data?.abi;

      // If this is a proxy, fetch the implementation ABI and merge it
      const implAddr = data?.proxyResolution?.implementations?.[0]?.address;
      if (implAddr) {
        const implInfo = await fetchContractInfo(implAddr, chainId, signal, etherscanKey);
        if (implInfo?.abi) {
          abi = abi ? [...abi, ...implInfo.abi] : implInfo.abi;
        }
      }

      if (abi || name) {
        const info: ContractInfo = { name, abi };
        cache.set(cacheKey, info);
        return info;
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return null;
    logger.debug("Sourcify lookup failed for", address, err);
  }

  // ── Etherscan fallback ────────────────────────────────────────────────────
  if (etherscanKey) {
    try {
      const url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=contract&action=getsourcecode&address=${address}&apikey=${etherscanKey}`;
      const res = await fetch(url, { signal });
      const json = await res.json();
      if (
        json.status === "1" &&
        Array.isArray(json.result) &&
        json.result[0]?.ABI &&
        json.result[0].ABI !== "Contract source code not verified"
      ) {
        const r = json.result[0];
        const abi = JSON.parse(r.ABI);
        const info: ContractInfo = { name: r.ContractName || undefined, abi };
        cache.set(cacheKey, info);
        return info;
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return null;
      logger.debug("Etherscan lookup failed for", address, err);
    }
  }

  cache.set(cacheKey, null);
  return null;
}

/**
 * Fetch contract info for multiple addresses in parallel.
 * Returns a map of lowercased address → ContractInfo.
 */
export async function fetchContractInfoBatch(
  addresses: string[],
  chainId: number,
  signal?: AbortSignal,
  etherscanKey?: string,
): Promise<Record<string, ContractInfo>> {
  const results = await Promise.allSettled(
    addresses.map((addr) => fetchContractInfo(addr, chainId, signal, etherscanKey)),
  );

  const map: Record<string, ContractInfo> = {};
  for (let i = 0; i < addresses.length; i++) {
    const result = results[i];
    const addr = addresses[i]?.toLowerCase();
    if (!addr) continue;
    if (result?.status === "fulfilled" && result.value) {
      map[addr] = result.value;
    }
  }
  return map;
}
