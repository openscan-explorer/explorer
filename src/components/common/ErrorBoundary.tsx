import i18next from "i18next";
import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { logger } from "../../utils/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    logger.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // You can also log the error to an error reporting service here
    // Example: errorReportingService.captureException(error, { extra: errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    const isGhPages =
      typeof window !== "undefined" && window.location.hostname.includes("github.io");
    window.location.href = isGhPages ? "/explorer/" : "/";
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-container">
            <div className="error-boundary-content">
              <h2>{`⚠️ ${i18next.t("errors.somethingWentWrong")}`}</h2>
              <p>{i18next.t("errors.errorMessage")}</p>

              <div className="error-boundary-actions">
                {/** biome-ignore lint/a11y/useButtonType: <TODO> */}
                <button className="btn-md primary" onClick={this.handleReload}>
                  {i18next.t("errors.reloadPage")}
                </button>
                {/** biome-ignore lint/a11y/useButtonType: <TODO> */}
                <button className="btn-md outline" onClick={this.handleGoHome}>
                  {i18next.t("errors.goHome")}
                </button>
              </div>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="error-boundary-details">
                  <summary>{i18next.t("errors.errorDetailsSummary")}</summary>
                  <div className="error-boundary-debug">
                    <h4>{i18next.t("errors.errorLabel")}</h4>
                    <pre>{this.state.error.toString()}</pre>

                    {this.state.errorInfo && (
                      <>
                        <h4>{i18next.t("errors.componentStackLabel")}</h4>
                        <pre>{this.state.errorInfo.componentStack}</pre>
                      </>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components that need error boundary functionality
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    logger.error("Error captured:", error);
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return {
    captureError,
    resetError,
    hasError: !!error,
  };
};

export default ErrorBoundary;
