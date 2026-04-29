import { test } from "../../fixtures/test";
import {
  ETH_MAINNET,
  ARBITRUM,
  OPTIMISM,
  BASE,
  type NetworkFixture,
} from "../../fixtures/networks";
import { expectStillMounted } from "../../fixtures/assertions";

/**
 * Cross-network error-path smoke. Each test asserts the app root and footer
 * stay mounted after we navigate to broken input — a "did the app hard-crash
 * or silently redirect home?" guard. We deliberately avoid asserting on
 * specific error copy so the suite doesn't rot when i18n strings change.
 */

const EVM_SUBJECTS: NetworkFixture[] = [ETH_MAINNET, ARBITRUM, OPTIMISM, BASE];

test.describe("Error paths: invalid block numbers", () => {
  for (const net of EVM_SUBJECTS) {
    test(`${net.name} — non-existent block renders without crashing`, async ({ page }) => {
      // A block number far beyond what any chain has produced.
      await page.goto(`/#/${net.urlPath}/block/999999999999`);
      await expectStillMounted(page);
    });

    test(`${net.name} — malformed block param renders without crashing`, async ({ page }) => {
      await page.goto(`/#/${net.urlPath}/block/not-a-block`);
      await expectStillMounted(page);
    });
  }
});

test.describe("Error paths: invalid transaction hashes", () => {
  // Valid 32-byte shape, but all-zeros will not exist on any live chain.
  const ZERO_ISH_HASH = `0x${"0".repeat(63)}1`;

  for (const net of EVM_SUBJECTS) {
    test(`${net.name} — non-existent tx hash renders without crashing`, async ({ page }) => {
      await page.goto(`/#/${net.urlPath}/tx/${ZERO_ISH_HASH}`);
      await expectStillMounted(page);
    });

    test(`${net.name} — malformed tx hash renders without crashing`, async ({ page }) => {
      await page.goto(`/#/${net.urlPath}/tx/not-a-hash`);
      await expectStillMounted(page);
    });
  }
});

test.describe("Error paths: invalid addresses", () => {
  for (const net of EVM_SUBJECTS) {
    test(`${net.name} — malformed address renders without crashing`, async ({ page }) => {
      await page.goto(`/#/${net.urlPath}/address/not-an-address`);
      await expectStillMounted(page);
    });

    test(`${net.name} — zero address renders`, async ({ page }) => {
      // Zero address is valid shape and must render like a normal address
      // page (balance 0, no code), not an error state.
      await page.goto(`/#/${net.urlPath}/address/0x0000000000000000000000000000000000000000`);
      await expectStillMounted(page);
    });
  }
});

test.describe("Error paths: unknown network", () => {
  test("unknown `:networkId` segment falls back without crashing", async ({ page }) => {
    await page.goto("/#/totally-fake-chain/block/1");
    await expectStillMounted(page);
  });
});
