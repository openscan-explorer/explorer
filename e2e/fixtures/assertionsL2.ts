import { expect, type Page } from "@playwright/test";
import { DEFAULT_TIMEOUT } from "../helpers/wait";

/**
 * L2-specific assertion helpers. Each checks that the fields an L2 adapter
 * exists to surface are actually rendered on the page. Selectors use the
 * i18n-rendered English labels (from `src/locales/en/{transaction,block}.json`)
 * which are the field labels the UI renders above their values.
 *
 * The app ships five English locales; run the suite with the default (en)
 * so these matches succeed.
 *
 * Where each field is rendered (per `TransactionDisplay.tsx` and
 * `BlockDisplay.tsx`):
 *   - Arbitrum tx:       L1 Block Number (receipt field)
 *   - Arbitrum block:    Send Count, Send Root
 *   - OP Stack tx:       L1 Fee, L1 Gas Price, L1 Gas Used
 *   - Post-Dencun block: Blob Gas Used, Excess Blob Gas
 *
 * Assertions use a generous timeout (4× DEFAULT_TIMEOUT) because L2 RPCs
 * on public endpoints are slower than mainnet and the fields only appear
 * after the receipt fetch completes, not just the tx-by-hash.
 */

const L2_ASSERTION_TIMEOUT = DEFAULT_TIMEOUT * 4;

/** Arbitrum tx receipt includes `l1BlockNumber`. */
export async function expectArbitrumTxL1Fields(page: Page): Promise<void> {
  await expect(page.getByText(/L1\s*Block\s*Number/i)).toBeVisible({
    timeout: L2_ASSERTION_TIMEOUT,
  });
}

/** Arbitrum block exposes L2→L1 message fields: `sendCount`, `sendRoot`. */
export async function expectArbitrumBlockFields(page: Page): Promise<void> {
  await expect(page.getByText(/Send\s*Count/i)).toBeVisible({
    timeout: L2_ASSERTION_TIMEOUT,
  });
  await expect(page.getByText(/Send\s*Root/i)).toBeVisible({
    timeout: L2_ASSERTION_TIMEOUT,
  });
}

/**
 * OP Stack (Optimism / Base) tx surfaces the L1 fee breakdown.
 * Match `L1 Fee` but not `L1 Fee Scalar` — they're separate rows.
 */
export async function expectOpStackTxL1Fee(page: Page): Promise<void> {
  await expect(page.getByText(/L1\s*Fee(?!\s*Scalar)/i).first()).toBeVisible({
    timeout: L2_ASSERTION_TIMEOUT,
  });
  await expect(page.getByText(/L1\s*Gas\s*Price/i)).toBeVisible({
    timeout: L2_ASSERTION_TIMEOUT,
  });
  await expect(page.getByText(/L1\s*Gas\s*Used/i)).toBeVisible({
    timeout: L2_ASSERTION_TIMEOUT,
  });
}

/**
 * Post-Dencun block with blob-carrying txs renders `blobGasUsed` and
 * `excessBlobGas`. The BlockDisplay gates on `blobGasUsed > 0` so pick a
 * block that actually includes a blob tx, not any post-fork block.
 */
export async function expectBlobFields(page: Page): Promise<void> {
  await expect(page.getByText(/Blob\s*Gas\s*Used/i)).toBeVisible({
    timeout: L2_ASSERTION_TIMEOUT,
  });
  await expect(page.getByText(/Excess\s*Blob\s*Gas/i)).toBeVisible({
    timeout: L2_ASSERTION_TIMEOUT,
  });
}
