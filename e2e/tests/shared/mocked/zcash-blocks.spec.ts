import type { Page } from "@playwright/test";
import {
  BLOCK_3483400,
  COINBASE_TX,
} from "../../../../src/services/adapters/ZcashAdapter/fixtures";
import { expect, test } from "../../../fixtures/test";
import { mockZcashRpc, ZCASH, ZCASH_RPC_PATTERN } from "../../../fixtures/zcash";

// Before NU5 (mainnet height 1,687,104) blocks have no Orchard root, tree or block commitments
const PRE_NU5_HEIGHT = 1_000_000;
const PRE_NU5_BLOCK = {
  ...BLOCK_3483400,
  height: PRE_NU5_HEIGHT,
  hash: PRE_NU5_HEIGHT.toString(16).padStart(64, "0"),
  finalorchardroot: undefined,
  blockcommitments: undefined,
  trees: { sapling: { size: 123_456 } },
  tx: [COINBASE_TX],
};

/**
 * Answer one getblock request from the test instead of the shared mock
 */
async function overrideGetBlock(
  page: Page,
  respond: (params: unknown[]) => { result: unknown } | { error: string } | null,
) {
  await page.route(ZCASH_RPC_PATTERN, async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    const response = body.method === "getblock" ? respond(body.params ?? []) : null;
    if (!response) {
      await route.fallback();
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        "error" in response
          ? { jsonrpc: "2.0", id: body.id, error: { code: -8, message: response.error } }
          : { jsonrpc: "2.0", id: body.id, result: response.result },
      ),
    });
  });
}

/**
 * Hermetic Zcash blocks list and block detail pages, served from mainnet block 3,483,400.
 */
test.describe("Zcash blocks", () => {
  test("lists the latest blocks one call per block and pages to older blocks", async ({
    page,
  }) => {
    const calls = await mockZcashRpc(page);

    await page.goto(`/#/${ZCASH.networkSlug}/blocks`);

    const table = page.locator("table.blocks-table");
    await expect(table).toContainText("3,483,400");
    await expect(table).toContainText("3,483,391");
    await expect(table.locator("tbody tr")).toHaveCount(10);

    const summaryHeights = calls
      .filter((call) => call.method === "getblock" && call.params[1] === 1)
      .map((call) => call.params[0]);
    expect(summaryHeights).toContain("3483391");
    expect(calls.map((call) => call.method)).not.toContain("getblockhash");

    await page.getByRole("button", { name: "Older →" }).click();
    await expect(page).toHaveURL(/fromBlock=3483390/);
    await expect(table).toContainText("3,483,381");
  });

  test("shows Zcash-specific block details", async ({ page }) => {
    const calls = await mockZcashRpc(page);

    await page.goto(`/#/${ZCASH.networkSlug}/block/${ZCASH.tipHeight}`);

    await expect(page.locator(".block-number")).toHaveText("#3,483,400");
    await expect(page.getByText(BLOCK_3483400.hash)).toBeVisible();
    await expect(page.getByText("t1SqwRAAdSig6dE4EBPLonAait219VmkUjP")).toBeVisible();
    await expect(page.getByText("2 Sapling")).toBeVisible();
    await expect(page.getByText("2 Ironwood")).toBeVisible();
    await expect(page.getByTestId("zcash-value-pools")).toContainText("Value Pools After This Block");

    await page.getByRole("button", { name: "+ Show More Details" }).click();
    await expect(page.getByText(BLOCK_3483400.nonce)).toBeVisible();
    await expect(page.getByText("Equihash Solution:")).toBeVisible();
    await expect(page.getByText("Ironwood 318,976")).toBeVisible();

    // Only the requested block is fetched with full transactions, by height string. The dev
    // server runs React StrictMode, which can issue the same request twice.
    const verboseBlockCalls = calls.filter(
      (call) => call.method === "getblock" && call.params[1] === 2,
    );
    expect(new Set(verboseBlockCalls.map((call) => call.params[0]))).toEqual(new Set(["3483400"]));
  });

  test("renders a pre-NU5 block without Orchard fields", async ({ page }) => {
    await mockZcashRpc(page);
    await overrideGetBlock(page, ([height]) =>
      height === String(PRE_NU5_HEIGHT) ? { result: PRE_NU5_BLOCK } : null,
    );

    await page.goto(`/#/${ZCASH.networkSlug}/block/${PRE_NU5_HEIGHT}`);
    await expect(page.locator(".block-number")).toHaveText("#1,000,000");

    await page.getByRole("button", { name: "+ Show More Details" }).click();
    await expect(page.getByText("Final Sapling Root:")).toBeVisible();
    await expect(page.getByText("Sapling 123,456")).toBeVisible();
    await expect(page.getByText("Final Orchard Root:")).toHaveCount(0);
    await expect(page.getByText("Block Commitments:")).toHaveCount(0);
    await expect(page.getByText(/Orchard \d/)).toHaveCount(0);
  });

  test("pages down to the genesis block", async ({ page }) => {
    await mockZcashRpc(page);

    await page.goto(`/#/${ZCASH.networkSlug}/blocks?fromBlock=3`);

    const table = page.locator("table.blocks-table");
    await expect(table.locator("tbody tr")).toHaveCount(4);
    await expect(table.locator("tbody tr").last()).toContainText("0");
    await expect(page.getByRole("button", { name: "Older →" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "← Newer" })).toBeEnabled();
  });

  test("lists a block that failed to load and retries it", async ({ page }) => {
    await mockZcashRpc(page);
    const failingHeight = String(ZCASH.tipHeight - 5);
    // Fails until the retry (React StrictMode may fetch the page twice in development)
    let recovered = false;
    await overrideGetBlock(page, ([height]) =>
      height === failingHeight && !recovered ? { error: "Block not found" } : null,
    );

    await page.goto(`/#/${ZCASH.networkSlug}/blocks`);

    const table = page.locator("table.blocks-table");
    const unavailable = table.getByTestId("zcash-block-unavailable");
    // Rows arrive one block at a time, so allow for a slow dev server
    await expect(unavailable).toContainText("3,483,395", { timeout: 15_000 });
    await expect(table.locator("tbody tr")).toHaveCount(10);

    recovered = true;
    await unavailable.getByRole("button", { name: "Retry" }).click();
    await expect(unavailable).toHaveCount(0);
    await expect(table).toContainText("3,483,395");
  });
});
