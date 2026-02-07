import { STORAGE_KEY } from "./artifactsStorage";
import { logger } from "./logger";

declare global {
  const __DEV_ARTIFACTS__: Record<string, unknown> | null;
}

/**
 * Injects development artifacts into localStorage if available.
 * Called on app startup in development mode.
 *
 * This allows artifacts from Hardhat/Ignition deployments to be
 * automatically available without manual ZIP import.
 */
export function injectDevArtifacts(): void {
  // Check if dev artifacts were injected by the Vite plugin
  if (typeof __DEV_ARTIFACTS__ === "undefined" || __DEV_ARTIFACTS__ === null) {
    return;
  }

  // Check if artifacts is empty
  if (Object.keys(__DEV_ARTIFACTS__).length === 0) {
    return;
  }

  // Only inject if localStorage is empty (don't override user imports)
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (Object.keys(parsed).length > 0) {
        logger.debug("[dev-artifacts] localStorage already has artifacts, skipping injection");
        return;
      }
    } catch {
      // Invalid JSON, will overwrite
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(__DEV_ARTIFACTS__));
    logger.debug(
      `[dev-artifacts] Injected ${Object.keys(__DEV_ARTIFACTS__).length} contract artifacts into localStorage`,
    );
  } catch (err) {
    logger.warn("[dev-artifacts] Failed to inject artifacts into localStorage:", err);
  }
}
