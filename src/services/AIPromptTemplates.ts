import { SUPPORTED_LANGUAGES } from "../i18n";
import type { AIAnalysisType, PromptVersion } from "../types";

type UserMode = "regular" | "power";

interface PromptContext {
  networkName: string;
  networkCurrency: string;
  language?: string;
  userMode?: UserMode;
  version?: PromptVersion;
}

interface PromptPair {
  system: string;
  user: string;
}

interface PromptConfig {
  role: string;
  conciseness: string;
  focusAreas: string;
  audience: string;
  task: string;
  sections: string[];
  customRules?: string;
}

const DONT_GUESS_RULE =
  "Do not guess or fabricate details that are not present in the provided context. If information is missing, do not speculate; either omit it or note it briefly inline only when it materially affects the analysis. Avoid meta commentary about the prompt/data (e.g., do not end with sentences like '...is not provided in the given context'). Avoid generic boilerplate, 'General context' statements, or any generic statements not grounded in the provided context; stick strictly to what is supported by the provided context. Never convert or restate raw numeric values into a different unit unless the unit is explicitly provided in the context or the value is already formatted with a unit. If the context includes any confidence level or confidence/certainty indicator, you must mention it explicitly with its provided label/value in the most relevant section (typically Notable Aspects).";

function presentationRules(networkCurrency: string): string {
  return `Presentation rules: Express native-currency amounts in ${networkCurrency} (not wei/base units) and avoid printing wei values. Prefer e.g. 0.000467 ${networkCurrency} over 467384405630799 wei. Gas price or base fee per gas should be expressed in Gwei when mentioned. If the context provides pre-formatted values with units, use them directly and do not recalculate or convert. If a value is provided without an explicit unit or token symbol/name, describe it as "raw units" and do not infer a unit. Do not echo full addresses or hashes; refer to roles like 'sender', 'recipient', 'this address/contract', or 'the transaction'.`;
}

export function buildPrompt(
  type: AIAnalysisType,
  context: Record<string, unknown>,
  promptContext: PromptContext,
): PromptPair {
  const userMode = promptContext.userMode ?? "power";
  const version = promptContext.version ?? "stable";
  const config = PROMPT_REGISTRY[version][userMode][type];

  switch (type) {
    case "transaction":
      return buildTransactionPrompt(config, context, promptContext);
    case "account":
      return buildAccountPrompt(config, context, promptContext);
    case "contract":
      return buildContractPrompt(config, context, promptContext);
    case "block":
      return buildBlockPrompt(config, context, promptContext);
    case "bitcoin_transaction":
      return buildBitcoinTransactionPrompt(config, context, promptContext);
    case "bitcoin_block":
      return buildBitcoinBlockPrompt(config, context, promptContext);
    case "bitcoin_address":
      return buildBitcoinAddressPrompt(config, context, promptContext);
  }
}

function languageInstruction(language?: string): string {
  if (!language || language === "en") return "";
  const found = SUPPORTED_LANGUAGES.find((l) => l.code === language);
  const name = found?.name ?? language;
  return ` Respond in ${name}.`;
}

const ROLE_INSTRUCTION = (role: string, networkName: string, networkCurrency: string) =>
  `You are a ${role} for the ${networkName} network (native currency: ${networkCurrency}).`;

const CONCISENESS_INSTRUCTION = (range: string) =>
  `Be concise (${range}). Use markdown formatting. Take your time to analyze the context carefully and provide a thoughtful, thorough response that adheres to the specified conciseness.`;

const FOCUS_INSTRUCTION = (focusAreas: string) => `Focus on: ${focusAreas}.`;

const SHARED_RULES = {
  DONT_GUESS: DONT_GUESS_RULE,
  PRESENTATION: (currency: string) => presentationRules(currency),
  LANGUAGE: (lang?: string) => languageInstruction(lang),
};

// --- Power User Stable Configs (original prompts) ---
const POWER_STABLE_CONFIGS: Record<AIAnalysisType, PromptConfig> = {
  transaction: {
    role: "blockchain analyst",
    conciseness: "8-10 sentences",
    focusAreas:
      "what happened, who was involved, dangerous contracts, notable aspects value/fees, calldata and calldata decoded",
    audience: "senior blockchain developer",
    task: "Explain this transaction in plain English",
    sections: [
      "Transaction Analysis",
      "Participants",
      "User Intent vs Execution",
      "Notable Aspects",
    ],
    customRules:
      "If the transaction failed and no explicit reason is provided, you may mention 1-2 common causes as possibilities, clearly labeled as possibilities (not claims). If ERC-7730 fields include a formatted token amount (value already includes a token symbol/name), use that. If erc7730Fields include formattedValue, prefer it. Otherwise do not assume ETH or any token for raw numeric values. If callTargetToken is provided, use its symbol/name when describing token amounts related to direct token transfers; if no formatted amount is available, describe them as raw units of that token.",
  },
  account: {
    role: "blockchain analyst",
    conciseness: "5-10 sentences",
    focusAreas:
      "activity level, balance significance, suspicious activity, and any patterns visible from recent transactions",
    audience: "senior blockchain developer",
    task: "Provide a brief analysis of this address",
    sections: [
      "Analysis of the Address",
      "Activity",
      "Balance",
      "Transaction Patterns",
      "Known Vulnerabilities",
    ],
    customRules:
      "if the address has transactions with known malicious addresses, mention exact malicious address.",
  },
  contract: {
    role: "smart contract analyst",
    conciseness: "8-10 sentences",
    focusAreas:
      "contract purpose, key functions, security considerations, protocol or token standard identification, and any known vulnerabilities associated with this address if present in the context",
    audience: "senior blockchain developer",
    task: "Analyze this smart contract",
    sections: [
      "Contract Analysis",
      "Contract name and key Functions",
      "Security Considerations",
      "Protocol or Token Standard",
      "Known Vulnerabilities",
    ],
    customRules:
      'Avoid generic boilerplate or a "General context" paragraph; Research if is a known malicious address',
  },
  block: {
    role: "blockchain analyst",
    conciseness: "3-5 sentences",
    focusAreas: "transaction count, gas usage patterns, block utilization, and any notable aspects",
    audience: "senior blockchain developer",
    task: "Analyze this block",
    sections: ["Block Analysis", "Utilization", "Transactions", "Notable Aspects"],
  },
  bitcoin_transaction: {
    role: "Bitcoin blockchain analyst",
    conciseness: "6-8 sentences",
    focusAreas:
      "UTXO flow, inputs and outputs, fee efficiency, coinbase vs regular, SegWit/Taproot adoption, RBF opt-in, and any OP_RETURN data",
    audience: "senior Bitcoin developer",
    task: "Analyze this Bitcoin transaction",
    sections: ["Transaction Analysis", "Inputs and Outputs", "Fee Analysis", "Notable Aspects"],
    customRules:
      "Express all amounts in BTC unless displaying fee rates (use sat/vB). Never use gas, wei, Gwei, or EVM terminology. For coinbase transactions, focus on block reward and coinbase message.",
  },
  bitcoin_block: {
    role: "Bitcoin blockchain analyst",
    conciseness: "3-5 sentences",
    focusAreas:
      "transaction count, total fees, fee rate distribution, block utilization (size vs 4 MWU limit), miner identity, and coinbase message if present",
    audience: "senior Bitcoin developer",
    task: "Analyze this Bitcoin block",
    sections: ["Block Analysis", "Miner and Reward", "Fee Analysis", "Notable Aspects"],
    customRules:
      "Express amounts in BTC. Use sat/vB for fee rates. Never use gas, wei, Gwei, or EVM terminology.",
  },
  bitcoin_address: {
    role: "Bitcoin blockchain analyst",
    conciseness: "4-6 sentences",
    focusAreas:
      "address type (legacy/P2SH/SegWit/Taproot), balance, UTXO count, transaction history, and privacy/fee implications of the address type",
    audience: "senior Bitcoin developer",
    task: "Analyze this Bitcoin address",
    sections: ["Address Analysis", "Balance and UTXOs", "Activity", "Notable Aspects"],
    customRules: "Express amounts in BTC. Never use gas, wei, Gwei, or EVM terminology.",
  },
};

// --- Regular User Stable Configs (simpler prompts for non-super-users) ---
const REGULAR_STABLE_CONFIGS: Record<AIAnalysisType, PromptConfig> = {
  transaction: {
    role: "blockchain educator",
    conciseness: "5-7 sentences",
    focusAreas: "what happened, who was involved, and key details",
    audience: "general user",
    task: "Explain this transaction in simple, easy-to-understand language",
    sections: ["What Happened", "Who Was Involved", "Key Details"],
    customRules:
      "Use simple language. Avoid jargon when possible, or briefly explain technical terms. If ERC-7730 fields include a formatted token amount, use that. If callTargetToken is provided, use its symbol/name.",
  },
  account: {
    role: "blockchain educator",
    conciseness: "3-5 sentences",
    focusAreas: "what this address is and its recent activity",
    audience: "general user",
    task: "Provide a simple overview of this address",
    sections: ["Overview", "Recent Activity", "Balance"],
  },
  contract: {
    role: "blockchain educator",
    conciseness: "5-7 sentences",
    focusAreas: "what this contract does and its main purpose",
    audience: "general user",
    task: "Explain this smart contract in simple terms",
    sections: ["What This Contract Does", "Main Features", "Safety Notes"],
    customRules: "Explain technical concepts in beginner-friendly terms.",
  },
  block: {
    role: "blockchain educator",
    conciseness: "2-3 sentences",
    focusAreas: "what happened in this block and how busy it was",
    audience: "general user",
    task: "Summarize this block in simple terms",
    sections: ["Block Summary", "Activity Level", "Highlights"],
  },
  bitcoin_transaction: {
    role: "Bitcoin educator",
    conciseness: "4-6 sentences",
    focusAreas: "what happened, who sent and received BTC, and the fee paid",
    audience: "general user",
    task: "Explain this Bitcoin transaction in simple, easy-to-understand language",
    sections: ["What Happened", "Sender and Receiver", "Fee Details"],
    customRules:
      "Use simple language. Avoid jargon. Express amounts in BTC. Never use gas, wei, or EVM terminology.",
  },
  bitcoin_block: {
    role: "Bitcoin educator",
    conciseness: "2-3 sentences",
    focusAreas: "what happened in this block, how many transactions it included, and who mined it",
    audience: "general user",
    task: "Summarize this Bitcoin block in simple terms",
    sections: ["Block Summary", "Activity"],
    customRules: "Express amounts in BTC. Use sat/vB for fee rates only if mentioned.",
  },
  bitcoin_address: {
    role: "Bitcoin educator",
    conciseness: "3-4 sentences",
    focusAreas: "what this address is, its current balance, and its type",
    audience: "general user",
    task: "Provide a simple overview of this Bitcoin address",
    sections: ["Overview", "Balance"],
    customRules: "Express amounts in BTC. No EVM terminology.",
  },
};

// --- Latest Configs (initially copies of stable; experiment here) ---
const POWER_LATEST_CONFIGS: Record<AIAnalysisType, PromptConfig> = {
  ...structuredClone(POWER_STABLE_CONFIGS),
};

const REGULAR_LATEST_CONFIGS: Record<AIAnalysisType, PromptConfig> = {
  ...structuredClone(REGULAR_STABLE_CONFIGS),
};

// --- Prompt Registry: O(1) lookup by version → mode → type ---
const PROMPT_REGISTRY: Record<
  PromptVersion,
  Record<UserMode, Record<AIAnalysisType, PromptConfig>>
> = {
  stable: {
    power: POWER_STABLE_CONFIGS,
    regular: REGULAR_STABLE_CONFIGS,
  },
  latest: {
    power: POWER_LATEST_CONFIGS,
    regular: REGULAR_LATEST_CONFIGS,
  },
};

function buildSystemPrompt(
  config: PromptConfig,
  { networkName, networkCurrency, language }: PromptContext,
  customRules?: string,
): string {
  const sections = [
    // Static universal rules (never change)
    SHARED_RULES.DONT_GUESS,
    SHARED_RULES.PRESENTATION(networkCurrency),
    // Config-based instructions (static per analysis type)
    ROLE_INSTRUCTION(config.role, networkName, networkCurrency),
    `${config.task} for a ${config.audience} audience.`,
    CONCISENESS_INSTRUCTION(config.conciseness),
    FOCUS_INSTRUCTION(config.focusAreas),
    `Use the following section headers exactly and in order: ${config.sections
      .map((section) => `"${section}"`)
      .join(", ")}. If a section cannot be supported by the provided context, omit it entirely.`,
    config.customRules ?? "",
    // Dynamic per-request parts
    customRules ?? "",
    SHARED_RULES.LANGUAGE(language),
  ];

  return sections.filter(Boolean).join(" ");
}

function buildTransactionPrompt(
  config: PromptConfig,
  context: Record<string, unknown>,
  promptContext: PromptContext,
): PromptPair {
  const hasPreAnalysis = "erc7730Intent" in context;
  const preAnalysisHint = hasPreAnalysis
    ? "ERC-7730 pre-analysis data is included (erc7730Intent, erc7730Fields, erc7730Warnings, erc7730Protocol). Use it as authoritative context for understanding the transaction purpose and parameters. Highlight any security warnings if present."
    : "";

  return {
    system: buildSystemPrompt(config, promptContext, preAnalysisHint),
    user: formatContext(context),
  };
}

function buildAccountPrompt(
  config: PromptConfig,
  context: Record<string, unknown>,
  promptContext: PromptContext,
): PromptPair {
  return {
    system: buildSystemPrompt(config, promptContext),
    user: formatContext(context),
  };
}

function buildContractPrompt(
  config: PromptConfig,
  context: Record<string, unknown>,
  promptContext: PromptContext,
): PromptPair {
  return {
    system: buildSystemPrompt(config, promptContext),
    user: formatContext(context),
  };
}

function buildBlockPrompt(
  config: PromptConfig,
  context: Record<string, unknown>,
  promptContext: PromptContext,
): PromptPair {
  return {
    system: buildSystemPrompt(config, promptContext),
    user: formatContext(context),
  };
}

function buildBitcoinTransactionPrompt(
  config: PromptConfig,
  context: Record<string, unknown>,
  promptContext: PromptContext,
): PromptPair {
  return {
    system: buildSystemPrompt(config, promptContext),
    user: formatContext(context),
  };
}

function buildBitcoinBlockPrompt(
  config: PromptConfig,
  context: Record<string, unknown>,
  promptContext: PromptContext,
): PromptPair {
  return {
    system: buildSystemPrompt(config, promptContext),
    user: formatContext(context),
  };
}

function buildBitcoinAddressPrompt(
  config: PromptConfig,
  context: Record<string, unknown>,
  promptContext: PromptContext,
): PromptPair {
  return {
    system: buildSystemPrompt(config, promptContext),
    user: formatContext(context),
  };
}

function formatContext(context: Record<string, unknown>): string {
  const sanitized = sanitizeContextForPrompt(context);
  const json = safeJsonStringify(sanitized, 2);
  return ["Context (JSON; some long fields may be truncated):", "```json", json, "```"].join("\n");
}

const DEFAULT_MAX_STRING_LENGTH = 1400;
const DEFAULT_MAX_ARRAY_LENGTH = 20;
const DEFAULT_MAX_OBJECT_KEYS = 80;
const DEFAULT_MAX_DEPTH = 6;

const ARRAY_LIMITS_BY_KEY: Record<string, number> = {
  eventLogs: 10,
  decodedParams: 20,
  erc7730Fields: 20,
  erc7730Warnings: 20,
  recentTransactions: 10,
};

const STRING_LIMITS_BY_KEY: Record<string, number> = {
  inputData: 600,
  data: 600,
  logsBloom: 600,
};

function sanitizeContextForPrompt(context: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const keys = Object.keys(context).sort();
  for (const key of keys) {
    const value = context[key];
    if (value === undefined || value === null || value === "") continue;
    const sanitized = sanitizeValueForPrompt(value, key, 0);
    if (sanitized === undefined) continue;
    out[key] = sanitized;
  }
  return out;
}

function sanitizeValueForPrompt(
  value: unknown,
  keyHint: string | undefined,
  depth: number,
): unknown {
  if (value === undefined || value === null) return undefined;
  if (depth > DEFAULT_MAX_DEPTH) return "[Truncated: max depth reached]";

  if (typeof value === "string") {
    const maxLen = keyHint
      ? (STRING_LIMITS_BY_KEY[keyHint] ?? DEFAULT_MAX_STRING_LENGTH)
      : DEFAULT_MAX_STRING_LENGTH;
    return truncateString(value, maxLen);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    const maxLen = keyHint
      ? (ARRAY_LIMITS_BY_KEY[keyHint] ?? DEFAULT_MAX_ARRAY_LENGTH)
      : DEFAULT_MAX_ARRAY_LENGTH;
    const items = value
      .slice(0, maxLen)
      .map((v) => sanitizeValueForPrompt(v, undefined, depth + 1))
      .filter((v) => v !== undefined);
    if (value.length > maxLen) {
      items.push({ __truncated__: true, total: value.length, shown: maxLen });
    }
    return items;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const keys = Object.keys(obj).sort().slice(0, DEFAULT_MAX_OBJECT_KEYS);
    for (const key of keys) {
      const v = obj[key];
      if (v === undefined || v === null || v === "") continue;
      const sanitized = sanitizeValueForPrompt(v, key, depth + 1);
      if (sanitized === undefined) continue;
      out[key] = sanitized;
    }
    const totalKeys = Object.keys(obj).length;
    if (totalKeys > DEFAULT_MAX_OBJECT_KEYS) {
      out.__truncatedKeys__ = { total: totalKeys, shown: DEFAULT_MAX_OBJECT_KEYS };
    }
    return out;
  }

  return String(value);
}

function truncateString(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  const head = value.slice(0, Math.max(0, Math.floor(maxLength * 0.6)));
  const tail = value.slice(-Math.max(0, Math.floor(maxLength * 0.2)));
  return `${head}…${tail}`;
}

function safeJsonStringify(value: unknown, space: number): string {
  return JSON.stringify(value, (_key, v) => (typeof v === "bigint" ? v.toString() : v), space);
}
