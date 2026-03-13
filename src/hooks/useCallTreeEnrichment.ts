import { useEffect, useRef, useState } from "react";
import { useSettings } from "../context/SettingsContext";
import type { CallNode } from "../services/adapters/NetworkAdapter";
import { collectAddresses } from "../utils/callTreeUtils";
import { type ContractInfo, fetchContractInfoBatch } from "../utils/contractLookup";

/**
 * Fetches contract names + ABIs for all unique addresses in a call tree.
 * Uses Sourcify as primary source, Etherscan as fallback (if key configured).
 * Returns a map of lowercased address → ContractInfo.
 *
 * enrichmentLoading is true from the moment a tree is provided until
 * all contract info has been resolved, so callers can gate rendering.
 */
export function useCallTreeEnrichment(
  tree: CallNode | null,
  networkId: string,
): {
  contracts: Record<string, ContractInfo>;
  enrichmentLoading: boolean;
} {
  const { settings } = useSettings();
  const [contracts, setContracts] = useState<Record<string, ContractInfo>>({});
  const [done, setDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!tree || !networkId) return;

    const chainId = Number(networkId);
    const addresses = collectAddresses(tree);
    if (addresses.length === 0) {
      setDone(true);
      return;
    }

    // Cancel previous fetch
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setDone(false);
    setContracts({});

    fetchContractInfoBatch(addresses, chainId, controller.signal, settings.apiKeys?.etherscan)
      .then((map) => {
        if (!controller.signal.aborted) setContracts(map);
      })
      .finally(() => {
        if (!controller.signal.aborted) setDone(true);
      });

    return () => controller.abort();
  }, [tree, networkId, settings.apiKeys?.etherscan]);

  // Loading until tree is provided AND enrichment has completed
  const enrichmentLoading = !!tree && !done;

  return { contracts, enrichmentLoading };
}
