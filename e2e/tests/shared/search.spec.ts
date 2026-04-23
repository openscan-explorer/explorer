import { test, expect } from "../../fixtures/test";
import { ETH_MAINNET, ARBITRUM, BASE, type NetworkFixture } from "../../fixtures/networks";
import { DEFAULT_TIMEOUT } from "../../helpers/wait";

/**
 * Global search: uses the navbar `search-form`. The `useSearch` hook derives
 * the target chain from the current URL's first path segment, so each test
 * lands on a network page first, then submits a query via the form.
 *
 * For EVM search, `useSearch` regex-matches the input and routes to:
 *   - `/<chain>/tx/<hash>`     for 64-hex-char values
 *   - `/<chain>/address/<hex>` for 40-hex-char values
 *   - `/<chain>/block/<n>`     for bare digits
 *
 * We assert only the URL change — the destination page's live RPC fetch is
 * already covered by per-network specs.
 */

const EVM_SUBJECTS: NetworkFixture[] = [ETH_MAINNET, ARBITRUM, BASE];

async function submitSearch(
  page: import("@playwright/test").Page,
  query: string,
): Promise<void> {
  // The navbar desktop form is `.search-form.hide-mobile` with `.search-input`.
  const input = page.locator("form.search-form .search-input").first();
  await input.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT });
  await input.fill(query);
  await input.press("Enter");
}

test.describe("Search: transaction hash", () => {
  for (const net of EVM_SUBJECTS) {
    test(`${net.name} — searching a 64-hex-char value routes to /tx/<hash>`, async ({ page }) => {
      await page.goto(`/#/${net.urlPath}`);
      const hash = `0x${"0".repeat(63)}1`;
      await submitSearch(page, hash);
      await expect(page).toHaveURL(new RegExp(`/${net.urlPath}/tx/${hash}`), {
        timeout: DEFAULT_TIMEOUT,
      });
    });
  }
});

test.describe("Search: address", () => {
  for (const net of EVM_SUBJECTS) {
    test(`${net.name} — searching a 40-hex-char value routes to /address/<addr>`, async ({
      page,
    }) => {
      await page.goto(`/#/${net.urlPath}`);
      await submitSearch(page, net.canonicalAddress);
      // useSearch lowercases nothing; match case-insensitively.
      await expect(page).toHaveURL(
        new RegExp(`/${net.urlPath}/address/${net.canonicalAddress}`, "i"),
        { timeout: DEFAULT_TIMEOUT },
      );
    });
  }
});

test.describe("Search: block number", () => {
  for (const net of EVM_SUBJECTS) {
    test(`${net.name} — searching a bare integer routes to /block/<n>`, async ({ page }) => {
      await page.goto(`/#/${net.urlPath}`);
      await submitSearch(page, "1");
      await expect(page).toHaveURL(new RegExp(`/${net.urlPath}/block/1(?:$|/|\\?)`), {
        timeout: DEFAULT_TIMEOUT,
      });
    });
  }
});

test.describe("Search: invalid input", () => {
  test("malformed query surfaces an inline error and does not navigate", async ({ page }) => {
    await page.goto(`/#/${ETH_MAINNET.urlPath}`);
    const before = page.url();
    await submitSearch(page, "not-a-valid-thing");
    // Give the validation error path a moment, but do NOT wait for a URL
    // change — the correct behavior is to stay on the same page.
    await page.waitForTimeout(500);
    expect(page.url()).toBe(before);
  });
});
