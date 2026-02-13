import type React from "react";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import Markdown from "react-markdown";
import { Link } from "react-router-dom";
import { useAIAnalysis } from "../../../hooks/useAIAnalysis";
import type { AIAnalysisType } from "../../../types";

interface AIAnalysisProps {
  analysisType: AIAnalysisType;
  context: Record<string, unknown>;
  networkName: string;
  networkCurrency: string;
  cacheKey: string;
}

const AIAnalysisPanel: React.FC<AIAnalysisProps> = ({
  analysisType,
  context,
  networkName,
  networkCurrency,
  cacheKey,
}) => {
  const { t, i18n } = useTranslation("common");
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const { result, loading, error, errorType, analyze, refresh } = useAIAnalysis(
    analysisType,
    context,
    networkName,
    networkCurrency,
    cacheKey,
    i18n.language,
  );

  useEffect(() => {
    if (result || error) {
      setIsOpen(true);
    }
  }, [result, error]);

  const handleAnalyze = () => {
    setIsOpen(true);
    void analyze();
  };

  return (
    <section className="block-display-card ai-analysis-panel" aria-label={t("aiAnalysis.title")}>
      <div className="ai-analysis-header">
        <div className="ai-analysis-actions">
          <button
            type="button"
            className="more-details-toggle ai-analysis-button"
            onClick={handleAnalyze}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="ai-analysis-spinner" />
                {t("aiAnalysis.analyzing")}
              </>
            ) : (
              t("aiAnalysis.analyzeButton")
            )}
          </button>
          {result && (
            <button
              type="button"
              className="more-details-toggle ai-analysis-toggle"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setIsOpen((open) => !open)}
            >
              {isOpen ? t("aiAnalysis.collapse") : t("aiAnalysis.expand")}
            </button>
          )}
        </div>
      </div>

      {result && !isOpen && (
        <div className="ai-analysis-preview" aria-hidden="true">
          <p className="ai-analysis-preview-text">{result.summary}</p>
        </div>
      )}

      <section
        id={panelId}
        className="ai-analysis-content"
        aria-live="polite"
        aria-hidden={!isOpen}
        style={{ display: isOpen ? "flex" : "none" }}
      >
        {error && <AIAnalysisError errorType={errorType} onRetry={analyze} />}

        {result && (
          <>
            <div className="ai-analysis-result">
              <Markdown>{result.summary}</Markdown>
            </div>
            <div className="ai-analysis-footer">
              <div className="ai-analysis-meta">
                <span>
                  {t("aiAnalysis.generatedBy", { model: result.model })}
                  {result.cached && (
                    <span className="ai-analysis-cached">{t("aiAnalysis.cachedResult")}</span>
                  )}
                </span>
                <button type="button" className="ai-analysis-refresh" onClick={refresh}>
                  {t("aiAnalysis.refreshButton")}
                </button>
              </div>
              <div className="ai-analysis-disclaimer">{t("aiAnalysis.disclaimer")}</div>
            </div>
          </>
        )}
      </section>
    </section>
  );
};

const ERROR_MESSAGE_KEYS = {
  rate_limited: "aiAnalysis.errors.rateLimited",
  invalid_key: "aiAnalysis.errors.invalidKey",
  no_api_key: "aiAnalysis.errors.no_api_key",
  network_error: "aiAnalysis.errors.networkError",
  service_unavailable: "aiAnalysis.errors.serviceUnavailable",
  parse_error: "aiAnalysis.errors.parseError",
  generic: "aiAnalysis.errors.generic",
} as const;

interface AIAnalysisErrorProps {
  errorType: string | null;
  onRetry: () => void;
}

const AIAnalysisError: React.FC<AIAnalysisErrorProps> = ({ errorType, onRetry }) => {
  const { t } = useTranslation("common");

  const messageKey =
    errorType && errorType in ERROR_MESSAGE_KEYS
      ? ERROR_MESSAGE_KEYS[errorType as keyof typeof ERROR_MESSAGE_KEYS]
      : ERROR_MESSAGE_KEYS.generic;
  const showSettingsLink = errorType === "no_api_key" || errorType === "invalid_key";

  return (
    <div className="ai-analysis-error">
      <div className="ai-analysis-error-message">{t(messageKey)}</div>
      <div className="ai-analysis-error-action">
        <button type="button" className="ai-analysis-retry" onClick={onRetry}>
          {t("aiAnalysis.errors.tryAgain")}
        </button>
        {showSettingsLink && (
          <Link to="/settings" className="ai-analysis-settings-link">
            {t("aiAnalysis.errors.goToSettings")}
          </Link>
        )}
      </div>
    </div>
  );
};

export default AIAnalysisPanel;
