import type { Page, TestInfo } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Default timeout for assertions in e2e tests.
 * - Local: 5000ms (5 seconds)
 * - CI (GitHub Actions): 10000ms (10 seconds)
 */
export const DEFAULT_TIMEOUT = process.env.CI ? 10000 : 5000;

/**
 * Shared wait helpers for e2e tests with retry-aware timeouts.
 *
 * Timeout formula: baseTimeout + (increment * retryCount)
 * - Retry 0: 30s
 * - Retry 1: 40s
 * - Retry 2: 50s
 * - Retry 3: 60s
 *
 * This ensures flaky tests have more time on retries while keeping
 * initial runs fast.
 */

const BASE_TIMEOUT = 30000; // 30 seconds base
const TIMEOUT_INCREMENT = 10000; // 10 seconds per retry

/**
 * Calculate timeout based on retry count
 */
function getTimeout(testInfo: TestInfo): number {
  return BASE_TIMEOUT + TIMEOUT_INCREMENT * testInfo.retry;
}

/**
 * Wait for block page content to load or error to appear.
 * Returns true if content loaded successfully, false if error or timeout.
 */
export async function waitForBlockContent(page: Page, testInfo: TestInfo): Promise<boolean> {
  const timeout = getTimeout(testInfo);
  try {
    await expect(
      page
        .locator("text=Transactions:")
        .or(page.locator("text=Error:"))
        .or(page.locator("text=Something went wrong"))
        .first()
    ).toBeVisible({ timeout });

    return (
      !(await page.locator("text=Error:").isVisible()) &&
      !(await page.locator("text=Something went wrong").isVisible())
    );
  } catch {
    return false;
  }
}

/**
 * Wait for transaction page content to load or error to appear.
 * Returns true if content loaded successfully, false if error or timeout.
 */
export async function waitForTxContent(page: Page, testInfo: TestInfo): Promise<boolean> {
  const timeout = getTimeout(testInfo);
  try {
    await expect(
      page
        .locator("text=Transaction Hash:")
        .or(page.locator("text=Error:"))
        .or(page.locator("text=Something went wrong"))
        .first()
    ).toBeVisible({ timeout });

    return (
      !(await page.locator("text=Error:").isVisible()) &&
      !(await page.locator("text=Something went wrong").isVisible())
    );
  } catch {
    return false;
  }
}

/**
 * Wait for address page content to load or error to appear.
 * Returns true if content loaded successfully, false if error or timeout.
 */
export async function waitForAddressContent(page: Page, testInfo: TestInfo): Promise<boolean> {
  const timeout = getTimeout(testInfo);
  try {
    await expect(
      page
        .locator("text=Balance:")
        .or(page.locator("text=Error:"))
        .or(page.locator("text=Something went wrong"))
        .first()
    ).toBeVisible({ timeout });

    return (
      !(await page.locator("text=Error:").isVisible()) &&
      !(await page.locator("text=Something went wrong").isVisible())
    );
  } catch {
    return false;
  }
}

/**
 * Wait for token page content to load or error to appear.
 * Returns true if content loaded successfully, false if error or timeout.
 */
export async function waitForTokenContent(page: Page, testInfo: TestInfo): Promise<boolean> {
  const timeout = getTimeout(testInfo);
  try {
    await expect(
      page
        .locator(".erc721-header")
        .or(page.locator(".erc1155-header"))
        .or(page.locator("text=Error:"))
        .or(page.locator("text=Something went wrong"))
        .first()
    ).toBeVisible({ timeout });

    return (
      !(await page.locator("text=Error:").isVisible()) &&
      !(await page.locator("text=Something went wrong").isVisible())
    );
  } catch {
    return false;
  }
}
