import type { AIAnalysisResult, AIAnalysisType, AIProviderConfig } from "../types";
import { logger } from "../utils/logger";
import { buildPrompt } from "./AIPromptTemplates";

const MAX_TOKENS = 1024;
const RETRY_DELAY_MS = 5000;

export type AIErrorType =
  | "rate_limited"
  | "invalid_key"
  | "service_unavailable"
  | "network_error"
  | "parse_error"
  | "no_api_key"
  | "generic";

export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly type: AIErrorType,
  ) {
    super(message);
    this.name = "AIServiceError";
  }
}

export interface AIAnalysisRequest {
  type: AIAnalysisType;
  context: Record<string, unknown>;
  networkName: string;
  networkCurrency: string;
  language?: string;
}

/**
 * Provider-agnostic AI analysis service.
 * Supports OpenAI-compatible APIs (Groq, OpenAI, Together AI) and Anthropic.
 */
export class AIService {
  private readonly provider: AIProviderConfig;
  private readonly apiKey: string;

  constructor(provider: AIProviderConfig, apiKey: string) {
    this.provider = provider;
    this.apiKey = apiKey;
  }

  async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResult> {
    const { system, user } = buildPrompt(request.type, request.context, {
      networkName: request.networkName,
      networkCurrency: request.networkCurrency,
      language: request.language,
    });

    try {
      const content = await this.callAPI(system, user);
      return {
        summary: content,
        timestamp: Date.now(),
        model: this.provider.defaultModel,
        provider: this.provider.id,
        cached: false,
      };
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      logger.error("AI analysis failed:", error);
      throw new AIServiceError("Analysis failed unexpectedly", "generic");
    }
  }

  private async callAPI(system: string, user: string): Promise<string> {
    if (this.provider.id === "anthropic") {
      return this.callAnthropic(system, user);
    }
    return this.callOpenAICompatible(system, user);
  }

  private async callOpenAICompatible(system: string, user: string): Promise<string> {
    const url = `${this.provider.baseUrl}/chat/completions`;
    const body = {
      model: this.provider.defaultModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: MAX_TOKENS,
      temperature: 0.3,
    };

    const response = await this.fetchWithRetry(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      logger.error("Unexpected OpenAI-compatible response format:", data);
      throw new AIServiceError("Failed to parse AI response", "parse_error");
    }
    return content;
  }

  private async callAnthropic(system: string, user: string): Promise<string> {
    const url = `${this.provider.baseUrl}/messages`;
    const body = {
      model: this.provider.defaultModel,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content: user }],
      temperature: 0.3,
    };

    const response = await this.fetchWithRetry(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    const content = data?.content?.[0]?.text;
    if (typeof content !== "string") {
      logger.error("Unexpected Anthropic response format:", data);
      throw new AIServiceError("Failed to parse AI response", "parse_error");
    }
    return content;
  }

  private async fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
    const response = await this.doFetch(url, init);

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const delayMs = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : RETRY_DELAY_MS;
      logger.warn(`AI API rate limited, retrying in ${delayMs}ms`);
      await this.delay(Math.min(delayMs, 10000));

      const retryResponse = await this.doFetch(url, init);
      if (!retryResponse.ok) {
        this.handleErrorResponse(retryResponse.status);
      }
      return retryResponse;
    }

    if (!response.ok) {
      this.handleErrorResponse(response.status);
    }

    return response;
  }

  private async doFetch(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, init);
    } catch {
      throw new AIServiceError("Network error connecting to AI service", "network_error");
    }
  }

  private handleErrorResponse(status: number): never {
    switch (status) {
      case 401:
        throw new AIServiceError("Invalid API key", "invalid_key");
      case 429:
        throw new AIServiceError("Rate limited by AI provider", "rate_limited");
      case 503:
        throw new AIServiceError("AI service temporarily unavailable", "service_unavailable");
      default:
        throw new AIServiceError(`AI service error (HTTP ${status})`, "generic");
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
