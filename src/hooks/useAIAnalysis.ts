import { useCallback, useState } from "react";
import { AI_PROVIDERS, AI_PROVIDER_ORDER } from "../config/aiProviders";
import { useSettings } from "../context/SettingsContext";
import { AIService, AIServiceError } from "../services/AIService";
import type { AIAnalysisResult, AIAnalysisType, AIProvider } from "../types";
import { getCachedAnalysis, hashContext, setCachedAnalysis } from "../utils/aiCache";
import { logger } from "../utils/logger";

interface UseAIAnalysisReturn {
  result: AIAnalysisResult | null;
  loading: boolean;
  error: string | null;
  errorType: string | null;
  analyze: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for AI-powered blockchain analysis.
 * Resolves the first available AI provider from user settings,
 * manages cache with context-hash invalidation, and handles errors.
 */
export function useAIAnalysis(
  analysisType: AIAnalysisType,
  context: Record<string, unknown>,
  networkName: string,
  networkCurrency: string,
  cacheKey: string,
  language?: string,
): UseAIAnalysisReturn {
  const { settings } = useSettings();
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);

  const resolveProvider = useCallback((): {
    provider: (typeof AI_PROVIDERS)[AIProvider];
    apiKey: string;
  } | null => {
    const apiKeys = settings.apiKeys;
    if (!apiKeys) return null;

    for (const id of AI_PROVIDER_ORDER) {
      const key = apiKeys[id];
      if (key) {
        return { provider: AI_PROVIDERS[id], apiKey: key };
      }
    }
    return null;
  }, [settings.apiKeys]);

  const performAnalysis = useCallback(
    async (bypassCache: boolean) => {
      setLoading(true);
      setError(null);
      setErrorType(null);

      const resolved = resolveProvider();
      if (!resolved) {
        setError("no_api_key");
        setErrorType("no_api_key");
        setLoading(false);
        return;
      }

      const contextHash = hashContext(context);

      if (!bypassCache) {
        const cached = getCachedAnalysis(cacheKey, contextHash);
        if (cached) {
          setResult(cached);
          setLoading(false);
          return;
        }
      }

      try {
        const service = new AIService(resolved.provider, resolved.apiKey);
        const analysisResult = await service.analyze({
          type: analysisType,
          context,
          networkName,
          networkCurrency,
          language,
        });

        setCachedAnalysis(cacheKey, contextHash, analysisResult);
        setResult(analysisResult);
      } catch (err) {
        if (err instanceof AIServiceError) {
          setError(err.type);
          setErrorType(err.type);
        } else {
          setError("generic");
          setErrorType("generic");
        }
        logger.error("AI analysis error:", err);
      } finally {
        setLoading(false);
      }
    },
    [resolveProvider, context, cacheKey, analysisType, networkName, networkCurrency, language],
  );

  const analyze = useCallback(() => performAnalysis(false), [performAnalysis]);
  const refresh = useCallback(() => performAnalysis(true), [performAnalysis]);

  return { result, loading, error, errorType, analyze, refresh };
}
