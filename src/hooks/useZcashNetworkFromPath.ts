import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { getNetworkBySlug } from "../config/networks";
import type { NetworkConfig } from "../types";

export interface ZcashPathNetwork {
  /** Route slug, e.g. "zec" or "tzec" (also the prefix of every Zcash route) */
  slug: string;
  network: NetworkConfig | undefined;
  /** Full network name, e.g. "Zcash Mainnet" */
  name: string;
  /** Short label for headings, e.g. "Zcash" */
  label: string;
  /** Ticker for amounts (testnet uses TAZ) */
  currency: string;
  /** Network ID used as the cache key prefix */
  cacheNetworkId: string;
}

/**
 * The Zcash network a page belongs to, from the first segment of the route
 */
export function useZcashNetworkFromPath(): ZcashPathNetwork {
  const { pathname } = useLocation();
  const slug = pathname.split("/")[1] || "zec";

  return useMemo(() => {
    const network = getNetworkBySlug(slug);
    return {
      slug,
      network,
      name: network?.name ?? slug,
      label: network?.shortName || slug.toUpperCase(),
      currency: network?.currency ?? "ZEC",
      cacheNetworkId: network?.networkId ?? slug,
    };
  }, [slug]);
}
