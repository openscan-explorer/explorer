type FormatOptions = {
  maxDecimals?: number;
  unit?: string;
};

function parseBigIntValue(value: string): bigint | null {
  if (!value) return null;
  try {
    return value.startsWith("0x") ? BigInt(value) : BigInt(value);
  } catch {
    return null;
  }
}

function formatUnitsValue(
  value: string,
  decimals: number,
  { maxDecimals = 6 }: FormatOptions = {},
): string | undefined {
  const bn = parseBigIntValue(value);
  if (bn === null) return undefined;
  if (decimals <= 0) return bn.toString();

  const divisor = 10n ** BigInt(decimals);
  const whole = bn / divisor;
  const fraction = bn % divisor;

  if (fraction === 0n || maxDecimals === 0) return whole.toString();

  const padded = fraction.toString().padStart(decimals, "0");
  const trimmed = padded.slice(0, Math.min(decimals, maxDecimals)).replace(/0+$/, "");
  return trimmed.length > 0 ? `${whole.toString()}.${trimmed}` : whole.toString();
}

export function formatNativeFromWei(
  value?: string,
  unit = "ETH",
  maxDecimals = 6,
): string | undefined {
  if (!value) return undefined;
  const formatted = formatUnitsValue(value, 18, { maxDecimals });
  return formatted ? `${formatted} ${unit}` : undefined;
}

export function formatEthFromWei(value?: string, maxDecimals = 6): string | undefined {
  return formatNativeFromWei(value, "ETH", maxDecimals);
}

export function formatGweiFromWei(value?: string, maxDecimals = 2): string | undefined {
  if (!value) return undefined;
  const formatted = formatUnitsValue(value, 9, { maxDecimals });
  return formatted ? `${formatted} Gwei` : undefined;
}

export function formatTokenAmount(
  value?: string,
  decimals?: number,
  maxDecimals = 6,
  symbol?: string,
): string | undefined {
  if (!value || decimals === undefined || decimals === null) return undefined;
  const formatted = formatUnitsValue(value, decimals, { maxDecimals });
  if (!formatted) return undefined;
  return symbol ? `${formatted} ${symbol}` : formatted;
}

export function toDecimalString(value?: string): string | undefined {
  if (!value) return undefined;
  const bn = parseBigIntValue(value);
  return bn === null ? undefined : bn.toString();
}
