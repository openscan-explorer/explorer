import type { Page } from "@playwright/test";

/**
 * Helpers for resetting and seeding the app's localStorage between tests.
 *
 * The explorer persists several things to localStorage that can bleed across
 * tests when parallelism is on: language, theme, RPC URLs, RPC strategy,
 * custom worker URL, metadata cache, and custom networks. Any spec that
 * exercises the settings UI should call `clearAppState()` in `beforeEach`.
 */

const APP_STORAGE_KEYS = [
  "openScan_language",
  "openScan_theme",
  "OPENSCAN_RPC_URLS_V3",
  "openScan_rpcStrategy",
  "openScan_workerUrl",
  "OPENSCAN_METADATA_RPCS",
  "openScan_customNetworks",
];

/**
 * Clear all known OpenScan localStorage keys. Run before the page navigates.
 *
 * Use via:
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

export async function setLanguage(page: Page, code: string): Promise<void> {
  await page.addInitScript((lang) => {
    localStorage.setItem("openScan_language", lang);
  }, code);
}

export async function setTheme(page: Page, theme: "light" | "dark"): Promise<void> {
  await page.addInitScript((t) => {
    localStorage.setItem("openScan_theme", t);
  }, theme);
}

export async function setRpcStrategy(
  page: Page,
  strategy: "fallback" | "parallel" | "race",
): Promise<void> {
  await page.addInitScript((s) => {
    localStorage.setItem("openScan_rpcStrategy", s);
  }, strategy);
}

export async function readLocalStorage(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k) => localStorage.getItem(k), key);
}
