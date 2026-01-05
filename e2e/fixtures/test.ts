import { test as base } from "@playwright/test";

/**
 * Custom test fixture that increases timeout on retries.
 * Base timeout: 60 seconds
 * Formula: baseTimeout + (20 seconds * retryCount)
 * - Retry 0: 60s
 * - Retry 1: 80s
 * - Retry 2: 100s
 * - Retry 3: 120s
 */
export const test = base.extend({});

const BASE_TIMEOUT = 60000;
const TIMEOUT_INCREMENT = 20000; // 20 seconds per retry

test.beforeEach(async ({}, testInfo) => {
  const newTimeout = BASE_TIMEOUT + TIMEOUT_INCREMENT * testInfo.retry;
  testInfo.setTimeout(newTimeout);
});

export { expect } from "@playwright/test";
