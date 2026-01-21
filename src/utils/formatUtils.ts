/**
 * Gas price formatting result with separate value and unit
 */
export interface FormattedGasPrice {
  value: string;
  unit: string;
}

/**
 * Formats a gas price from wei (hex string) to the most appropriate unit.
 * Automatically selects Gwei, Mwei, Kwei, or wei based on the value.
 * Handles L2 networks like Optimism that have very low gas prices.
 *
 * @param weiHex - Gas price in wei as a hex string (e.g., "0x3b9aca00")
 * @returns Object with formatted value and unit, or combined string
 */
export function formatGasPrice(weiHex: string): FormattedGasPrice {
  try {
    const wei = BigInt(weiHex);
    const weiNum = Number(wei);
    const gwei = weiNum / 1e9;

    // Use Gwei for normal gas prices (>= 0.01 Gwei)
    if (gwei >= 0.01) {
      return { value: gwei.toFixed(2), unit: "Gwei" };
    }

    // Use Mwei for very low gas prices (L2s like Optimism)
    const mwei = weiNum / 1e6;
    if (mwei >= 0.01) {
      return { value: mwei.toFixed(2), unit: "Mwei" };
    }

    // Use Kwei for extremely low gas prices
    const kwei = weiNum / 1e3;
    if (kwei >= 0.01) {
      return { value: kwei.toFixed(2), unit: "Kwei" };
    }

    // Fallback to wei
    return { value: weiNum.toFixed(0), unit: "wei" };
  } catch {
    return { value: "—", unit: "Gwei" };
  }
}

/**
 * Formats a gas price from wei (hex string) to a combined string with unit.
 * Convenience wrapper around formatGasPrice for cases where a single string is needed.
 *
 * @param weiHex - Gas price in wei as a hex string, or null
 * @returns Formatted string like "1.23 Gwei" or "—" if invalid
 */
export function formatGasPriceWithUnit(weiHex: string | null): string {
  if (!weiHex) return "—";
  const { value, unit } = formatGasPrice(weiHex);
  return `${value} ${unit}`;
}
