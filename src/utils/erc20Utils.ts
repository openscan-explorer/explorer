/**
 * ERC20 utility functions for fetching token balances and metadata
 */
import { formatUnitsValue } from "./unitFormatters";

// ERC20 function selectors
const ERC20_BALANCE_OF_SELECTOR = "0x70a08231"; // balanceOf(address)
const ERC20_NAME_SELECTOR = "0x06fdde03"; // name()
const ERC20_SYMBOL_SELECTOR = "0x95d89b41"; // symbol()
const ERC20_DECIMALS_SELECTOR = "0x313ce567"; // decimals()

export interface ERC20TokenInfo {
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  balance: string | null; // Raw balance in wei
}

/**
 * Pad an address to 32 bytes (64 hex chars)
 */
function padAddress(address: string): string {
  const addr = address.toLowerCase().replace("0x", "");
  return addr.padStart(64, "0");
}

/**
 * Convert hex string to UTF-8 string (browser-compatible)
 */
export function hexToUtf8(hex: string): string {
  let str = "";
  for (let i = 0; i < hex.length; i += 2) {
    const charCode = parseInt(hex.slice(i, i + 2), 16);
    if (charCode === 0) break; // Stop at null terminator
    str += String.fromCharCode(charCode);
  }
  return str;
}

/**
 * Decode a string from hex response
 * Handles both dynamic strings (standard ABI) and bytes32 (non-standard)
 */
function decodeString(hex: string): string {
  try {
    const data = hex.slice(2);

    // Case 1: Standard ABI dynamic string encoding
    // Format: offset (32 bytes) + length (32 bytes) + data
    if (data.length >= 128) {
      // Check if first 32 bytes is an offset pointing to 0x20 (32)
      const possibleOffset = parseInt(data.slice(0, 64), 16);
      if (possibleOffset === 32) {
        const lengthHex = data.slice(64, 128);
        const length = parseInt(lengthHex, 16);
        if (length > 0 && length <= 256) {
          const strHex = data.slice(128, 128 + length * 2);
          const decoded = hexToUtf8(strHex);
          if (decoded && decoded.length > 0) {
            return decoded;
          }
        }
      }
    }

    // Case 2: bytes32 encoding (non-standard, used by some tokens like MKR)
    // The string is stored directly as bytes32, padded with zeros
    if (data.length >= 64) {
      // Take the first 32 bytes and decode as UTF-8, removing null bytes
      const bytes32Hex = data.slice(0, 64);
      const decoded = hexToUtf8(bytes32Hex).trim();
      if (decoded && decoded.length > 0 && /^[\x20-\x7E]+$/.test(decoded)) {
        return decoded;
      }
    }

    return "";
  } catch {
    return "";
  }
}

/**
 * Make an eth_call RPC request
 */
async function ethCall(rpcUrl: string, to: string, data: string): Promise<string | null> {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_call",
        params: [{ to, data }, "latest"],
        id: 1,
      }),
    });
    const result = await response.json();
    if (result.error || !result.result || result.result === "0x") {
      return null;
    }
    return result.result;
  } catch {
    return null;
  }
}

/**
 * Fetch ERC20 token balance for an address
 * @param tokenAddress - The ERC20 token contract address
 * @param ownerAddress - The address to check balance for
 * @param rpcUrl - The RPC endpoint URL
 * @returns Raw balance as string or null if failed
 */
export async function fetchERC20Balance(
  tokenAddress: string,
  ownerAddress: string,
  rpcUrl: string,
): Promise<string | null> {
  const data = ERC20_BALANCE_OF_SELECTOR + padAddress(ownerAddress);
  const result = await ethCall(rpcUrl, tokenAddress, data);
  if (!result) return null;

  try {
    return BigInt(result).toString();
  } catch {
    return null;
  }
}

/**
 * Fetch multiple ERC20 token balances in parallel using Promise.all
 * @param tokenAddresses - Array of ERC20 token contract addresses
 * @param ownerAddress - The address to check balances for
 * @param rpcUrl - The RPC endpoint URL
 * @returns Map of token address (lowercase) to balance string or null
 */
export async function fetchERC20Balances(
  tokenAddresses: string[],
  ownerAddress: string,
  rpcUrl: string,
): Promise<Map<string, string | null>> {
  const balancePromises = tokenAddresses.map((tokenAddress) =>
    fetchERC20Balance(tokenAddress, ownerAddress, rpcUrl)
      .then((balance) => ({ tokenAddress, balance }))
      .catch(() => ({ tokenAddress, balance: null })),
  );

  const results = await Promise.all(balancePromises);
  return new Map(results.map((r) => [r.tokenAddress.toLowerCase(), r.balance]));
}

/**
 * Fetch complete ERC20 token info including balance
 * @param tokenAddress - The ERC20 token contract address
 * @param ownerAddress - The address to check balance for
 * @param rpcUrl - The RPC endpoint URL
 * @returns Token info with name, symbol, decimals, and balance
 */
export async function fetchERC20TokenInfo(
  tokenAddress: string,
  ownerAddress: string,
  rpcUrl: string,
): Promise<ERC20TokenInfo> {
  const [nameResult, symbolResult, decimalsResult, balanceResult] = await Promise.all([
    ethCall(rpcUrl, tokenAddress, ERC20_NAME_SELECTOR),
    ethCall(rpcUrl, tokenAddress, ERC20_SYMBOL_SELECTOR),
    ethCall(rpcUrl, tokenAddress, ERC20_DECIMALS_SELECTOR),
    fetchERC20Balance(tokenAddress, ownerAddress, rpcUrl),
  ]);

  return {
    name: nameResult ? decodeString(nameResult) : null,
    symbol: symbolResult ? decodeString(symbolResult) : null,
    decimals: decimalsResult ? parseInt(decimalsResult, 16) : null,
    balance: balanceResult,
  };
}

/**
 * Format token balance with decimals and locale-formatted whole part.
 * @param balance - Raw balance string
 * @param decimals - Token decimals
 * @param maxDisplayDecimals - Maximum decimals to display (default 6)
 * @returns Formatted balance string with locale separators (e.g. "1,234.56")
 */
export function formatTokenBalance(
  balance: string,
  decimals: number,
  maxDisplayDecimals = 6,
): string {
  const formatted = formatUnitsValue(balance, decimals, { maxDecimals: maxDisplayDecimals });
  if (formatted === undefined) return balance;

  const dotIndex = formatted.indexOf(".");
  if (dotIndex === -1) {
    return BigInt(formatted).toLocaleString();
  }

  const whole = formatted.slice(0, dotIndex);
  const frac = formatted.slice(dotIndex);
  return `${BigInt(whole).toLocaleString()}${frac}`;
}

/**
 * Validate if a string is a valid Ethereum address
 * @param address - The address to validate
 * @returns true if valid, false otherwise
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
