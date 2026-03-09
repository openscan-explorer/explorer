import { describe, expect, it } from "vitest";
import {
  checkEIP7702Delegation,
  getAddressTypeIcon,
  getAddressTypeLabel,
  getEIP7702DelegateAddress,
  hasContractCode,
} from "./addressTypeDetection";

describe("hasContractCode", () => {
  it("returns false for null/undefined/empty", () => {
    expect(hasContractCode(null)).toBe(false);
    expect(hasContractCode(undefined)).toBe(false);
    expect(hasContractCode("")).toBe(false);
  });

  it('returns false for empty code variants ("0x", "0x0", "0x00")', () => {
    expect(hasContractCode("0x")).toBe(false);
    expect(hasContractCode("0x0")).toBe(false);
    expect(hasContractCode("0x00")).toBe(false);
    expect(hasContractCode("0x000")).toBe(false);
  });

  it("returns true for real contract bytecode", () => {
    expect(hasContractCode("0x6080604052")).toBe(true);
    // Minimal non-empty code
    expect(hasContractCode("0x01")).toBe(true);
    expect(hasContractCode("0xfe")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(hasContractCode("0x6080604052")).toBe(true);
    expect(hasContractCode("0X6080604052")).toBe(true);
    expect(hasContractCode("0xFE")).toBe(true);
  });
});

describe("checkEIP7702Delegation", () => {
  it("detects valid EIP-7702 delegation designator", () => {
    // 0xef0100 + 20-byte address = 48 chars total
    const delegation = "0xef0100" + "1234567890abcdef1234567890abcdef12345678";
    expect(checkEIP7702Delegation(delegation)).toBe(true);
  });

  it("rejects non-delegation code", () => {
    expect(checkEIP7702Delegation("0x6080604052")).toBe(false);
    expect(checkEIP7702Delegation(null)).toBe(false);
    expect(checkEIP7702Delegation("0xef0100")).toBe(false); // too short
  });
});

describe("getEIP7702DelegateAddress", () => {
  it("extracts address from valid delegation", () => {
    const addr = "1234567890abcdef1234567890abcdef12345678";
    const delegation = `0xef0100${addr}`;
    expect(getEIP7702DelegateAddress(delegation)).toBe(`0x${addr}`);
  });

  it("returns null for non-delegation", () => {
    expect(getEIP7702DelegateAddress("0x6080604052")).toBeNull();
    expect(getEIP7702DelegateAddress(null)).toBeNull();
  });
});

describe("getAddressTypeLabel", () => {
  it("returns correct labels", () => {
    expect(getAddressTypeLabel("account")).toBe("Account (EOA)");
    expect(getAddressTypeLabel("contract")).toBe("Contract");
    expect(getAddressTypeLabel("erc20")).toBe("ERC-20 Token");
    expect(getAddressTypeLabel("erc721")).toBe("ERC-721 NFT");
    expect(getAddressTypeLabel("erc1155")).toBe("ERC-1155 Multi-Token");
  });
});

describe("getAddressTypeIcon", () => {
  it("returns correct icons", () => {
    expect(getAddressTypeIcon("account")).toBe("👤");
    expect(getAddressTypeIcon("contract")).toBe("📄");
    expect(getAddressTypeIcon("erc20")).toBe("🪙");
  });
});
