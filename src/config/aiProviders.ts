import type { AIProvider, AIProviderConfig } from "../types";

/**
 * Static configuration for supported AI providers.
 * No API keys stored here - users provide their own keys via Settings.
 */
export const AI_PROVIDERS: Record<AIProvider, AIProviderConfig> = {
  groq: {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    keyUrl: "https://console.groq.com/keys",
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-4-6",
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  perplexity: {
    id: "perplexity",
    name: "Perplexity",
    baseUrl: "https://api.perplexity.ai",
    defaultModel: "llama-3.1-sonar-small-128k-online",
    keyUrl: "https://www.perplexity.ai/settings/api",
  },
  gemini: {
    id: "gemini",
    name: "Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-2.0-flash",
    keyUrl: "https://aistudio.google.com/apikey",
  },
};

/**
 * Ordered list of AI provider IDs for priority resolution.
 * Free providers first, then paid providers.
 * When resolving which provider to use, the first provider with a configured key wins.
 */
export const AI_PROVIDER_ORDER: AIProvider[] = [
  "groq",
  "gemini",
  "perplexity",
  "openai",
  "anthropic",
];
