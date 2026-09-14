import { BLOCK_3483400 } from "../../../../src/services/adapters/ZcashAdapter/fixtures";
import { expect, test } from "../../../fixtures/test";
import { mockZcashRpc, ZCASH } from "../../../fixtures/zcash";

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
});
