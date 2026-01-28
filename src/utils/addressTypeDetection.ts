import { fetchToken } from "../services/MetadataService";
import type { Address, AddressType } from "../types";

// ERC165 interface IDs
const ERC165_INTERFACE_ID = "0x01ffc9a7";
const ERC721_INTERFACE_ID = "0x80ac58cd";
const ERC1155_INTERFACE_ID = "0xd9b67a26";

// ERC20 function selectors
const ERC20_NAME_SELECTOR = "0x06fdde03"; // name()
const ERC20_SYMBOL_SELECTOR = "0x95d89b41"; // symbol()
const ERC20_DECIMALS_SELECTOR = "0x313ce567"; // decimals()
const ERC20_TOTAL_SUPPLY_SELECTOR = "0x18160ddd"; // totalSupply()

/**
 * Make a single RPC call
 */
async function rpcCall<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      id: 1,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  return data.result;
}

/**
 * Fetch basic address data (balance, code, txCount)
 */
async function fetchAddressData(addressHash: string, rpcUrl: string): Promise<Address> {
  const normalizedAddress = addressHash.toLowerCase();

  const [balance, code, txCount] = await Promise.all([
    rpcCall<string>(rpcUrl, "eth_getBalance", [normalizedAddress, "latest"]),
    rpcCall<string>(rpcUrl, "eth_getCode", [normalizedAddress, "latest"]),
    rpcCall<string>(rpcUrl, "eth_getTransactionCount", [normalizedAddress, "latest"]),
  ]);

  return {
    address: addressHash,
    balance: BigInt(balance).toString(),
    code: code,
    txCount: Number.parseInt(txCount, 16).toString(),
    storageAt: {},
  };
}

/**
 * Check if a contract supports a specific interface via ERC165
 */
async function supportsInterface(
  contractAddress: string,
  interfaceId: string,
  rpcUrl: string,
): Promise<boolean> {
  try {
    // Encode supportsInterface(bytes4) call
    // supportsInterface selector: 0x01ffc9a7
    // Pad interfaceId to 32 bytes
    const paddedInterfaceId = interfaceId.slice(2).padEnd(64, "0");
    const data = `0x01ffc9a7${paddedInterfaceId}`;

    const result = await rpcCall<string>(rpcUrl, "eth_call", [
      { to: contractAddress, data },
      "latest",
    ]);

    // Check if result is true (0x0000...0001)
    const resultValue = result.toLowerCase();
    return resultValue === "0x0000000000000000000000000000000000000000000000000000000000000001";
  } catch {
    return false;
  }
}

/**
 * Check if a contract has ERC20 methods by calling them
 */
async function hasERC20Methods(contractAddress: string, rpcUrl: string): Promise<boolean> {
  const selectors = [
    ERC20_NAME_SELECTOR,
    ERC20_SYMBOL_SELECTOR,
    ERC20_DECIMALS_SELECTOR,
    ERC20_TOTAL_SUPPLY_SELECTOR,
  ];

  let successCount = 0;

  // Check all selectors in parallel
  const results = await Promise.all(
    selectors.map(async (selector) => {
      try {
        const result = await rpcCall<string>(rpcUrl, "eth_call", [
          { to: contractAddress, data: selector },
          "latest",
        ]);
        return result && result !== "0x";
      } catch {
        return false;
      }
    }),
  );

  successCount = results.filter(Boolean).length;

  // If at least 3 of 4 methods respond, likely ERC20
  return successCount >= 3;
}

/**
 * Detect address type via ERC165 supportsInterface
 */
async function detectViaERC165(
  contractAddress: string,
  rpcUrl: string,
): Promise<AddressType | null> {
  // First check if contract supports ERC165 at all
  const supportsERC165 = await supportsInterface(contractAddress, ERC165_INTERFACE_ID, rpcUrl);

  if (!supportsERC165) {
    return null;
  }

  // Check for ERC1155 and ERC721 in parallel
  const [isERC1155, isERC721] = await Promise.all([
    supportsInterface(contractAddress, ERC1155_INTERFACE_ID, rpcUrl),
    supportsInterface(contractAddress, ERC721_INTERFACE_ID, rpcUrl),
  ]);

  // Check for ERC1155 first (more specific)
  if (isERC1155) {
    return "erc1155";
  }

  if (isERC721) {
    return "erc721";
  }

  return null;
}

/**
 * Detect address type via metadata service
 */
async function detectViaMetadata(
  chainId: number,
  contractAddress: string,
): Promise<AddressType | null> {
  try {
    const tokenMetadata = await fetchToken(chainId, contractAddress);

    if (tokenMetadata?.type) {
      const type = tokenMetadata.type.toLowerCase();
      if (type === "erc20" || type === "erc721" || type === "erc1155") {
        return type as AddressType;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Determine the address type from code and on-chain detection
 */
async function determineContractType(
  addressHash: string,
  chainId: number,
  rpcUrl: string,
): Promise<AddressType> {
  // Try metadata detection first (fastest, no RPC calls)
  const metadataType = await detectViaMetadata(chainId, addressHash);
  if (metadataType) {
    return metadataType;
  }

  // Try ERC165 detection (for ERC721/ERC1155)
  const erc165Type = await detectViaERC165(addressHash, rpcUrl);
  if (erc165Type) {
    return erc165Type;
  }

  // Try ERC20 method detection
  const isERC20 = await hasERC20Methods(addressHash, rpcUrl);
  if (isERC20) {
    return "erc20";
  }

  // Default to generic contract
  return "contract";
}

export interface FetchAddressWithTypeOptions {
  addressHash: string;
  chainId: number;
  rpcUrl: string;
}

export interface AddressWithType {
  address: Address;
  addressType: AddressType;
}

// EIP-7702 delegation designator prefix (0xef0100)
const EIP7702_DELEGATION_PREFIX = "0xef0100";

/**
 * Check if code is an EIP-7702 delegation designator
 * EIP-7702 allows EOAs to delegate to a contract implementation
 * Format: 0xef0100 + 20-byte address (total 23 bytes / 46 hex chars + 0x prefix)
 */
function isEIP7702Delegation(code: string | null | undefined): boolean {
  if (!code) return false;
  const normalized = code.toLowerCase();
  return normalized.startsWith(EIP7702_DELEGATION_PREFIX) && normalized.length === 48; // 0x + 46 hex chars
}

/**
 * Extract the delegate address from EIP-7702 code
 * Returns null if not a valid EIP-7702 delegation
 */
export function getEIP7702DelegateAddress(code: string | null | undefined): string | null {
  if (!isEIP7702Delegation(code) || !code) return null;
  // Extract the 20-byte address after 0xef0100 prefix
  const addressHex = code.slice(8); // Remove "0xef0100"
  return `0x${addressHex}`;
}

/**
 * Check if code is an EIP-7702 delegation (exported version)
 */
export function checkEIP7702Delegation(code: string | null | undefined): boolean {
  return isEIP7702Delegation(code);
}

/**
 * Check if an address has contract code
 * Handles various RPC response formats
 */
function hasContractCode(code: string | null | undefined): boolean {
  if (!code) return false;
  // Normalize and check - empty code can be "0x", "0x0", "0x00", "", etc.
  const normalized = code.toLowerCase().replace(/^0x0*/, "");
  return normalized.length > 0;
}

/**
 * Fetch address data and detect its type in a single flow
 * This combines the getAddress and detectAddressType operations
 */
export async function fetchAddressWithType(
  options: FetchAddressWithTypeOptions,
): Promise<AddressWithType> {
  const { addressHash, chainId, rpcUrl } = options;

  // Step 1: Fetch basic address data (balance, code, txCount)
  const address = await fetchAddressData(addressHash, rpcUrl);

  // Step 2: Check for EIP-7702 delegation (EOA with delegated code)
  if (isEIP7702Delegation(address.code)) {
    // It's an EOA with EIP-7702 delegation - still treat as account
    return { address, addressType: "account" };
  }

  // Step 3: Determine address type based on code
  if (!hasContractCode(address.code)) {
    // It's an EOA (no code)
    return { address, addressType: "account" };
  }

  // Step 4: It's a contract - determine what type
  const addressType = await determineContractType(addressHash, chainId, rpcUrl);

  return { address, addressType };
}

/**
 * Get a human-readable label for an address type
 */
export function getAddressTypeLabel(type: AddressType): string {
  switch (type) {
    case "account":
      return "Account (EOA)";
    case "contract":
      return "Contract";
    case "erc20":
      return "ERC-20 Token";
    case "erc721":
      return "ERC-721 NFT";
    case "erc1155":
      return "ERC-1155 Multi-Token";
    default:
      return "Unknown";
  }
}

/**
 * Get an icon/emoji for an address type
 */
export function getAddressTypeIcon(type: AddressType): string {
  switch (type) {
    case "account":
      return "👤";
    case "contract":
      return "📄";
    case "erc20":
      return "🪙";
    case "erc721":
      return "🖼️";
    case "erc1155":
      return "📦";
    default:
      return "❓";
  }
}
