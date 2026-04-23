import { test, expect } from "../../../fixtures/test";

/**
 * Regression test for the H-2 security fix (PR that added
 * `src/utils/urlUtils.ts::toSafeExternalHref`). When NFT metadata contains
 * hostile `external_url` / `animation_url` / `tokenUri` values
 * (`javascript:…`, `data:text/html,…`, etc.), the token detail page must
 * not render them as `<a href>` — the gating lives in
 * `ERC721TokenDisplay.tsx` and `ERC1155TokenDisplay.tsx`.
 *
 * This spec is a placeholder in Phase 1 because a hermetic version requires
 * mocking:
 *   1. `eth_call` for `tokenURI(uint256)` on the token contract
 *   2. `eth_call` for `name()` / `symbol()` / `ownerOf()` /
 *      `getApproved()` (fetchCollectionInfo + fetchTokenOwner)
 *   3. the HTTP GET of the metadata JSON at the resolved IPFS/HTTP URL
 *
 * Phase 4 (`shared/nft-safety.spec.ts` full version) wires these together
 * using the `rpcMock` helpers. Until then this file lives as an explicit
 * todo so future reviewers see where the gap is.
 */

test.describe("NFT safe-href regression (H-2)", () => {
  test.skip("javascript: external_url is not rendered as <a>", async ({ page }) => {
    await page.goto("/#/1");
    expect(true).toBe(true); // placeholder
  });

  test.skip("data:text/html animation_url is not rendered as <a>", async ({ page }) => {
    await page.goto("/#/1");
    expect(true).toBe(true);
  });

  test.skip("vbscript: tokenUri is not rendered as <a>", async ({ page }) => {
    await page.goto("/#/1");
    expect(true).toBe(true);
  });
});
