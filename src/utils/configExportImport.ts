import { saveJsonFilesToStorage } from "./artifactsStorage";
import { saveRpcUrlsToStorage } from "./rpcStorage";

const CONFIG_VERSION = 1;

const EXPORTED_KEYS = {
  settings: "openScan_user_settings",
  rpcUrls: "OPENSCAN_RPC_URLS_V3",
  artifacts: "OPENSCAN_ARTIFACTS_JSON_V1",
  language: "openScan_language",
} as const;

interface OpenScanConfig {
  version: number;
  settings?: Record<string, unknown>;
  rpcUrls?: Record<string, string[]>;
  // biome-ignore lint/suspicious/noExplicitAny: artifacts have dynamic shape
  artifacts?: Record<string, any>;
  language?: string;
}

function parseStorageItem(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return undefined;
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * Reads user configuration from localStorage and returns a serializable object.
 */
export function exportConfig(): OpenScanConfig {
  const config: OpenScanConfig = { version: CONFIG_VERSION };

  const settings = parseStorageItem(EXPORTED_KEYS.settings);
  if (settings && typeof settings === "object") {
    config.settings = settings as Record<string, unknown>;
  }

  const rpcUrls = parseStorageItem(EXPORTED_KEYS.rpcUrls);
  if (rpcUrls && typeof rpcUrls === "object") {
    config.rpcUrls = rpcUrls as Record<string, string[]>;
  }

  const artifacts = parseStorageItem(EXPORTED_KEYS.artifacts);
  if (artifacts && typeof artifacts === "object") {
    config.artifacts = artifacts as Record<string, unknown>;
  }

  const language = localStorage.getItem(EXPORTED_KEYS.language);
  if (language) {
    config.language = language;
  }

  return config;
}

/**
 * Validates and writes an imported configuration to localStorage.
 */
export function importConfig(data: unknown): { success: boolean; error?: string } {
  if (!data || typeof data !== "object") {
    return { success: false, error: "Invalid configuration file." };
  }

  const config = data as Record<string, unknown>;

  if (config.version !== CONFIG_VERSION) {
    return { success: false, error: `Unsupported config version: ${String(config.version)}` };
  }

  if (config.settings !== undefined && typeof config.settings !== "object") {
    return { success: false, error: "Invalid settings format." };
  }

  // Apply settings
  if (config.settings && typeof config.settings === "object") {
    localStorage.setItem(EXPORTED_KEYS.settings, JSON.stringify(config.settings));
  }

  // Apply RPC URLs
  if (config.rpcUrls && typeof config.rpcUrls === "object") {
    saveRpcUrlsToStorage(config.rpcUrls as Record<string, string[]>);
  }

  // Apply artifacts
  if (config.artifacts && typeof config.artifacts === "object") {
    saveJsonFilesToStorage(config.artifacts as Record<string, unknown>);
  }

  // Apply language
  if (typeof config.language === "string") {
    localStorage.setItem(EXPORTED_KEYS.language, config.language);
  }

  return { success: true };
}

/**
 * Triggers a browser download of the config as a JSON file.
 */
export function downloadConfigFile(config: OpenScanConfig): void {
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `openscan-config-${dateStr}.json`;
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}
