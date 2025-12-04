import { useEffect, useState } from "react";

export interface SourcifyMatch {
  match: "perfect" | "partial" | null;
  creation_match: "perfect" | "partial" | null;
  runtime_match: "perfect" | "partial" | null;
  chainId: string; // This is the Sourcify API response field - keep as chainId
  address: string;
  verifiedAt?: string;
}

export interface SourcifyContractDetails extends SourcifyMatch {
  name?: string;
  compilerVersion?: string;
  evmVersion?: string;
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
}

const SOURCIFY_API_BASE = "https://repo.sourcify.dev/contracts";
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

        const contractData: SourcifyContractDetails = await response.json();
        setData(contractData);
        setIsVerified(!!contractData.match);
      } catch (err) {
        console.error("Error fetching Sourcify data:", err);
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
 * Hook to fetch contract source files from Sourcify
 * @param networkId - The network ID
 * @param address - The contract address
 * @param matchType - Type of match to fetch: 'full_match' | 'partial_match'
 * @param enabled - Whether to fetch data (default: true)
 */
export const useSourcifyFiles = (
  networkId: number,
  address: string | undefined,
  matchType: "full_match" | "partial_match" = "full_match",
  enabled: boolean = true,
) => {
  const [files, setFiles] = useState<{ name: string; content: string; path: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !address || !networkId) {
      return;
    }

    const fetchFiles = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch the file tree first (Sourcify API uses chainId in URL)
        const treeUrl = `${SOURCIFY_API_BASE}/${matchType}/${networkId}/${address}/`;
        const treeResponse = await fetch(treeUrl);

        if (!treeResponse.ok) {
          throw new Error("Files not found");
        }

        const treeText = await treeResponse.text();

        // Parse the directory listing (this is a simplified parser)
        // In production, you might want to use the API v2 files endpoint instead
        const fileMatches = treeText.match(/href="([^"]+)"/g);

        if (fileMatches) {
          const fileList = fileMatches
            .map((match) => match.match(/href="([^"]+)"/)?.[1])
            .filter((file): file is string => !!file && !file.endsWith("/"));

          // Fetch each file content
          const fileContents = await Promise.all(
            fileList.map(async (fileName) => {
              const fileUrl = `${treeUrl}${fileName}`;
              const fileResponse = await fetch(fileUrl);
              const content = await fileResponse.text();
              return {
                name: fileName,
                path: fileName,
                content,
              };
            }),
          );

          setFiles(fileContents);
        }
      } catch (err) {
        console.error("Error fetching Sourcify files:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        setFiles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [networkId, address, matchType, enabled]);

  return {
    files,
    loading,
    error,
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
    console.error("Error checking Sourcify verification:", err);
    return false;
  }
};
