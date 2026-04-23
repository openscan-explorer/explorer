import { expect, type Page } from "@playwright/test";

/**
 * L2-specific assertion helpers. Each checks that the fields an L2 adapter
 * exists to surface are actually rendered on the page. The selectors are
 * data-label based so they survive CSS/class refactors.
 *
 * If the app uses i18n label keys rather than literal English strings, these
 * helpers match against the *label text* rendered in English — run tests
 * with the default language.
 */

/**
 * Arbitrum tx fields: `l1BlockNumber`, `sendCount`, `sendRoot`.
 *
 * Call after navigating to a tx detail page for an Arbitrum chain.
 */
export async function expectArbitrumL1Fields(page: Page): Promise<void> {
  await expect(page.getByText(/L1\s*Block\s*Number/i)).toBeVisible();
  await expect(page.getByText(/Send\s*Count/i)).toBeVisible();
  await expect(page.getByText(/Send\s*Root/i)).toBeVisible();
}

/**
 * Optimism / Base tx fields: `l1Fee`, `l1GasPrice`, `l1GasUsed`.
 */
export async function expectOpStackL1Fee(page: Page): Promise<void> {
  await expect(page.getByText(/L1\s*Fee(?!\s*Scalar)/i)).toBeVisible();
  await expect(page.getByText(/L1\s*Gas\s*Price/i)).toBeVisible();
  await expect(page.getByText(/L1\s*Gas\s*Used/i)).toBeVisible();
}

/**
 * Post-Dencun EIP-4844 block fields: `blobGasUsed`, `blobGasPrice`.
 * Call on a block detail page for a block that contains blob-carrying txs.
 */
export async function expectBlobFields(page: Page): Promise<void> {
  await expect(page.getByText(/Blob\s*Gas\s*Used/i)).toBeVisible();
  await expect(page.getByText(/(Blob\s*Gas\s*Price|Excess\s*Blob\s*Gas)/i)).toBeVisible();
}
