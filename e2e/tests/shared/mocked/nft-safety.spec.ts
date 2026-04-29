import { test } from "../../../fixtures/test";

/**
 * Regression test for the H-2 security fix (PR that added
 * `src/utils/urlUtils.ts::toSafeExternalHref`). When NFT metadata contains
 * hostile `external_url` / `animation_url` / `tokenUri` values
 * (`javascript:…`, `data:text/html,…`, etc.), the token detail page must
 * not render them as `<a href>`. The gating lives in
 * `ERC721TokenDisplay.tsx` and `ERC1155TokenDisplay.tsx`.
 *
 * Placeholder in phase 1 — the hermetic version requires mocking
 *   1. `eth_call` for `tokenURI(uint256)` on the token contract,
 *   2. `eth_call` for `name` / `symbol` / `ownerOf` / `getApproved`
 *      (`fetchCollectionInfo` + `fetchTokenOwner`),
 *   3. the HTTP GET of the metadata JSON at the resolved IPFS/HTTP URL.
 *
 * Phase 4 wires these together using the `rpcMock` helpers.
 */

test.describe("NFT safe-href regression (H-2) — TODO phase 4", () => {
  test.skip("javascript: external_url is not rendered as <a>", async () => {});
  test.skip("data:text/html animation_url is not rendered as <a>", async () => {});
  test.skip("vbscript: tokenUri is not rendered as <a>", async () => {});
});
