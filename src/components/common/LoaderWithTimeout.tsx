import type React from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import OpenScanCubeLoader from "../LoadingLogo";

interface LoaderWithTimeoutProps {
  text?: string;
  size?: number;
  timeoutMs?: number;
  onRetry?: () => void;
  timeoutText?: string;
}

const LoaderWithTimeout: React.FC<LoaderWithTimeoutProps> = ({
  text,
  size = 60,
  timeoutMs = 15000,
  onRetry,
  timeoutText = "Data is taking longer than expected.",
}) => {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [timeoutMs]);

  if (timedOut) {
    return (
      <div className="loader-timeout-container" role="alert">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ opacity: 0.5, marginBottom: 12 }}
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p className="loader-timeout-text">{timeoutText}</p>
        <div className="loader-timeout-actions">
          {onRetry && (
            <button type="button" onClick={onRetry} className="button-primary-inline">
              Retry
            </button>
          )}
          <Link to="/" className="button-secondary-inline">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="loader-container" aria-live="polite" aria-busy="true">
      <OpenScanCubeLoader size={size} />
      {text && <p className="loader-text">{text}</p>}
    </div>
  );
};

export default LoaderWithTimeout;
