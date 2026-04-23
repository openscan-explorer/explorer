import { test, expect } from "../../fixtures/test";
import { SOLANA } from "../../fixtures/networks";
import { DEFAULT_TIMEOUT } from "../../helpers/wait";
import type { Page } from "@playwright/test";

/**
 * Solana mainnet smoke. Solana has a full adapter
 * (`src/services/adapters/SolanaAdapter/SolanaAdapter.ts`), a dashboard, a
 * slot/tx/account/validators page set, and is routed under the `/sol`
 * slug — yet the existing e2e suite has no Solana coverage.
 *
 * These smokes only assert the page mounts and the footer renders. Deep
 * field assertions are out of scope until the Solana-specific data
 * contract is exercised enough to have a stable curated fixture (phase 4
 * will add a `solana.ts` fixture akin to `mainnet.ts`).
 */

const FOOTER_SELECTOR = "footer, .app-footer, [role='contentinfo']";

async function expectStillMounted(page: Page): Promise<void> {
  await expect(page.locator("#root")).toBeVisible({ timeout: DEFAULT_TIMEOUT });
  await expect(page.locator(FOOTER_SELECTOR).first()).toBeVisible({
    timeout: DEFAULT_TIMEOUT * 2,
  });
}

test.describe("Solana smoke", () => {
  test("network landing page renders", async ({ page }) => {
    await page.goto(`/#/${SOLANA.urlPath}`);
    await expectStillMounted(page);
  });

  test("slots list renders", async ({ page }) => {
    await page.goto(`/#/${SOLANA.urlPath}/slots`);
    await expectStillMounted(page);
  });

  test("slot detail page for a pinned slot renders", async ({ page }) => {
    await page.goto(`/#/${SOLANA.urlPath}/slot/${SOLANA.canonicalBlock}`);
    await expectStillMounted(page);
  });

  test("system program account page renders", async ({ page }) => {
    // The system program (11111…) is guaranteed to exist on any Solana
    // cluster — safest possible fixture.
    await page.goto(`/#/${SOLANA.urlPath}/account/${SOLANA.canonicalAddress}`);
    await expectStillMounted(page);
  });

  test("validators page renders", async ({ page }) => {
    await page.goto(`/#/${SOLANA.urlPath}/validators`);
    await expectStillMounted(page);
  });
});
