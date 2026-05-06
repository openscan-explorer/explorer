import { test, expect } from "../../fixtures/test";
import { DEFAULT_TIMEOUT } from "../../helpers/wait";

/**
 * Event logs rendering — stresses `EventLogsTab`.
 *
 * The research review flagged that nothing in the suite asserts event-log
 * rows actually render. A regression that breaks decode (silent throw in
 * the log row component, missing ABI, etc.) would slip through because the
 * per-network specs only open tx pages and check header fields, not the
 * nested detail tabs.
 *
 * Behaviour: `TxAnalyser` starts collapsed for non-super-users
 * (`collapsed = !isSuperUser` in `TxAnalyser.tsx`). Clicking the Events tab
 * button expands the panel; only then does `.tx-log` render.
 *
 * We don't stress-test 100+ logs here — pagination / virtualization specs
 * deferred to phase 6. This commits the baseline: at least one event-log
 * row appears for a known tx that emits events.
 */

// EIP-1559 tx from block 20,000,000 — the `bb4b3fc2…` hash pinned in
// `e2e/fixtures/mainnet.ts` as the canonical Type 2 example. Well-indexed
// on every public RPC, has `hasInputData: true` in the fixture.
const LARGE_TX = "0xbb4b3fc2b746877dce70862850602f1d19bd890ab4db47e6b7ee1da1fe578a0d";

test.describe("Transaction event log rendering", () => {
  test("tx detail page exposes the TxAnalyser with an Events tab", async ({ page }) => {
    await page.goto(`/#/1/tx/${LARGE_TX}`);
    // The analyser is null until receipt + tx are both fetched
    // (`!isSuperUser && !hasEvents && !hasInputData → null`). Give the
    // network fetch generous time, but do not mask systemic flakiness —
    // a timeout here means the RPC path is broken, not the spec.
    const eventsTab = page
      .locator(".detail-panel-tab", { hasText: /^\s*Events\b/ })
      .first();
    await expect(eventsTab).toBeVisible({ timeout: DEFAULT_TIMEOUT * 6 });
    await eventsTab.click();
    // EventLogsTab renders each log as `.tx-log` (per
    // `src/components/pages/evm/tx/analyser/EventLogsTab.tsx`).
    const firstLog = page.locator(".tx-log").first();
    await expect(firstLog).toBeVisible({ timeout: DEFAULT_TIMEOUT * 4 });
  });
});
