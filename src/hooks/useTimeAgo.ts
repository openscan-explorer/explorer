import { useCallback } from "react";
import { useTranslation } from "react-i18next";

const UNITS = [
  { key: "day", seconds: 60 * 60 * 24 },
  { key: "hour", seconds: 60 * 60 },
  { key: "minute", seconds: 60 },
] as const;

/**
 * Localized relative time ("5 minutes ago") from a Unix timestamp in seconds, using the
 * pluralized `block:time.*` keys
 */
export function useTimeAgo(): (timestamp: number) => string {
  const { t } = useTranslation("block");

  return useCallback(
    (timestamp: number) => {
      const seconds = Math.max(0, Math.floor(Date.now() / 1000 - timestamp));
      if (seconds < 5) return t("time.justNow");

      for (const unit of UNITS) {
        if (seconds >= unit.seconds) {
          const count = Math.floor(seconds / unit.seconds);
          return t("time.ago", { count, unit: t(`time.${unit.key}`, { count }) });
        }
      }
      return t("time.ago", { count: seconds, unit: t("time.second", { count: seconds }) });
    },
    [t],
  );
}
