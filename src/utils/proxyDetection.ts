import { logger } from "./logger";

export type ProxyType =
  | "EIP-1967 Transparent"
  | "EIP-1967 UUPS"
  | "EIP-1967-Beacon"
  | "EIP-1822"
  | "EIP-1167"
  | "Transparent (Legacy)";

export interface ProxyInfo {
  type: ProxyType;
  implementationAddress: string;
}

/** Minimal RPC interface required for proxy detection. Satisfied by NetworkAdapter. */
export interface ProxyRpcClient {
  getStorageAt(address: string, slot: string): Promise<string>;
  callContract(to: string, data: string): Promise<string>;
}

// EIP-1967 implementation slot: keccak256("eip1967.proxy.implementation") - 1
const EIP1967_IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
// EIP-1967 admin slot: keccak256("eip1967.proxy.admin") - 1
// Non-zero → Transparent Proxy; zero with impl set → UUPS
const EIP1967_ADMIN_SLOT = "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
// Legacy OZ admin slot: keccak256("org.zeppelinos.proxy.admin")
// Used by Aave V2 and other proxies that mix EIP-1967 impl slot with older admin slot
const OZ_LEGACY_ADMIN_SLOT = "0x10d6a54a4754c8869d6886b5f5d7fbfa5b4522237ea5c60d11bc4e7a1ff9390b";
// EIP-1967 beacon slot: keccak256("eip1967.proxy.beacon") - 1
const EIP1967_BEACON_SLOT = "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50";
// EIP-1822 (UUPS) slot: keccak256("PROXIABLE") — legacy UUPS, pre-OZ v4
const EIP1822_SLOT = "0xc5f16f0fcc639fa48a6947836d9850f504798523bf8c9a3a87d5876cf622bcf7";
// Legacy OpenZeppelin AdminUpgradeabilityProxy: keccak256("org.zeppelinos.proxy.implementation")
// Used by Circle USDC (FiatTokenProxy) and other pre-EIP-1967 OZ proxies
const OZ_LEGACY_IMPL_SLOT = "0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3";

const ZERO_SLOT = `0x${"0".repeat(64)}`;

// EIP-1167 minimal proxy bytecode pattern
const EIP1167_PATTERN = /^0x363d3d373d3d3d363d73([0-9a-f]{40})5af43d/i;

// beacon.implementation() selector
const BEACON_IMPL_SELECTOR = "0x5c60da1b";

/**
 * Extract a 20-byte address from a 32-byte storage slot value.
 * Solidity stores addresses right-aligned (left-padded with zeros).
 * Returns null if the slot value doesn't look like a packed address
 * (i.e. if the upper 12 bytes are not all zero — a valid ABI-encoded
 * address always has leading zeros in those bytes).
 */
function slotToAddress(slot: string): string | null {
  const hex = slot.replace(/^0x/, "");
  if (hex.length !== 64) return null;
  // Upper 12 bytes (24 hex chars) must be zero for a valid address slot
  const prefix = hex.slice(0, 24);
  if (!/^0+$/.test(prefix)) return null;
  const addr = `0x${hex.slice(24)}`;
  if (/^0x0{40}$/.test(addr)) return null; // zero address
  return addr;
}

function isNonZeroSlot(val: string): boolean {
  return val !== "0x" && val !== ZERO_SLOT;
}

export async function detectProxy(
  address: string,
  client: ProxyRpcClient,
  bytecode: string,
): Promise<ProxyInfo | null> {
  // Check all storage slots in parallel to minimise latency
  const [implVal, adminVal, legacyAdminVal, uupsVal, beaconVal, legacyVal] = await Promise.all([
    client.getStorageAt(address, EIP1967_IMPL_SLOT).catch(() => "0x"),
    client.getStorageAt(address, EIP1967_ADMIN_SLOT).catch(() => "0x"),
    client.getStorageAt(address, OZ_LEGACY_ADMIN_SLOT).catch(() => "0x"),
    client.getStorageAt(address, EIP1822_SLOT).catch(() => "0x"),
    client.getStorageAt(address, EIP1967_BEACON_SLOT).catch(() => "0x"),
    client.getStorageAt(address, OZ_LEGACY_IMPL_SLOT).catch(() => "0x"),
  ]);

  // 1. EIP-1967: distinguish Transparent vs UUPS via admin slots.
  //    Modern UUPS (OZ v4+) uses the EIP-1967 impl slot but has no admin slot.
  //    Transparent proxies have a non-zero admin (EIP-1967 or legacy OZ admin slot).
  //    e.g. Aave V2 uses EIP-1967 impl slot + legacy OZ admin slot.
  if (isNonZeroSlot(implVal)) {
    const addr = slotToAddress(implVal);
    if (addr) {
      const hasAdmin = isNonZeroSlot(adminVal) || isNonZeroSlot(legacyAdminVal);
      const type = hasAdmin ? "EIP-1967 Transparent" : "EIP-1967 UUPS";
      return { type, implementationAddress: addr };
    }
  }

  // 2. Legacy EIP-1822 UUPS slot (pre-OZ v4, stores impl at keccak256("PROXIABLE"))
  if (isNonZeroSlot(uupsVal)) {
    const addr = slotToAddress(uupsVal);
    if (addr) return { type: "EIP-1822", implementationAddress: addr };
  }

  // 3. EIP-1967 beacon proxy — resolve beacon then call implementation()
  if (isNonZeroSlot(beaconVal)) {
    const beaconAddr = slotToAddress(beaconVal);
    if (beaconAddr) {
      try {
        const result = await client.callContract(beaconAddr, BEACON_IMPL_SELECTOR);
        if (result && result !== "0x") {
          const implAddr = slotToAddress(result);
          if (implAddr) return { type: "EIP-1967-Beacon", implementationAddress: implAddr };
        }
      } catch (err) {
        logger.warn("beacon implementation() call failed:", err);
      }
    }
  }

  // 4. Legacy OZ AdminUpgradeabilityProxy (pre-EIP-1967) — used by Circle USDC
  if (isNonZeroSlot(legacyVal)) {
    const addr = slotToAddress(legacyVal);
    if (addr) return { type: "Transparent (Legacy)", implementationAddress: addr };
  }

  // 5. EIP-1167 minimal proxy — detect via bytecode pattern
  const eip1167Match = bytecode.match(EIP1167_PATTERN);
  if (eip1167Match?.[1]) {
    return { type: "EIP-1167", implementationAddress: `0x${eip1167Match[1]}` };
  }

  return null;
}
