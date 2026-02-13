import type { ABI, ABIParameter } from "../../../types";

const MAX_ABI_FUNCTIONS = 30;
const MAX_ABI_EVENTS = 30;
const MAX_SOURCE_FILES = 25;

type AIContractDataSummary = {
  name?: string;
  match?: string | null;
  creation_match?: string | null;
  runtime_match?: string | null;
  compilerVersion?: string;
  evmVersion?: string;
  chainId?: string;
  verifiedAt?: string;
  metadata?: {
    compiler?: { version: string };
    language?: string;
  };
  abi?: {
    functions: Array<{
      name: string;
      inputs: string[];
      outputs: string[];
      stateMutability?: string;
    }>;
    events: Array<{
      name: string;
      inputs: string[];
      anonymous?: boolean;
    }>;
    totals: {
      functions: number;
      events: number;
    };
  };
  sourceFiles?: string[];
};

type AIContractDataSummaryAbi = NonNullable<AIContractDataSummary["abi"]>;

export function compactContractDataForAI(
  contractData?: unknown,
): AIContractDataSummary | undefined {
  if (!contractData || typeof contractData !== "object") return undefined;
  const data = contractData as Record<string, unknown>;

  const abi = Array.isArray(data.abi) ? (data.abi as ABI[]) : undefined;
  const summarizedAbi = abi ? summarizeAbi(abi) : undefined;
  const sourceFiles = extractSourceFileNames(data);
  return {
    name: asString(data.name),
    match: asStringOrNull(data.match),
    creation_match: asStringOrNull(data.creation_match),
    runtime_match: asStringOrNull(data.runtime_match),
    compilerVersion: asString(data.compilerVersion),
    evmVersion: asString(data.evmVersion),
    chainId: asString(data.chainId),
    verifiedAt: asString(data.verifiedAt),
    metadata: extractMetadata(data.metadata),
    abi: summarizedAbi,
    sourceFiles,
  };
}

function extractMetadata(metadata: unknown): AIContractDataSummary["metadata"] | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const obj = metadata as Record<string, unknown>;
  const compiler = obj.compiler && typeof obj.compiler === "object" ? obj.compiler : undefined;
  const compilerVersion =
    compiler && typeof compiler === "object"
      ? (compiler as Record<string, unknown>).version
      : undefined;

  const language = asString(obj.language);
  if (!compilerVersion && !language) return undefined;

  return {
    compiler: compilerVersion ? { version: String(compilerVersion) } : undefined,
    language,
  };
}

function extractSourceFileNames(data: Record<string, unknown>): string[] | undefined {
  const files = Array.isArray(data.files) ? data.files : undefined;
  if (files) {
    const names = files
      .map((file) => {
        if (!file || typeof file !== "object") return undefined;
        const f = file as Record<string, unknown>;
        return asString(f.path) ?? asString(f.name);
      })
      .filter((name): name is string => Boolean(name));
    return names.slice(0, MAX_SOURCE_FILES);
  }

  const sources = data.sources && typeof data.sources === "object" ? data.sources : undefined;
  if (sources) {
    const keys = Object.keys(sources as Record<string, unknown>);
    return keys.slice(0, MAX_SOURCE_FILES);
  }

  return undefined;
}

function summarizeAbi(abi: ABI[]): AIContractDataSummaryAbi {
  const functions: AIContractDataSummaryAbi["functions"] = [];
  const events: AIContractDataSummaryAbi["events"] = [];
  let totalFunctions = 0;
  let totalEvents = 0;

  for (const item of abi) {
    if (!item || typeof item !== "object") continue;
    if (item.type === "function") {
      totalFunctions += 1;
      if (functions.length < MAX_ABI_FUNCTIONS) {
        functions.push({
          name: item.name ?? "(anonymous)",
          inputs: (item.inputs ?? []).map(formatAbiParam),
          outputs: (item.outputs ?? []).map(formatAbiParam),
          stateMutability: item.stateMutability,
        });
      }
      continue;
    }
    if (item.type === "event") {
      totalEvents += 1;
      if (events.length < MAX_ABI_EVENTS) {
        events.push({
          name: item.name ?? "(anonymous)",
          inputs: (item.inputs ?? []).map(formatAbiParam),
          anonymous: Boolean(item.anonymous),
        });
      }
    }
  }

  return {
    functions,
    events,
    totals: {
      functions: totalFunctions,
      events: totalEvents,
    },
  };
}

function formatAbiParam(param: ABIParameter | undefined | null): string {
  if (!param) return "unknown";
  const label = param.name ? `${param.name}:` : "";
  return `${label}${param.type}`;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asStringOrNull(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value === "string" && value.length > 0) return value;
  return undefined;
}
