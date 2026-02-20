import type { ABI } from "../../../types";

const MAX_SOURCE_FILES = 25;
const MAX_FUNCTIONS_PER_CATEGORY = 15;
const MAX_EVENTS = 20;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AIContractDataSummary = {
  name?: string;
  compilerVersion?: string;
  evmVersion?: string;
  language?: string;
  verifiedAt?: string;
  detectedInterfaces: string[];
  protocolHints: string[];
  functionSummary: {
    total: number;
    view: number;
    stateChanging: number;
    payable: number;
  };
  categorizedFunctions: {
    admin?: string[];
    hooks?: string[];
    core?: string[];
    view?: string[];
  };
  keyEvents?: string[];
  sourceFiles?: string[];
};

// ---------------------------------------------------------------------------
// Interface detection
// ---------------------------------------------------------------------------

interface InterfaceDefinition {
  name: string;
  requiredFunctions: string[]; // "functionName:inputCount"
  minMatch?: number; // defaults to all
}

const KNOWN_INTERFACES: InterfaceDefinition[] = [
  {
    name: "ERC-20",
    requiredFunctions: [
      "totalSupply:0",
      "balanceOf:1",
      "transfer:2",
      "approve:2",
      "transferFrom:3",
      "allowance:2",
    ],
    minMatch: 5,
  },
  {
    name: "ERC-721",
    requiredFunctions: [
      "balanceOf:1",
      "ownerOf:1",
      "safeTransferFrom:4",
      "transferFrom:3",
      "approve:2",
      "setApprovalForAll:2",
      "getApproved:1",
      "isApprovedForAll:2",
    ],
    minMatch: 5,
  },
  {
    name: "ERC-1155",
    requiredFunctions: [
      "balanceOf:2",
      "balanceOfBatch:2",
      "safeTransferFrom:5",
      "safeBatchTransferFrom:5",
      "setApprovalForAll:2",
      "isApprovedForAll:2",
    ],
    minMatch: 4,
  },
  {
    name: "Uniswap V4 Hook",
    requiredFunctions: [
      "beforeSwap:4",
      "afterSwap:5",
      "beforeAddLiquidity:4",
      "beforeRemoveLiquidity:4",
    ],
    minMatch: 2,
  },
  {
    name: "EIP-712",
    requiredFunctions: ["eip712Domain:0"],
  },
  {
    name: "Ownable",
    requiredFunctions: ["owner:0", "transferOwnership:1", "renounceOwnership:0"],
    minMatch: 2,
  },
  {
    name: "AccessControl",
    requiredFunctions: ["hasRole:2", "getRoleAdmin:1", "grantRole:2", "revokeRole:2"],
    minMatch: 3,
  },
  {
    name: "Pausable",
    requiredFunctions: ["paused:0", "pause:0", "unpause:0"],
    minMatch: 2,
  },
  {
    name: "ERC-2612 (Permit)",
    requiredFunctions: ["permit:7", "nonces:1", "DOMAIN_SEPARATOR:0"],
    minMatch: 2,
  },
  {
    name: "UUPS Proxy",
    requiredFunctions: ["proxiableUUID:0", "upgradeToAndCall:2"],
  },
  {
    name: "Transparent Proxy",
    requiredFunctions: ["implementation:0", "upgradeTo:1"],
  },
];

function detectInterfaces(abi: ABI[]): {
  detectedInterfaces: string[];
  knownFunctionNames: Set<string>;
} {
  const signatureSet = new Set<string>();
  for (const item of abi) {
    if (item?.type === "function" && item.name) {
      signatureSet.add(`${item.name}:${item.inputs?.length ?? 0}`);
    }
  }

  const detectedInterfaces: string[] = [];
  const knownFunctionNames = new Set<string>();

  for (const iface of KNOWN_INTERFACES) {
    const threshold = iface.minMatch ?? iface.requiredFunctions.length;
    let matched = 0;
    const matchedNames: string[] = [];

    for (const sig of iface.requiredFunctions) {
      if (signatureSet.has(sig)) {
        matched += 1;
        matchedNames.push(sig.split(":")[0] ?? "");
      }
    }

    if (matched >= threshold) {
      detectedInterfaces.push(iface.name);
      for (const name of matchedNames) {
        knownFunctionNames.add(name);
      }
    }
  }

  return { detectedInterfaces, knownFunctionNames };
}

// ---------------------------------------------------------------------------
// Protocol hints from source files
// ---------------------------------------------------------------------------

const PROTOCOL_HINTS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /openzeppelin/i, label: "OpenZeppelin" },
  { pattern: /v4-periphery|v4-core|uniswap.*v4/i, label: "Uniswap V4" },
  { pattern: /uniswap.*v3/i, label: "Uniswap V3" },
  { pattern: /uniswap.*v2/i, label: "Uniswap V2" },
  { pattern: /solady/i, label: "Solady" },
  { pattern: /solmate/i, label: "Solmate" },
  { pattern: /chainlink/i, label: "Chainlink" },
  { pattern: /aave/i, label: "Aave" },
  { pattern: /compound/i, label: "Compound" },
  { pattern: /safe-contracts|gnosis-safe/i, label: "Safe (Gnosis)" },
  { pattern: /eigenlayer/i, label: "EigenLayer" },
  { pattern: /layerzero/i, label: "LayerZero" },
];

function extractProtocolHints(sourceFiles?: string[]): string[] {
  if (!sourceFiles || sourceFiles.length === 0) return [];
  // Only match against directory segments (strip filename) to avoid false positives
  // from contracts whose names happen to include protocol names (e.g. MyUniswapFork.sol)
  const dirSegments = sourceFiles
    .map((f) => f.split("/").slice(0, -1).join("/"))
    .filter((d) => d.length > 0)
    .join("\n");
  const hints: string[] = [];
  for (const { pattern, label } of PROTOCOL_HINTS) {
    if (pattern.test(dirSegments)) {
      hints.push(label);
    }
  }
  return hints;
}

// ---------------------------------------------------------------------------
// Function categorization
// ---------------------------------------------------------------------------

const ADMIN_FUNCTION_PATTERNS = [
  /^(set|update|change|configure|toggle|enable|disable)/i,
  /^(pause|unpause|withdraw|rescue|recover|migrate)/i,
  /^(grant|revoke|renounce|transfer)(Role|Ownership|Admin|Operator)/i,
  /^(add|remove)(Admin|Operator|Manager|Whitelist|Blacklist|Node|Pool)/i,
  /^(pull|collect).*[Ff]ee/,
];

function categorizeFunctions(
  abi: ABI[],
  knownFunctionNames: Set<string>,
): AIContractDataSummary["categorizedFunctions"] {
  const admin: string[] = [];
  const hooks: string[] = [];
  const core: string[] = [];
  const view: string[] = [];

  for (const item of abi) {
    if (item?.type !== "function" || !item.name) continue;
    if (knownFunctionNames.has(item.name)) continue;

    const name = item.name;
    const isView = item.stateMutability === "view" || item.stateMutability === "pure";
    const isHook = /^(before|after)[A-Z]/.test(name);

    if (isHook && hooks.length < MAX_FUNCTIONS_PER_CATEGORY) {
      hooks.push(name);
    } else if (
      !isView &&
      ADMIN_FUNCTION_PATTERNS.some((p) => p.test(name)) &&
      admin.length < MAX_FUNCTIONS_PER_CATEGORY
    ) {
      admin.push(name);
    } else if (isView && view.length < MAX_FUNCTIONS_PER_CATEGORY) {
      view.push(name);
    } else if (!isView && core.length < MAX_FUNCTIONS_PER_CATEGORY) {
      core.push(name);
    }
  }

  const result: AIContractDataSummary["categorizedFunctions"] = {};
  if (admin.length > 0) result.admin = admin;
  if (hooks.length > 0) result.hooks = hooks;
  if (core.length > 0) result.core = core;
  if (view.length > 0) result.view = view;
  return result;
}

// ---------------------------------------------------------------------------
// Function summary & events
// ---------------------------------------------------------------------------

function buildFunctionSummary(abi: ABI[]): AIContractDataSummary["functionSummary"] {
  let total = 0;
  let viewCount = 0;
  let stateChanging = 0;
  let payable = 0;

  for (const item of abi) {
    if (item?.type !== "function") continue;
    total += 1;
    if (item.stateMutability === "view" || item.stateMutability === "pure") {
      viewCount += 1;
    } else if (item.stateMutability === "payable") {
      payable += 1;
    } else {
      stateChanging += 1;
    }
  }

  return { total, view: viewCount, stateChanging, payable };
}

function extractKeyEvents(abi: ABI[]): string[] | undefined {
  const names: string[] = [];
  for (const item of abi) {
    if (item?.type === "event" && item.name && names.length < MAX_EVENTS) {
      names.push(item.name);
    }
  }
  return names.length > 0 ? names : undefined;
}

// ---------------------------------------------------------------------------
// Source file extraction (unchanged logic)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Language extraction (flattened from metadata)
// ---------------------------------------------------------------------------

function extractLanguage(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const obj = metadata as Record<string, unknown>;
  return asString(obj.language);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function compactContractDataForAI(
  contractData?: unknown,
): AIContractDataSummary | undefined {
  if (!contractData || typeof contractData !== "object") return undefined;
  const data = contractData as Record<string, unknown>;

  const abi = Array.isArray(data.abi) ? (data.abi as ABI[]) : undefined;
  const sourceFiles = extractSourceFileNames(data);

  const { detectedInterfaces, knownFunctionNames } = abi
    ? detectInterfaces(abi)
    : { detectedInterfaces: [], knownFunctionNames: new Set<string>() };

  return {
    name: asString(data.name),
    compilerVersion: asString(data.compilerVersion),
    evmVersion: asString(data.evmVersion),
    language: extractLanguage(data.metadata),
    verifiedAt: asString(data.verifiedAt),
    detectedInterfaces,
    protocolHints: extractProtocolHints(sourceFiles),
    functionSummary: abi
      ? buildFunctionSummary(abi)
      : { total: 0, view: 0, stateChanging: 0, payable: 0 },
    categorizedFunctions: abi ? categorizeFunctions(abi, knownFunctionNames) : {},
    keyEvents: abi ? extractKeyEvents(abi) : undefined,
    sourceFiles,
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
