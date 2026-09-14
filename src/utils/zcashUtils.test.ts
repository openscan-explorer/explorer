import { describe, expect, it } from "vitest";
import type { ZcashTransaction } from "../types";
import {
  classifyRpcErrors,
  classifyTransaction,
  computeFeeZat,
  countPreviousTransactions,
  detectZcashAddressType,
  getShieldedSupplyPercent,
  getTransactionPools,
  isZcashAddress,
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

describe("classifyTransaction and computeFeeZat", () => {
  it("handles a fully shielded Ironwood transaction with empty vin and vout", () => {
    // Mainnet tx 36a167f6…ce2e3, block 3,483,400
    const ironwoodOnly = tx({ shielded: { ironwood: { actions: 2, valueBalanceZat: 10_000 } } });

    expect(classifyTransaction(ironwoodOnly)).toBe("shielded");
    expect(getTransactionPools(ironwoodOnly)).toEqual(["ironwood"]);
    expect(computeFeeZat(ironwoodOnly)).toBe(10_000);
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
    expect(computeFeeZat(saplingIronwood)).toBe(20_000);
  });

  it("needs every transparent input value before computing a shielding fee", () => {
    const shielding = tx({
      vin: [input(), input()],
      shielded: { sapling: { spends: 0, outputs: 2, valueBalanceZat: -1_877_663_138 } },
    });

    expect(classifyTransaction(shielding)).toBe("shielding");
    expect(computeFeeZat(shielding)).toBeNull();
    expect(computeFeeZat({ ...shielding, vin: [input(1_000_000_000), input()] })).toBeNull();
    expect(computeFeeZat({ ...shielding, vin: [input(1_000_000_000), input(877_673_138)] })).toBe(
      10_000,
    );
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
    expect(computeFeeZat(transparent)).toBe(10_000);
  });

  it("does not compute a fee for coinbase transactions", () => {
    const coinbase = tx({
      vin: [{ coinbase: "0308273504", sequence: 0xffffffff }],
      vout: [output(0, 125_490_751), output(1, 12_500_000)],
    });

    expect(classifyTransaction(coinbase)).toBe("coinbase");
    expect(computeFeeZat(coinbase)).toBeNull();
  });

  it("accounts for Sprout JoinSplit public values", () => {
    const sprout = tx({
      vin: [input(100_000)],
      shielded: { sprout: { joinSplits: 1, vpubOldZat: 90_000, vpubNewZat: 0 } },
    });

    expect(classifyTransaction(sprout)).toBe("shielding");
    expect(computeFeeZat(sprout)).toBe(10_000);
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

  it("reports rate limiting when any endpoint returns 429", () => {
    expect(
      classifyRpcErrors(["HTTP error! status: 429", "RPC error: Method not found: getblock"]),
    ).toBe("rateLimited");
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

describe("countPreviousTransactions", () => {
  it("counts each spent transaction once and ignores coinbase inputs", () => {
    const spending = tx({
      vin: [
        { txid: "c".repeat(64), vout: 0, sequence: 0 },
        { txid: "c".repeat(64), vout: 1, sequence: 0 },
        { txid: "d".repeat(64), vout: 0, sequence: 0 },
      ],
    });
    const coinbase = tx({ vin: [{ coinbase: "03", sequence: 0 }] });

    expect(countPreviousTransactions(spending)).toBe(2);
    expect(countPreviousTransactions(coinbase)).toBe(0);
  });
});
