import { ENVIRONMENT } from "./constants";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LOG_LEVEL: Record<string, LogLevel> = {
  development: "debug",
  staging: "info",
  production: "warn",
};

const minLevel = LOG_LEVELS[MIN_LOG_LEVEL[ENVIRONMENT] || "debug"];

export const logger = {
  debug: (...args: unknown[]): void => {
    if (LOG_LEVELS.debug >= minLevel) console.log("[DEBUG]", ...args);
  },
  info: (...args: unknown[]): void => {
    if (LOG_LEVELS.info >= minLevel) console.log("[INFO]", ...args);
  },
  warn: (...args: unknown[]): void => {
    if (LOG_LEVELS.warn >= minLevel) console.warn("[WARN]", ...args);
  },
  error: (...args: unknown[]): void => {
    if (LOG_LEVELS.error >= minLevel) console.error("[ERROR]", ...args);
  },
};
