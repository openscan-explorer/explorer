import { describe, expect, it } from "vitest";
import type { ZcashAddress, ZcashBlock, ZcashTransaction } from "../../../types";
import {
  buildAddressAnalysisContext,
  buildBlockAnalysisContext,
  buildTransactionAnalysisContext,
} from "./aiContext";

const T_ADDRESS = "t1KAuVfS2r2hc7RwSh6GTuyfqCGMFEpwkZ2";

// Mainnet tx 36a167f6…ce2e3, block 3,483,400
const ironwoodOnly: ZcashTransaction = {
  txid: "36a167f602a15015593130974e0942179e7e394e0e0e6e239752533e2b5ce2e3",
  version: 6,
  size: 9_170,
  locktime: 0,
  expiryHeight: 3483438,
  vin: [],
  vout: [],
  shielded: { ironwood: { actions: 2, valueBalanceZat: 10_000 } },
  blockhash: "0".repeat(64),
  blockheight: 3483400,
  confirmations: 66,
};

describe("buildTransactionAnalysisContext", () => {
  it("describes a fully shielded transaction with its fee in ZEC", () => {
    const context = buildTransactionAnalysisContext(ironwoodOnly);

    expect(context).toMatchObject({
      status: "confirmed",
      kind: "shielded",
      pools: ["ironwood"],
      transparentInputCount: 0,
      transparentOutputCount: 0,
      feeZEC: 0.0001,
      shieldedBundles: { ironwood: { actions: 2, valueBalanceZEC: 0.0001 } },
    });
    expect(context.transparentInputsZEC).toBeUndefined();
  });

  it("leaves the fee out while transparent input values are unknown", () => {
    const context = buildTransactionAnalysisContext({
      ...ironwoodOnly,
      vin: [{ txid: "a".repeat(64), vout: 0, sequence: 0 }],
      shielded: { sapling: { spends: 0, outputs: 2, valueBalanceZat: -500_000 } },
      blockhash: undefined,
      confirmations: undefined,
    });

    expect(context).toMatchObject({ status: "unconfirmed (in mempool)", kind: "shielding" });
    expect(context.feeZEC).toBeUndefined();
  });
});

describe("buildTransactionAnalysisContext for Sprout", () => {
  it("reports JoinSplit public values and the fee once inputs are known", () => {
    const sprout: ZcashTransaction = {
      txid: "5".repeat(64),
      version: 2,
      size: 1_802,
      locktime: 0,
      vin: [{ txid: "a".repeat(64), vout: 0, sequence: 0, valueZat: 30_000 }],
      vout: [],
      shielded: { sprout: { joinSplits: 1, vpubOldZat: 20_000, vpubNewZat: 0 } },
    };

    expect(buildTransactionAnalysisContext(sprout)).toMatchObject({
      kind: "shielding",
      pools: ["transparent", "sprout"],
      isCoinbase: false,
      feeZEC: 0.0001,
      shieldedBundles: { sprout: { joinSplits: 1, enteredSproutZEC: 0.0002, leftSproutZEC: 0 } },
    });
  });
});

describe("buildBlockAnalysisContext", () => {
  it("converts the coinbase outputs and value pools to ZEC", () => {
    const block: ZcashBlock = {
      hash: "0".repeat(64),
      height: 3483400,
      time: 1789411472,
      nTx: 18,
      size: 84_186,
      version: 4,
      merkleRoot: "0".repeat(64),
      bits: "1c008816",
      nonce: "a9a1",
      difficulty: 252_490_000,
      coinbaseOutputs: [
        { address: "t1SqwRAAdSig6dE4EBPLonAait219VmkUjP", valueZat: 125_490_751 },
        { address: "t3cFfPt1Bcvgez9ZbMBFWeZsskxTkPzGCow", valueZat: 12_500_000 },
      ],
      shieldedTxCounts: { sapling: 2, ironwood: 2 },
      valuePools: [{ id: "sapling", valueZat: 51_144_292_792_244 }],
    };

    expect(buildBlockAnalysisContext(block)).toMatchObject({
      transactionCount: 18,
      coinbaseTotalZEC: 1.37990751,
      coinbaseShieldedZEC: undefined,
      shieldedTransactionCounts: { sapling: 2, ironwood: 2 },
      valuePoolsZEC: { sapling: 511442.92792244 },
    });
  });
});

describe("buildBlockAnalysisContext for a shielded coinbase", () => {
  it("includes the reward paid into the shielded pools", () => {
    const block: ZcashBlock = {
      hash: "0".repeat(64),
      height: 3483401,
      time: 1789411547,
      nTx: 1,
      size: 2_000,
      version: 4,
      merkleRoot: "0".repeat(64),
      bits: "1c008816",
      nonce: "a9a1",
      difficulty: 252_490_000,
      coinbaseOutputs: [{ address: "t3cFfPt1Bcvgez9ZbMBFWeZsskxTkPzGCow", valueZat: 12_500_000 }],
      coinbaseShieldedZat: 125_490_751,
    };

    expect(buildBlockAnalysisContext(block)).toMatchObject({
      coinbaseTotalZEC: 1.37990751,
      coinbaseShieldedZEC: 1.25490751,
    });
  });
});

describe("buildAddressAnalysisContext", () => {
  it("reports a blocked address index instead of a zero balance", () => {
    const address: ZcashAddress = {
      address: T_ADDRESS,
      type: "p2pkh",
      transparentAddress: T_ADDRESS,
      balance: { availability: "unsupported" },
      utxos: { availability: "unsupported" },
      txids: { availability: "unsupported" },
    };

    const context = buildAddressAnalysisContext(address);

    expect(context).toMatchObject({
      addressType: "p2pkh",
      addressIndex: {
        balance: "unsupported",
        unspentOutputs: "unsupported",
        history: "unsupported",
      },
    });
    expect(context.transparentBalanceZEC).toBeUndefined();
    expect(context.transparentReceiver).toBeUndefined();
  });

  it("describes a unified address through its transparent receiver, newest transactions first", () => {
    const context = buildAddressAnalysisContext({
      address: `u1${"q".repeat(100)}`,
      type: "unified",
      transparentAddress: T_ADDRESS,
      receivers: { availability: "ok", data: { orchard: `u1${"p".repeat(60)}`, p2pkh: T_ADDRESS } },
      balance: { availability: "ok", data: { balanceZat: 9_514_810 } },
      txids: { availability: "ok", data: ["older", "newer"] },
    });

    expect(context).toMatchObject({
      transparentReceiver: T_ADDRESS,
      receiverTypes: ["orchard", "p2pkh"],
      transparentBalanceZEC: 0.0951481,
      recentTxids: ["newer", "older"],
    });
  });
});
