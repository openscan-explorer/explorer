import type { Page } from "@playwright/test";
import {
  BLOCK_3483400,
  IRONWOOD_ONLY_TX,
} from "../../../../src/services/adapters/ZcashAdapter/fixtures";
import { expect, test } from "../../../fixtures/test";
import {
  mockZcashRpc,
  type RecordedRpcCall,
  ZCASH,
  ZCASH_RPC_PATTERN,
} from "../../../fixtures/zcash";

/**
 * Hermetic search on a Zcash network. Zcash block hashes and txids are both 64 hex characters,
 * so hashes go to the transaction page, which redirects to the block when no transaction matches.
 */
async function search(page: Page, term: string) {
  const input = page.locator("input.home-search-input").first();
  await input.fill(term);
  await input.press("Enter");
}

let calls: RecordedRpcCall[] = [];

const getblockCalls = (hashOrHeight: string) =>
  calls.filter((call) => call.method === "getblock" && call.params[0] === hashOrHeight);

test.describe("Zcash search", () => {
  test.beforeEach(async ({ page }) => {
    calls = await mockZcashRpc(page);
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

  test("redirects a block hash to its block page by height, fetching the block once", async ({
    page,
  }) => {
    // The dashboard fetches the tip by height too; count only what the search adds
    await expect(page.getByTestId("zcash-blocks-table")).toContainText("#3,483,400");
    const tipFetchesBefore = getblockCalls(String(ZCASH.tipHeight)).length;

    await search(page, BLOCK_3483400.hash);

    await expect(page).toHaveURL(new RegExp(`/${ZCASH.networkSlug}/block/${ZCASH.tipHeight}$`));
    await expect(page.locator(".block-number")).toHaveText("#3,483,400");
    // The transaction page's lookup is handed to the block page, which doesn't refetch it
    expect(getblockCalls(BLOCK_3483400.hash)).toHaveLength(1);
    expect(getblockCalls(String(ZCASH.tipHeight))).toHaveLength(tipFetchesBefore);
  });

  test("doesn't look up a rate-limited hash as a block", async ({ page }) => {
    const hash = "cd".repeat(32);
    await page.route(ZCASH_RPC_PATTERN, async (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}");
      if (body.method === "getrawtransaction" && body.params?.[0] === hash) {
        await route.fulfill({ status: 429, body: "" });
        return;
      }
      await route.fallback();
    });
    // Skip through the 15s and 30s rate-limit backoffs
    await page.clock.install();
    await page.reload();

    await search(page, hash);
    await expect(page).toHaveURL(new RegExp(`/tx/${hash}$`));
    // Each backoff is scheduled after the previous attempt answers, so step through them
    await expect(async () => {
      await page.clock.fastForward(16_000);
      await expect(page.getByText("Couldn't load this transaction")).toBeVisible({
        timeout: 500,
      });
    }).toPass({ timeout: 20_000 });

    expect(getblockCalls(hash)).toHaveLength(0);
  });

  test("normalizes an all-uppercase unified address", async ({ page }) => {
    const unified = `u1${"q".repeat(100)}`;

    await search(page, unified.toUpperCase());

    await expect(page).toHaveURL(new RegExp(`/${ZCASH.networkSlug}/address/${unified}$`));
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
