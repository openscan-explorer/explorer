import { test, expect } from "../../fixtures/test";
import { ETH_MAINNET } from "../../fixtures/networks";
import { DEFAULT_TIMEOUT } from "../../helpers/wait";

/**
 * AI Analysis panel + worker proxy reachability.
 *
 * Shallow coverage for now:
 *   - the panel DOM hooks exist on tx pages,
 *   - the "Analyze" button is wired (we don't actually invoke it to avoid
 *     burning Groq budget or coupling to live availability).
 *
 * The full worker-failover matrix (Cloudflare 5xx / 429 → Vercel) is
 * deferred to the `mocked/rpc-strategy.spec.ts` placeholder which needs a
 * full `OPENSCAN_RPC_URLS_V3` + `page.route` harness.
 */

test.describe("AI Analysis panel", () => {
  test("panel section renders on a tx page", async ({ page }) => {
    const txHash = ETH_MAINNET.canonicalTxHash;
    await page.goto(`/#/1/tx/${txHash}`);
    // The AI panel is rendered unconditionally (gated only by super-user /
    // feature flags inside the component). The `.ai-analysis-panel` class
    // on a <section> is the stable hook.
    await expect(page.locator("section.ai-analysis-panel")).toBeVisible({
      timeout: DEFAULT_TIMEOUT * 3,
    });
  });

  test("analyze button is present and enabled", async ({ page }) => {
    const txHash = ETH_MAINNET.canonicalTxHash;
    await page.goto(`/#/1/tx/${txHash}`);
    const button = page.locator(".ai-analysis-button").first();
    await expect(button).toBeVisible({ timeout: DEFAULT_TIMEOUT * 3 });
    await expect(button).toBeEnabled();
  });
});
