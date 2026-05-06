import { test, expect } from "../../fixtures/test";
import { DEFAULT_TIMEOUT } from "../../helpers/wait";

/**
 * Contract interaction UI — read/write function lists on verified contracts.
 *
 * The existing per-network specs click individual read functions on BAYC and
 * Rarible but never assert the two top-level section headers render. A
 * regression in `ContractInteraction.tsx` that empties one list (e.g. ABI
 * decoding breaks) would slip through — these smokes catch that.
 *
 * Behaviour: the address page loads with "Contract Details" collapsed; the
 * spec expands it (matching what `eth-mainnet/address.spec.ts` does for
 * BAYC) before asserting the Read/Write sections render.
 *
 * We don't submit any write transaction (wallet signing is out of scope for
 * e2e), only assert the write-function form section renders.
 */

// WETH9 — a verified, non-proxy ERC-20 with a small, stable ABI (deposit /
// withdraw / approve / transfer / transferFrom + the standard reads). USDC
// is also verified but is a proxy, which means `ContractInteraction.tsx`
// surfaces the proxy's tiny admin ABI rather than the full token ABI and
// no "Write Functions" section appears.
const WETH9_MAINNET = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

async function openContractDetails(page: import("@playwright/test").Page): Promise<void> {
  await page.goto(`/#/1/address/${WETH9_MAINNET}`);
  // Wait specifically for the Contract Details header — not just any
  // "Balance:" sentinel — so the click below can't race the header mount.
  const header = page.locator("text=Contract Details").first();
  await expect(header).toBeVisible({ timeout: DEFAULT_TIMEOUT * 4 });
  await header.click();
}

test.describe("Contract interaction UI", () => {
  test("verified ERC-20 renders Read Functions section", async ({ page }) => {
    await openContractDetails(page);
    await expect(page.locator("text=/Read Functions \\(\\d+\\)/")).toBeVisible({
      timeout: DEFAULT_TIMEOUT * 3,
    });
  });

  test("verified ERC-20 renders Write Functions section", async ({ page }) => {
    await openContractDetails(page);
    await expect(page.locator("text=/Write Functions \\(\\d+\\)/")).toBeVisible({
      timeout: DEFAULT_TIMEOUT * 3,
    });
  });

  // Unverified-contract coverage (contract has code but no public source)
  // deferred to phase 6 — picking a stably-unverified contract on mainnet
  // is a research task, and the zero-address fallback in errors.spec.ts
  // already covers the EOA (no-code) path.
});
