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
    defaultModel: "claude-sonnet-4-5-20250929",
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  togetherai: {
    id: "togetherai",
    name: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    keyUrl: "https://api.together.xyz/settings/api-keys",
  },
};

/**
 * Ordered list of AI provider IDs for priority resolution.
 * When resolving which provider to use, the first provider with a configured key wins.
 */
export const AI_PROVIDER_ORDER: AIProvider[] = ["groq", "openai", "anthropic", "togetherai"];
