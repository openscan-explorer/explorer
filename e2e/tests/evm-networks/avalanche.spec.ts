import { test, expect } from "../../fixtures/test";
import { AVALANCHE } from "../../fixtures/networks";
import { DEFAULT_TIMEOUT } from "../../helpers/wait";
import type { Page } from "@playwright/test";

/**
 * Avalanche C-Chain (43114) smoke. Avalanche is registered as a production
 * network in `src/config/networks.json` and routed to the vanilla
 * `EVMAdapter` in `adaptersFactory.ts`, but had zero e2e coverage — a silent
 * regression here would only surface in bug reports.
 *
 * This smoke only asserts the page mounts. Network-specific field
 * assertions (if any L2-like specialization is added later) belong in their
 * own spec.
 */

const FOOTER_SELECTOR = "footer, .app-footer, [role='contentinfo']";

async function expectStillMounted(page: Page): Promise<void> {
  await expect(page.locator("#root")).toBeVisible({ timeout: DEFAULT_TIMEOUT });
  await expect(page.locator(FOOTER_SELECTOR).first()).toBeVisible({
    timeout: DEFAULT_TIMEOUT * 2,
  });
}

test.describe("Avalanche C-Chain smoke", () => {
  test("block page renders", async ({ page }) => {
    await page.goto(`/#/${AVALANCHE.urlPath}/block/${AVALANCHE.canonicalBlock}`);
    await expectStillMounted(page);
  });

  test("address page renders for canonical WAVAX contract", async ({ page }) => {
    await page.goto(`/#/${AVALANCHE.urlPath}/address/${AVALANCHE.canonicalAddress}`);
    await expectStillMounted(page);
  });

  test("zero address page renders", async ({ page }) => {
    await page.goto(
      `/#/${AVALANCHE.urlPath}/address/0x0000000000000000000000000000000000000000`,
    );
    await expectStillMounted(page);
  });

  test("placeholder tx hash renders without crashing", async ({ page }) => {
    // Until a canonical Avalanche tx is pinned in a fixture, assert only
    // the not-found path handles cleanly.
    await page.goto(`/#/${AVALANCHE.urlPath}/tx/${AVALANCHE.canonicalTxHash}`);
    await expectStillMounted(page);
  });
});
