import type { AIAnalysisType } from "../types";

interface PromptContext {
  networkName: string;
  networkCurrency: string;
  language?: string;
}

interface PromptPair {
  system: string;
  user: string;
}

export function buildPrompt(
  type: AIAnalysisType,
  context: Record<string, unknown>,
  promptContext: PromptContext,
): PromptPair {
  switch (type) {
    case "transaction":
      return buildTransactionPrompt(context, promptContext);
    case "account":
      return buildAccountPrompt(context, promptContext);
    case "contract":
      return buildContractPrompt(context, promptContext);
    case "block":
      return buildBlockPrompt(context, promptContext);
  }
}

function languageInstruction(language?: string): string {
  if (!language || language === "en") return "";
  const LANGUAGE_NAMES: Record<string, string> = { es: "Spanish" };
  const name = LANGUAGE_NAMES[language] ?? language;
  return ` Respond in ${name}.`;
}

function buildTransactionPrompt(
  context: Record<string, unknown>,
  { networkName, networkCurrency, language }: PromptContext,
): PromptPair {
  const hasPreAnalysis = "erc7730Intent" in context;
  const preAnalysisHint = hasPreAnalysis
    ? " ERC-7730 pre-analysis data is included (erc7730Intent, erc7730Fields, erc7730Warnings, erc7730Protocol). Use it as authoritative context for understanding the transaction purpose and parameters. Highlight any security warnings if present."
    : "";

  return {
    system: `You are a blockchain analyst for the ${networkName} network (native currency: ${networkCurrency}). Explain this transaction in plain English. Be concise (3-5 sentences). Use markdown formatting. Focus on: what happened, who was involved, how much was transferred, and any notable aspects. If the transaction failed, explain why it might have failed.${preAnalysisHint}${languageInstruction(language)}`,
    user: formatContext(context),
  };
}

function buildAccountPrompt(
  context: Record<string, unknown>,
  { networkName, networkCurrency, language }: PromptContext,
): PromptPair {
  return {
    system: `You are a blockchain analyst for the ${networkName} network (native currency: ${networkCurrency}). Provide a brief analysis of this address. Be concise (3-5 sentences). Use markdown formatting. Focus on: account type (EOA vs contract), activity level, balance significance, and any patterns visible from recent transactions.${languageInstruction(language)}`,
    user: formatContext(context),
  };
}

function buildContractPrompt(
  context: Record<string, unknown>,
  { networkName, networkCurrency, language }: PromptContext,
): PromptPair {
  return {
    system: `You are a smart contract analyst for the ${networkName} network (native currency: ${networkCurrency}). Analyze this smart contract. Be concise but thorough (5-8 sentences). Use markdown formatting. Focus on: contract purpose, key functions, security considerations, and protocol or token standard identification.${languageInstruction(language)}`,
    user: formatContext(context),
  };
}

function buildBlockPrompt(
  context: Record<string, unknown>,
  { networkName, networkCurrency, language }: PromptContext,
): PromptPair {
  return {
    system: `You are a blockchain analyst for the ${networkName} network (native currency: ${networkCurrency}). Analyze this block. Be concise (3-5 sentences). Use markdown formatting. Focus on: transaction count, gas usage patterns, block utilization, and any notable aspects (e.g., high gas usage, unusual activity).${languageInstruction(language)}`,
    user: formatContext(context),
  };
}

function formatContext(context: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(context)) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "object") {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    } else {
      lines.push(`${key}: ${String(value)}`);
    }
  }
  return lines.join("\n");
}
