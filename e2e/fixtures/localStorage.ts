import type { Page } from "@playwright/test";

/**
 * Helpers for resetting and seeding the app's localStorage between tests.
 *
 * The explorer persists several things to localStorage that can bleed across
 * tests when parallelism is on. The real keys (checked against
 * `src/context/SettingsContext.tsx`, `src/utils/configExportImport.ts`,
 * `src/hooks/useRpcAutoSync.ts`, and `src/utils/artifactsStorage.ts`) are:
 *
 *   - `openScan_user_settings`   — bundled UserSettings JSON (theme,
 *                                   rpcStrategy, apiKeys, …)
 *   - `openScan_language`        — top-level language override
 *   - `OPENSCAN_RPC_URLS_V3`     — custom RPC URL map per networkId
 *   - `OPENSCAN_ARTIFACTS_JSON_V1` — imported Hardhat Ignition artifacts
 *   - `openScan_lastRpcSyncTime` — RPC auto-sync timestamp
 *   - `openscan_cache`           — generic in-app cache
 *
 * Any spec that exercises settings should call `clearAppState` in
 * `beforeEach`.
 */

const APP_STORAGE_KEYS = [
  "openScan_user_settings",
  "openScan_language",
  "OPENSCAN_RPC_URLS_V3",
  "OPENSCAN_ARTIFACTS_JSON_V1",
  "openScan_lastRpcSyncTime",
  "openscan_cache",
];

/** The real settings storage key; fields live bundled inside this JSON blob. */
export const SETTINGS_STORAGE_KEY = "openScan_user_settings";

/**
 * Remove every known OpenScan localStorage entry. Call after the page has
 * loaded at least once (so `localStorage` is accessible) — typically:
 *
 *   test.beforeEach(async ({ page }) => {
 *     await page.goto("/");
 *     await clearAppState(page);
 *     await page.reload();
 *   });
 */
export async function clearAppState(page: Page): Promise<void> {
  await page.evaluate((keys) => {
    for (const key of keys) localStorage.removeItem(key);
  }, APP_STORAGE_KEYS);
}

/** Seed `openScan_language` before the app initializes. */
export async function setLanguage(page: Page, code: string): Promise<void> {
  await page.addInitScript((lang) => {
    localStorage.setItem("openScan_language", lang);
  }, code);
}

/**
 * Seed an override into the bundled `openScan_user_settings` blob before the
 * app initializes. Merges with any existing JSON so seeding `theme` doesn't
 * wipe other fields a prior test set.
 */
export async function setUserSetting(
  page: Page,
  patch: Record<string, unknown>,
): Promise<void> {
  const serialized = JSON.stringify(patch);
  const key = SETTINGS_STORAGE_KEY;
  await page.addInitScript(
    ({ key, serialized }) => {
      const raw = localStorage.getItem(key);
      let existing: Record<string, unknown> = {};
      if (raw) {
        try {
          existing = JSON.parse(raw);
        } catch {
          existing = {};
        }
      }
      const next = { ...existing, ...JSON.parse(serialized) };
      localStorage.setItem(key, JSON.stringify(next));
    },
    { key, serialized },
  );
}

export async function setTheme(page: Page, theme: "light" | "dark" | "auto"): Promise<void> {
  await setUserSetting(page, { theme });
}

export async function setRpcStrategy(
  page: Page,
  strategy: "fallback" | "parallel" | "race",
): Promise<void> {
  await setUserSetting(page, { rpcStrategy: strategy });
}

export async function readLocalStorage(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k) => localStorage.getItem(k), key);
}

/** Read a single field from the bundled `openScan_user_settings` blob. */
export async function readUserSetting<T = unknown>(
  page: Page,
  field: string,
): Promise<T | undefined> {
  const key = SETTINGS_STORAGE_KEY;
  return page.evaluate(
    ({ key, field }) => {
      const raw = localStorage.getItem(key);
      if (!raw) return undefined;
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        return parsed[field] as unknown;
      } catch {
        return undefined;
      }
    },
    { key, field },
  ) as Promise<T | undefined>;
}
