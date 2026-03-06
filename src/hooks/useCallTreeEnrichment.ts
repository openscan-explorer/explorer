import { useEffect, useRef, useState } from "react";
import { useSettings } from "../context/SettingsContext";
import type { CallNode } from "../services/adapters/NetworkAdapter";
import { collectAddresses } from "../utils/callTreeUtils";
import { type ContractInfo, fetchContractInfoBatch } from "../utils/contractLookup";

/**
 * Fetches contract names + ABIs for all unique addresses in a call tree.
 * Uses Sourcify as primary source, Etherscan as fallback (if key configured).
 * Returns a map of lowercased address → ContractInfo.
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
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!tree || !networkId) return;

    const chainId = Number(networkId);
    const addresses = collectAddresses(tree);
    if (addresses.length === 0) return;

    // Cancel previous fetch
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setEnrichmentLoading(true);
    setContracts({});

    fetchContractInfoBatch(addresses, chainId, controller.signal, settings.apiKeys?.etherscan)
      .then((map) => {
        if (!controller.signal.aborted) setContracts(map);
      })
      .finally(() => {
        if (!controller.signal.aborted) setEnrichmentLoading(false);
      });

    return () => controller.abort();
  }, [tree, networkId, settings.apiKeys?.etherscan]);

  return { contracts, enrichmentLoading };
}
