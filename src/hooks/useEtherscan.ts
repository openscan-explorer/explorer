import { useEffect, useState } from "react";
import { useSettings } from "../context/SettingsContext";
import { logger } from "../utils/logger";
import type { SourcifyContractDetails } from "./useSourcify";

const ETHERSCAN_V2_API = "https://api.etherscan.io/v2/api";

interface EtherscanSourceResult {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  OptimizationUsed: string;
  Runs: string;
  ConstructorArguments: string;
  EVMVersion: string;
  Library: string;
  LicenseType: string;
  Proxy: string;
  Implementation: string;
  SwarmSource: string;
}

interface StandardJsonSources {
  sources?: Record<string, { content: string }>;
}

/**
 * Parse Etherscan SourceCode field into SourcifyContractDetails files array.
 * Handles three formats:
 *   1. Plain Solidity string
 *   2. Double-brace JSON "{{...}}" (standard JSON input)
 *   3. Single-brace JSON "{...}" (standard JSON input)
 */
function parseSourceFiles(
  sourceCode: string,
  contractName: string,
): { name: string; path: string; content: string }[] {
  if (!sourceCode) return [];

  // Try double-brace format first (Etherscan wraps standard JSON in {{ ... }})
  const doubleBrace = sourceCode.startsWith("{{") && sourceCode.endsWith("}}");
  const singleBrace = !doubleBrace && sourceCode.startsWith("{");

  if (doubleBrace || singleBrace) {
    try {
      const jsonStr = doubleBrace ? sourceCode.slice(1, -1) : sourceCode;
      const parsed = JSON.parse(jsonStr) as StandardJsonSources;
      if (parsed.sources && typeof parsed.sources === "object") {
        return Object.entries(parsed.sources).map(([path, src]) => ({
          name: path.split("/").pop() ?? path,
          path,
          content: src.content ?? "",
        }));
      }
    } catch {
      // Fall through to treat as plain source
    }
  }

  // Plain Solidity source
  const fileName = `${contractName || "Contract"}.sol`;
  return [{ name: fileName, path: fileName, content: sourceCode }];
}

/**
 * Hook to fetch verified contract data from Etherscan V2 API.
 * Returns the same shape as useSourcify for drop-in compatibility.
 * Only fetches when `enabled` is true AND an Etherscan API key is configured.
 */
export function useEtherscan(
  networkId: number,
  address: string | undefined,
  enabled: boolean,
): { data: SourcifyContractDetails | null; loading: boolean; isVerified: boolean } {
  const { settings } = useSettings();
  const apiKey = settings.apiKeys?.etherscan;

  const [data, setData] = useState<SourcifyContractDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (!enabled || !address || !networkId || !apiKey) {
      setData(null);
      setIsVerified(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          chainid: String(networkId),
          module: "contract",
          action: "getsourcecode",
          address,
          apikey: apiKey,
        });
        const url = `${ETHERSCAN_V2_API}?${params.toString()}`;
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          setData(null);
          setIsVerified(false);
          return;
        }

        const json = await response.json();

        // Etherscan returns status "0" when not verified or error
        if (json.status !== "1" || !Array.isArray(json.result) || json.result.length === 0) {
          setData(null);
          setIsVerified(false);
          return;
        }

        const result = json.result[0] as EtherscanSourceResult;

        // "Contract source code not verified" means not verified
        if (
          typeof result === "string" ||
          result.ABI === "Contract source code not verified" ||
          !result.ABI ||
          result.ABI === ""
        ) {
          setData(null);
          setIsVerified(false);
          return;
        }

        // Parse ABI
        // biome-ignore lint/suspicious/noExplicitAny: ABI items can be any shape
        let abi: any[] | undefined;
        try {
          abi = JSON.parse(result.ABI) as typeof abi;
        } catch {
          abi = undefined;
        }

        const files = parseSourceFiles(result.SourceCode, result.ContractName);
        const evmVersion =
          result.EVMVersion && result.EVMVersion !== "Default" ? result.EVMVersion : undefined;

        const contractDetails: SourcifyContractDetails = {
          name: result.ContractName || undefined,
          compilerVersion: result.CompilerVersion || undefined,
          evmVersion,
          abi,
          files,
          match: "perfect",
          creation_match: null,
          runtime_match: null,
          chainId: String(networkId),
          address,
        };

        setData(contractDetails);
        setIsVerified(true);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        logger.error("Error fetching Etherscan data:", err);
        setData(null);
        setIsVerified(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [networkId, address, enabled, apiKey]);

  return { data, loading, isVerified };
}
