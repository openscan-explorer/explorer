import { describe, expect, it } from "vitest";
import type { ZcashTransaction } from "../types";
import {
  classifyRpcErrors,
  classifyTransaction,
  computeFee,
  detectZcashAddressType,
  getShieldedNetZat,
  getShieldedSupplyPercent,
  getTransactionPools,
  isZcashAddress,
  normalizeZcashAddress,
  zecToZat,
} from "./zcashUtils";

function tx(overrides: Partial<ZcashTransaction>): ZcashTransaction {
  return {
    txid: "a".repeat(64),
    version: 5,
    size: 0,
    locktime: 0,
    vin: [],
    vout: [],
    shielded: {},
    ...overrides,
  };
}

const input = (valueZat?: number) => ({
  txid: "b".repeat(64),
  vout: 0,
  sequence: 0xffffffff,
  valueZat,
});

const output = (n: number, valueZat: number) => ({
  n,
  valueZat,
  address: "t1KAuVfS2r2hc7RwSh6GTuyfqCGMFEpwkZ2",
  scriptType: "pubkeyhash",
});

describe("detectZcashAddressType", () => {
  it.each([
    ["t1KAuVfS2r2hc7RwSh6GTuyfqCGMFEpwkZ2", "p2pkh"],
    [`tm${"a".repeat(33)}`, "p2pkh"],
    ["t3cFfPt1Bcvgez9ZbMBFWeZsskxTkPzGCow", "p2sh"],
    [`t2${"a".repeat(33)}`, "p2sh"],
    [`zc${"a".repeat(93)}`, "sprout"],
    [`zt${"a".repeat(93)}`, "sprout"],
    [`zs1${"q".repeat(75)}`, "sapling"],
    [`ztestsapling1${"q".repeat(75)}`, "sapling"],
    [`tex1${"q".repeat(38)}`, "tex"],
    [`textest1${"q".repeat(38)}`, "tex"],
    [`u1${"q".repeat(100)}`, "unified"],
    [`utest1${"q".repeat(100)}`, "unified"],
  ])("detects %s as %s", (address, type) => {
    expect(detectZcashAddressType(address)).toBe(type);
    expect(isZcashAddress(address)).toBe(true);
  });

  it.each([
    ["t1KAuVfS2r2hc7RwSh6GTuyfqCGMFEpwkZ2", "mainnet", "p2pkh"],
    ["t1KAuVfS2r2hc7RwSh6GTuyfqCGMFEpwkZ2", "testnet", "unknown"],
    [`tm${"a".repeat(33)}`, "testnet", "p2pkh"],
    [`tm${"a".repeat(33)}`, "mainnet", "unknown"],
    [`utest1${"q".repeat(100)}`, "mainnet", "unknown"],
    [`ztestsapling1${"q".repeat(75)}`, "testnet", "sapling"],
    [`zs1${"q".repeat(75)}`, "testnet", "unknown"],
  ] as const)("detects %s on %s as %s", (address, network, type) => {
    expect(detectZcashAddressType(address, network)).toBe(type);
  });

  it("accepts all-uppercase Bech32m addresses and normalizes them to lowercase", () => {
    const unified = `u1${"q".repeat(100)}`;
    expect(detectZcashAddressType(unified.toUpperCase())).toBe("unified");
    expect(detectZcashAddressType(`ZS1${"Q".repeat(75)}`, "mainnet")).toBe("sapling");
    expect(normalizeZcashAddress(unified.toUpperCase())).toBe(unified);
  });

  it("keeps Base58 addresses case-sensitive", () => {
    const transparent = "t1KAuVfS2r2hc7RwSh6GTuyfqCGMFEpwkZ2";
    expect(detectZcashAddressType(transparent.toUpperCase())).toBe("unknown");
    expect(normalizeZcashAddress(transparent)).toBe(transparent);
  });

  it.each([
    "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "t1KAuVfS2r2hc7RwSh6GTuyfqCGMFEpwkZ", // one character short
    `zs1${"b".repeat(75)}`, // "b" is outside the bech32 alphabet
    "",
  ])("rejects %s", (address) => {
    expect(detectZcashAddressType(address)).toBe("unknown");
    expect(isZcashAddress(address)).toBe(false);
  });
});

describe("classifyTransaction and computeFee", () => {
  it("handles a fully shielded Ironwood transaction with empty vin and vout", () => {
    // Mainnet tx 36a167f6…ce2e3, block 3,483,400
    const ironwoodOnly = tx({ shielded: { ironwood: { actions: 2, valueBalanceZat: 10_000 } } });

    expect(classifyTransaction(ironwoodOnly)).toBe("shielded");
    expect(getTransactionPools(ironwoodOnly)).toEqual(["ironwood"]);
    expect(computeFee(ironwoodOnly)).toEqual({ kind: "known", zat: 10_000 });
  });

  it("nets value balances across Sapling and Ironwood", () => {
    // Mainnet tx c973d2f1…4aa7db, block 3,483,400
    const saplingIronwood = tx({
      shielded: {
        sapling: { spends: 0, outputs: 2, valueBalanceZat: -3_000_000 },
        ironwood: { actions: 2, valueBalanceZat: 3_020_000 },
      },
    });

    expect(classifyTransaction(saplingIronwood)).toBe("shielded");
    expect(getTransactionPools(saplingIronwood)).toEqual(["sapling", "ironwood"]);
    expect(computeFee(saplingIronwood)).toEqual({ kind: "known", zat: 20_000 });
  });

  it("needs every transparent input value before computing a shielding fee", () => {
    const shielding = tx({
      vin: [input(), input()],
      shielded: { sapling: { spends: 0, outputs: 2, valueBalanceZat: -1_877_663_138 } },
    });

    expect(classifyTransaction(shielding)).toBe("shielding");
    expect(computeFee(shielding)).toEqual({ kind: "unknown" });
    expect(computeFee({ ...shielding, vin: [input(1_000_000_000), input()] })).toEqual({
      kind: "unknown",
    });
    expect(computeFee({ ...shielding, vin: [input(1_000_000_000), input(877_673_138)] })).toEqual({
      kind: "known",
      zat: 10_000,
    });
  });

  it("classifies deshielding, mixed and transparent transactions", () => {
    const ironwood = { actions: 1, valueBalanceZat: 25_010_000 };
    expect(classifyTransaction(tx({ vout: [output(0, 25_000_000)], shielded: { ironwood } }))).toBe(
      "deshielding",
    );
    expect(
      classifyTransaction(tx({ vin: [input(5)], vout: [output(0, 1)], shielded: { ironwood } })),
    ).toBe("mixed");

    const transparent = tx({ vin: [input(50_000)], vout: [output(0, 30_000), output(1, 10_000)] });
    expect(classifyTransaction(transparent)).toBe("transparent");
    expect(getTransactionPools(transparent)).toEqual(["transparent"]);
    expect(computeFee(transparent)).toEqual({ kind: "known", zat: 10_000 });
  });

  it("does not compute a fee for coinbase transactions", () => {
    const coinbase = tx({
      vin: [{ coinbase: "0308273504", sequence: 0xffffffff }],
      vout: [output(0, 125_490_751), output(1, 12_500_000)],
    });

    expect(classifyTransaction(coinbase)).toBe("coinbase");
    expect(computeFee(coinbase)).toEqual({ kind: "coinbase" });
  });

  it("accounts for Sprout JoinSplit public values", () => {
    const sprout = tx({
      vin: [input(100_000)],
      shielded: { sprout: { joinSplits: 1, vpubOldZat: 90_000, vpubNewZat: 0 } },
    });

    expect(classifyTransaction(sprout)).toBe("shielding");
    expect(computeFee(sprout)).toEqual({ kind: "known", zat: 10_000 });
  });

  it("nets value moving into and out of every shielded pool", () => {
    const multiPool = tx({
      shielded: {
        sprout: { joinSplits: 1, vpubOldZat: 0, vpubNewZat: 50_000 },
        sapling: { spends: 1, outputs: 0, valueBalanceZat: 20_000 },
        orchard: { actions: 2, valueBalanceZat: -40_000 },
        ironwood: { actions: 1, valueBalanceZat: 5_000 },
      },
    });

    expect(getShieldedNetZat(multiPool)).toBe(35_000);
  });
});

describe("classifyRpcErrors", () => {
  it("reports unsupported when every endpoint rejects the method", () => {
    expect(
      classifyRpcErrors([
        "RPC error: Method not found: getaddressbalance",
        "RPC error: Method not found: getaddressbalance",
      ]),
    ).toBe("unsupported");
  });

  it("reports rate limiting when no endpoint gave a definitive answer", () => {
    expect(
      classifyRpcErrors(["HTTP error! status: 429", "RPC error: Method not found: getblock"]),
    ).toBe("rateLimited");
    expect(classifyRpcErrors(["HTTP error! status: 429", "HTTP error! status: 502"])).toBe(
      "rateLimited",
    );
  });

  it("prefers a definitive answer over a rate-limited endpoint", () => {
    // A self-hosted node says the transaction doesn't exist while a hosted gateway returns 429
    expect(
      classifyRpcErrors([
        "RPC error: No such mempool or main chain transaction",
        "HTTP error! status: 429",
      ]),
    ).toBe("failed");
  });

  it("reports unsupported only when every endpoint rejects the method", () => {
    expect(
      classifyRpcErrors(["RPC error: Method not found: getaddressbalance", "Failed to fetch"]),
    ).toBe("failed");
  });

  it("reports other failures as failed", () => {
    expect(classifyRpcErrors(["RPC error: No such mempool or main chain transaction"])).toBe(
      "failed",
    );
    expect(classifyRpcErrors([])).toBe("failed");
  });
});

describe("zecToZat", () => {
  it("rounds away floating point drift", () => {
    expect(zecToZat(18.77663138)).toBe(1_877_663_138);
    expect(zecToZat(0.0001)).toBe(10_000);
  });
});

describe("getShieldedSupplyPercent", () => {
  it("sums the shielded pools but not transparent or lockbox funds", () => {
    const percent = getShieldedSupplyPercent({
      chainSupplyZat: 1_000,
      valuePools: [
        { id: "transparent", valueZat: 600 },
        { id: "sprout", valueZat: 10 },
        { id: "sapling", valueZat: 100 },
        { id: "orchard", valueZat: 90 },
        { id: "lockbox", valueZat: 50 },
        { id: "ironwood", valueZat: 150 },
      ],
    });

    expect(percent).toBe(35);
  });

  it("returns null when the chain supply is unknown", () => {
    expect(getShieldedSupplyPercent({ chainSupplyZat: undefined, valuePools: [] })).toBeNull();
  });
});
