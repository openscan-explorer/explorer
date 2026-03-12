import { useSettings } from "../context/SettingsContext";
import { useEtherscan } from "./useEtherscan";
import type { SourcifyContractDetails } from "./useSourcify";
import { useSourcify } from "./useSourcify";

export type VerificationSource = ("sourcify" | "etherscan")[];

export interface ContractVerificationResult {
  data: SourcifyContractDetails | null;
  loading: boolean;
  isVerified: boolean;
  source: VerificationSource;
}

/**
 * Unified contract verification hook.
 * Fetches Sourcify and Etherscan simultaneously (when a key is configured).
 * Sourcify data takes priority when available (more canonical/trustless).
 * source is an array of the providers that verified the contract; empty = not verified.
 */
export function useContractVerification(
  networkId: number,
  address: string | undefined,
  enabled: boolean = true,
): ContractVerificationResult {
  const { settings } = useSettings();
  const hasEtherscanKey = !!settings.apiKeys?.etherscan;

  const {
    data: sourcifyData,
    loading: sourcifyLoading,
    isVerified: sourcifyVerified,
  } = useSourcify(networkId, address, enabled);

  // Run Etherscan in parallel whenever a key is configured
  const {
    data: etherscanData,
    loading: etherscanLoading,
    isVerified: etherscanVerified,
  } = useEtherscan(networkId, address, enabled && hasEtherscanKey);

  const loading = sourcifyLoading || etherscanLoading;
  const source: VerificationSource = [
    ...(sourcifyVerified ? (["sourcify"] as const) : []),
    ...(etherscanVerified ? (["etherscan"] as const) : []),
  ];
  const isVerified = source.length > 0;

  // Sourcify data takes priority; fall back to Etherscan data
  const data = (sourcifyVerified && sourcifyData) || (etherscanVerified && etherscanData) || null;

  return { data, loading, isVerified, source };
}
