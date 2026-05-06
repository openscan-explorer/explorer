import { ENVIRONMENT } from "./constants";
import { redactSensitiveUrlsInText } from "./urlUtils";

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

// Mask API keys embedded in URLs (e.g. Alchemy `/v2/<KEY>`, Infura `/v3/<KEY>`,
// `?apiKey=…`) before any log arg reaches the console. Users paste RPC URLs
// with embedded credentials; without this, any fetch error that logs the URL
// or response body leaks the key into console screenshots / bug reports.
function sanitizeArg(arg: unknown): unknown {
  if (typeof arg === "string") return redactSensitiveUrlsInText(arg);
  if (arg instanceof Error) {
    const sanitized = new Error(redactSensitiveUrlsInText(arg.message));
    sanitized.name = arg.name;
    if (arg.stack) sanitized.stack = redactSensitiveUrlsInText(arg.stack);
    return sanitized;
  }
  return arg;
}

function sanitizeArgs(args: unknown[]): unknown[] {
  return args.map(sanitizeArg);
}

export const logger = {
  debug: (...args: unknown[]): void => {
    if (LOG_LEVELS.debug >= minLevel) console.log("[DEBUG]", ...sanitizeArgs(args));
  },
  info: (...args: unknown[]): void => {
    if (LOG_LEVELS.info >= minLevel) console.log("[INFO]", ...sanitizeArgs(args));
  },
  warn: (...args: unknown[]): void => {
    if (LOG_LEVELS.warn >= minLevel) console.warn("[WARN]", ...sanitizeArgs(args));
  },
  error: (...args: unknown[]): void => {
    if (LOG_LEVELS.error >= minLevel) console.error("[ERROR]", ...sanitizeArgs(args));
  },
};
