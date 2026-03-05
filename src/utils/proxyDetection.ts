import { logger } from "./logger";

export type ProxyType = "EIP-1967" | "EIP-1967-Beacon" | "EIP-1822" | "EIP-1167";

export interface ProxyInfo {
  type: ProxyType;
  implementationAddress: string;
}

// Storage slots
const EIP1967_IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
const EIP1967_BEACON_SLOT = "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50";
const EIP1822_SLOT = "0xc5f16f0fcc639fa48a6947836d9850f504798523bf8c9a3a87d5876cf622bcf7";
const ZERO_SLOT = `0x${"0".repeat(64)}`;

// EIP-1167 minimal proxy bytecode pattern
const EIP1167_PATTERN = /^0x363d3d373d3d3d363d73([0-9a-f]{40})5af43d/i;

// beacon.implementation() selector
const BEACON_IMPL_SELECTOR = "0x5c60da1b";

async function getStorageAt(address: string, slot: string, rpcUrl: string): Promise<string | null> {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getStorageAt",
        params: [address, slot, "latest"],
        id: 1,
      }),
    });
    const json = await response.json();
    return json.result ?? null;
  } catch (err) {
    logger.warn("getStorageAt failed:", err);
    return null;
  }
}

function slotToAddress(slot: string): string {
  // Take the last 40 hex chars (20 bytes) and prefix with 0x
  const hex = slot.replace(/^0x/, "").slice(-40);
  return toChecksumAddress(`0x${hex}`);
}

function isZeroAddress(address: string): boolean {
  return /^0x0{40}$/.test(address);
}

function toChecksumAddress(address: string): string {
  // Simple EIP-55 checksum implementation
  const addr = address.toLowerCase().replace("0x", "");
  // Use a simple implementation without external deps
  const chars = addr.split("");
  // We need keccak256 hash of the address - use a simple approximation
  // For display purposes, return the lowercase hex with 0x prefix
  // Full EIP-55 checksum requires keccak256 which we don't have as a pure util here
  return `0x${chars.join("")}`;
}

async function callBeaconImplementation(
  beaconAddress: string,
  rpcUrl: string,
): Promise<string | null> {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_call",
        params: [{ to: beaconAddress, data: BEACON_IMPL_SELECTOR }, "latest"],
        id: 1,
      }),
    });
    const json = await response.json();
    const result: string = json.result;
    if (!result || result === "0x") return null;
    // result is a 32-byte ABI-encoded address
    const implAddr = slotToAddress(result);
    if (isZeroAddress(implAddr)) return null;
    return implAddr;
  } catch (err) {
    logger.warn("callBeaconImplementation failed:", err);
    return null;
  }
}

export async function detectProxy(
  address: string,
  rpcUrl: string,
  bytecode: string,
): Promise<ProxyInfo | null> {
  // 1. EIP-1967 implementation slot
  const implVal = await getStorageAt(address, EIP1967_IMPL_SLOT, rpcUrl);
  if (implVal && implVal !== ZERO_SLOT && implVal !== "0x") {
    const implAddr = slotToAddress(implVal);
    if (!isZeroAddress(implAddr)) {
      return { type: "EIP-1967", implementationAddress: implAddr };
    }
  }

  // 2. EIP-1822 (UUPS) slot
  const uupsVal = await getStorageAt(address, EIP1822_SLOT, rpcUrl);
  if (uupsVal && uupsVal !== ZERO_SLOT && uupsVal !== "0x") {
    const uupsAddr = slotToAddress(uupsVal);
    if (!isZeroAddress(uupsAddr)) {
      return { type: "EIP-1822", implementationAddress: uupsAddr };
    }
  }

  // 3. EIP-1967 Beacon slot
  const beaconVal = await getStorageAt(address, EIP1967_BEACON_SLOT, rpcUrl);
  if (beaconVal && beaconVal !== ZERO_SLOT && beaconVal !== "0x") {
    const beaconAddr = slotToAddress(beaconVal);
    if (!isZeroAddress(beaconAddr)) {
      const beaconImpl = await callBeaconImplementation(beaconAddr, rpcUrl);
      if (beaconImpl) {
        return { type: "EIP-1967-Beacon", implementationAddress: beaconImpl };
      }
    }
  }

  // 4. EIP-1167 minimal proxy (check bytecode)
  const eip1167Match = bytecode.match(EIP1167_PATTERN);
  if (eip1167Match?.[1]) {
    return { type: "EIP-1167", implementationAddress: `0x${eip1167Match[1]}` };
  }

  return null;
}
