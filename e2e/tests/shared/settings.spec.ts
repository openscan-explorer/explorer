import { test, expect } from "../../fixtures/test";
import {
  clearAppState,
  readUserSetting,
  setLanguage,
  setRpcStrategy,
  setTheme,
  setUserSetting,
  SETTINGS_STORAGE_KEY,
} from "../../fixtures/localStorage";

/**
 * Settings persistence & hydration. These tests do not require any RPC
 * traffic — they seed localStorage before navigation and assert the app
 * reflects the seeded values (theme class on <body>, settings JSON intact
 * after reload, etc.).
 */

test.describe("Settings persistence", () => {
  test("theme=light seeded via localStorage applies `light-theme` body class", async ({
    page,
  }) => {
    await setTheme(page, "light");
    await page.goto("/");
    await expect(page.locator("body")).toHaveClass(/(^|\s)light-theme(\s|$)/);
  });

  test("theme=dark seeded via localStorage does not apply `light-theme` body class", async ({
    page,
  }) => {
    await setTheme(page, "dark");
    await page.goto("/");
    await expect(page.locator("body")).not.toHaveClass(/(^|\s)light-theme(\s|$)/);
  });

  test("rpcStrategy seeded before load is preserved by SettingsContext write-back", async ({
    page,
  }) => {
    // Seed once, navigate once. On mount SettingsContext reads the bundle,
    // merges with DEFAULT_SETTINGS, and writes it back under the same key.
    // The write-back must not drop the seeded `rpcStrategy`.
    await setRpcStrategy(page, "parallel");
    await page.goto("/");
    // Wait a beat for the mount effect to fire and persist.
    await page.waitForFunction(
      () => {
        const raw = localStorage.getItem("openScan_user_settings");
        if (!raw) return false;
        try {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          // DEFAULT_SETTINGS fields merged in → blob contains more than just
          // the seed. That's the signal the app wrote back.
          return "theme" in parsed && "rpcStrategy" in parsed;
        } catch {
          return false;
        }
      },
      { timeout: 5000 },
    );
    expect(await readUserSetting<string>(page, "rpcStrategy")).toBe("parallel");
  });

  test("language override is readable after load", async ({ page }) => {
    await setLanguage(page, "es");
    await page.goto("/");
    const lang = await page.evaluate(() => localStorage.getItem("openScan_language"));
    expect(lang).toBe("es");
  });

  test("setUserSetting merges without clobbering sibling fields", async ({ page }) => {
    // Seed two patches; the second must not drop `theme` from the first.
    await setUserSetting(page, { theme: "light" });
    await setUserSetting(page, { rpcStrategy: "race" });
    await page.goto("/");
    expect(await readUserSetting<string>(page, "theme")).toBe("light");
    expect(await readUserSetting<string>(page, "rpcStrategy")).toBe("race");
  });

  test("clearAppState removes the bundled settings blob", async ({ page }) => {
    await setUserSetting(page, { theme: "light" });
    await page.goto("/");
    const beforeRaw = await page.evaluate(
      (k) => localStorage.getItem(k),
      SETTINGS_STORAGE_KEY,
    );
    expect(beforeRaw).not.toBeNull();
    await clearAppState(page);
    const afterRaw = await page.evaluate(
      (k) => localStorage.getItem(k),
      SETTINGS_STORAGE_KEY,
    );
    expect(afterRaw).toBeNull();
  });
});
