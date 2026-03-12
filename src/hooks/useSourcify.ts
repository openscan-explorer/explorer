import { useEffect, useState } from "react";
import { logger } from "../utils/logger";

export interface SourcifyMatch {
  match: "perfect" | "partial" | null;
  creation_match: "perfect" | "partial" | null;
  runtime_match: "perfect" | "partial" | null;
  chainId: string; // This is the Sourcify API response field - keep as chainId
  address: string;
  verifiedAt?: string;
}

export interface SourcifyProxyResolution {
  isProxy: boolean;
  proxyType?: string;
  implementations?: { address: string; name?: string }[];
}

export interface SourcifyContractDetails extends SourcifyMatch {
  name?: string;
  compilerVersion?: string;
  evmVersion?: string;
  language?: string;
  optimizerEnabled?: boolean;
  optimizerRuns?: number;
  files?: {
    name: string;
    path: string;
    content: string;
  }[];
  sources?: Record<
    string,
    {
      content: string;
    }
  >;
  // biome-ignore lint/suspicious/noExplicitAny: <TODO>
  metadata?: any;
  // biome-ignore lint/suspicious/noExplicitAny: <TODO>
  abi?: any[];
  proxyResolution?: SourcifyProxyResolution;
  runtimeBytecode?: { onchainBytecode?: string };
}

/** Raw shape returned by Sourcify V2 API (?fields=all). */
interface SourcifyV2Raw {
  match?: string;
  creationMatch?: string;
  runtimeMatch?: string;
  chainId?: string;
  address?: string;
  verifiedAt?: string;
  sources?: Record<string, { content: string }>;
  runtimeBytecode?: { onchainBytecode?: string };
  // biome-ignore lint/suspicious/noExplicitAny: ABI items can be any shape
  abi?: any[];
  compilation?: {
    name?: string;
    compilerVersion?: string;
    language?: string;
    compilerSettings?: {
      evmVersion?: string;
      optimizer?: {
        enabled?: boolean;
        runs?: number;
      };
    };
  };
  proxyResolution?: {
    isProxy: boolean;
    proxyType?: string;
    implementations?: { address: string; name?: string }[];
  };
}

function normalizeMatch(raw?: string): "perfect" | "partial" | null {
  if (!raw) return null;
  if (raw === "exact_match" || raw === "perfect") return "perfect";
  if (raw.includes("partial")) return "partial";
  return null;
}

function mapV2Response(raw: SourcifyV2Raw): SourcifyContractDetails {
  const compilation = raw.compilation;
  const settings = compilation?.compilerSettings;

  const sources = raw.sources ?? undefined;
  const files = sources
    ? Object.entries(sources).map(([path, src]) => ({
        name: path.split("/").pop() ?? path,
        path,
        content: src.content ?? "",
      }))
    : undefined;

  return {
    name: compilation?.name,
    compilerVersion: compilation?.compilerVersion,
    evmVersion: settings?.evmVersion,
    language: compilation?.language,
    optimizerEnabled: settings?.optimizer?.enabled,
    optimizerRuns: settings?.optimizer?.runs,
    abi: raw.abi,
    sources,
    files,
    match: normalizeMatch(raw.match),
    creation_match: normalizeMatch(raw.creationMatch),
    runtime_match: normalizeMatch(raw.runtimeMatch),
    chainId: raw.chainId ?? "",
    address: raw.address ?? "",
    verifiedAt: raw.verifiedAt,
    proxyResolution: raw.proxyResolution,
    runtimeBytecode: raw.runtimeBytecode,
  };
}

const SOURCIFY_API_V2_BASE = "https://sourcify.dev/server";

/**
 * Hook to fetch verified contract data from Sourcify API
 * @param networkId - The network ID
 * @param address - The contract address
 * @param enabled - Whether to fetch data (default: true)
 */
export const useSourcify = (
  networkId: number,
  address: string | undefined,
  enabled: boolean = true,
) => {
  const [data, setData] = useState<SourcifyContractDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean>(false);

  useEffect(() => {
    if (!enabled || !address || !networkId) {
      return;
    }

    const fetchContractData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Build query params
        const params = new URLSearchParams();
        params.append("fields", "all");

        const queryString = params.toString();
        // Sourcify API uses chainId in the URL path
        const url = `${SOURCIFY_API_V2_BASE}/v2/contract/${networkId}/${address}${queryString ? `?${queryString}` : ""}`;

        const response = await fetch(url);

        if (!response.ok) {
          if (response.status === 404) {
            setIsVerified(false);
            setData(null);
            setError("Contract not verified on Sourcify");
          } else {
            throw new Error(`Failed to fetch contract data: ${response.statusText}`);
          }
          return;
        }

        const raw = (await response.json()) as SourcifyV2Raw;
        const contractData = mapV2Response(raw);
        setData(contractData);
        setIsVerified(!!contractData.match);
      } catch (err) {
        logger.error("Error fetching Sourcify data:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        setIsVerified(false);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchContractData();
  }, [networkId, address, enabled]);

  return {
    data,
    loading,
    error,
    isVerified,
  };
};

/**
 * Utility function to check if a contract is verified on Sourcify
 * @param networkId - The network ID
 * @param address - The contract address
 * @returns Promise<boolean>
 */
export const checkSourcifyVerification = async (
  networkId: number,
  address: string,
): Promise<boolean> => {
  try {
    // Sourcify API uses chainId in URL path
    const url = `${SOURCIFY_API_V2_BASE}/v2/contract/${networkId}/${address}`;
    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();
      return !!data.match;
    }
    return false;
  } catch (err) {
    logger.error("Error checking Sourcify verification:", err);
    return false;
  }
};
