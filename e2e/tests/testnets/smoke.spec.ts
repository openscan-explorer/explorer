import { test, expect } from "../../fixtures/test";
import { EVM_TESTNETS } from "../../fixtures/networks";
import { DEFAULT_TIMEOUT } from "../../helpers/wait";
import type { Page } from "@playwright/test";

/**
 * Smoke coverage for the EVM testnets registered in
 * `src/config/networks.json`: Sepolia (11155111), Arbitrum Sepolia (421614),
 * Optimism Sepolia (11155420), Base Sepolia (84532), Polygon Amoy (80002),
 * Avalanche Fuji (43113).
 *
 * The five Sepolia-class testnets were added in metadata v1.2.1-alpha.0
 * (commit 22f5845) with adapter registrations but no e2e. Developers rely on
 * these testnets for staging-level validation — an adapter regression on
 * any one of them should not slip through to a mainnet release.
 *
 * Each testnet gets a block-page and an address-page smoke. Tx pages use
 * placeholder hashes (canonicalTxHash defaults to `0x…0001`) — the goal is
 * to verify the page renders, not that a specific tx payload displays.
 */

const FOOTER_SELECTOR = "footer, .app-footer, [role='contentinfo']";

async function expectStillMounted(page: Page): Promise<void> {
  await expect(page.locator("#root")).toBeVisible({ timeout: DEFAULT_TIMEOUT });
  await expect(page.locator(FOOTER_SELECTOR).first()).toBeVisible({
    timeout: DEFAULT_TIMEOUT * 2,
  });
}

for (const net of EVM_TESTNETS) {
  test.describe(`${net.name} (${net.chainId}) smoke`, () => {
    test("block page renders", async ({ page }) => {
      await page.goto(`/#/${net.urlPath}/block/${net.canonicalBlock}`);
      await expectStillMounted(page);
    });

    test("address page renders for canonical contract", async ({ page }) => {
      await page.goto(`/#/${net.urlPath}/address/${net.canonicalAddress}`);
      await expectStillMounted(page);
    });

    test("tx page renders without crashing", async ({ page }) => {
      await page.goto(`/#/${net.urlPath}/tx/${net.canonicalTxHash}`);
      await expectStillMounted(page);
    });
  });
}
