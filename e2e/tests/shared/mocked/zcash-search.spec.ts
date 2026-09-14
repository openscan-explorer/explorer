import type { Page } from "@playwright/test";
import {
  BLOCK_3483400,
  IRONWOOD_ONLY_TX,
} from "../../../../src/services/adapters/ZcashAdapter/fixtures";
import { expect, test } from "../../../fixtures/test";
import { mockZcashRpc, ZCASH } from "../../../fixtures/zcash";

/**
 * Hermetic search on a Zcash network. Zcash block hashes and txids are both 64 hex characters,
 * so hashes go to the transaction page, which redirects to the block when no transaction matches.
 */
async function search(page: Page, term: string) {
  const input = page.locator("input.home-search-input").first();
  await input.fill(term);
  await input.press("Enter");
}

test.describe("Zcash search", () => {
  test.beforeEach(async ({ page }) => {
    await mockZcashRpc(page);
    await page.goto(`/#/${ZCASH.networkSlug}`);
    await expect(page.locator(".network-title-name")).toHaveText("ZCASH MAINNET");
  });

  test("goes to a block by height", async ({ page }) => {
    await search(page, String(ZCASH.tipHeight));

    await expect(page).toHaveURL(new RegExp(`/${ZCASH.networkSlug}/block/${ZCASH.tipHeight}$`));
    await expect(page.locator(".block-number")).toHaveText("#3,483,400");
  });

  test("goes to a transaction by txid", async ({ page }) => {
    await search(page, IRONWOOD_ONLY_TX.txid ?? "");

    await expect(page).toHaveURL(new RegExp(`/${ZCASH.networkSlug}/tx/${IRONWOOD_ONLY_TX.txid}$`));
    await expect(page.getByText("Fully shielded transaction")).toBeVisible();
  });

  test("redirects a block hash to its block page", async ({ page }) => {
    await search(page, BLOCK_3483400.hash);

    await expect(page).toHaveURL(new RegExp(`/${ZCASH.networkSlug}/block/${BLOCK_3483400.hash}$`));
    await expect(page.locator(".block-number")).toHaveText("#3,483,400");
  });

  test("reports a hash that matches no transaction or block", async ({ page }) => {
    const unknownHash = "ab".repeat(32);

    await search(page, unknownHash);

    await expect(page.getByText("Couldn't load this transaction")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/${ZCASH.networkSlug}/tx/${unknownHash}$`));
  });

  test("rejects a term that is not a height, hash or address", async ({ page }) => {
    await search(page, "not-a-zcash-term");

    await expect(page.locator(".home-search-error").first()).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/#/${ZCASH.networkSlug}$`));
  });
});
