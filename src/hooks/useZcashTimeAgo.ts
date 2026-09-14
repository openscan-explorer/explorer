import { useCallback } from "react";
import { useTranslation } from "react-i18next";

/**
 * Localized short relative time ("5m ago") for Zcash pages
 */
export function useZcashTimeAgo(): (timestamp: number) => string {
  const { t } = useTranslation("zcash");

  return useCallback(
    (timestamp: number) => {
      const seconds = Math.max(0, Math.floor(Date.now() / 1000 - timestamp));
      if (seconds < 60) return t("common.secondsAgo", { count: seconds });
      if (seconds < 3600) return t("common.minutesAgo", { count: Math.floor(seconds / 60) });
      if (seconds < 86400) return t("common.hoursAgo", { count: Math.floor(seconds / 3600) });
      return t("common.daysAgo", { count: Math.floor(seconds / 86400) });
    },
    [t],
  );
}
