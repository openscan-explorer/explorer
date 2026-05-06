import { expect, type Page } from "@playwright/test";
import { DEFAULT_TIMEOUT } from "../helpers/wait";

/** Selector for the app footer — presence proves the tree mounted. */
const FOOTER_SELECTOR = "footer, .app-footer, [role='contentinfo']";

/**
 * Assert the React root is still mounted and the footer rendered. Used by
 * smoke specs to catch the "white-screen crash" failure mode without
 * coupling to network-specific UI copy.
 */
export async function expectStillMounted(page: Page): Promise<void> {
  await expect(page.locator("#root")).toBeVisible({ timeout: DEFAULT_TIMEOUT });
  await expect(page.locator(FOOTER_SELECTOR).first()).toBeVisible({
    timeout: DEFAULT_TIMEOUT * 2,
  });
}
