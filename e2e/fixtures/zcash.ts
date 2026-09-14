import type { Page } from "@playwright/test";
import { BLOCK_3483400 } from "../../src/services/adapters/ZcashAdapter/fixtures";
import { mockJsonRpc } from "./rpcMock";

/** The built-in Zcash RPC defaults are Tatum's gateways, so every Zcash request matches this */
export const ZCASH_RPC_PATTERN = /zcash-(mainnet|testnet)(-zebrad)?\.gateway\.tatum\.io/;

const T_ADDRESS = "t1KAuVfS2r2hc7RwSh6GTuyfqCGMFEpwkZ2";
const PREVIOUS_OUTPUT_ZAT = 30_000;

// Synthetic transparent transaction added to the tip block: two inputs, each resolving to a
// 0.0003 ZEC previous output, into one 0.0005 ZEC output, so its fee is 0.0001 ZEC
const TRANSPARENT_TX = {
  txid: "7".repeat(64),
  version: 4,
  versiongroupid: "892f2085",
  locktime: 0,
  expiryheight: 3483440,
  size: 372,
  height: BLOCK_3483400.height,
  confirmations: BLOCK_3483400.confirmations,
  time: BLOCK_3483400.time,
  blocktime: BLOCK_3483400.time,
  blockhash: BLOCK_3483400.hash,
  valueBalance: 0,
  valueBalanceZat: 0,
  vin: [
    { txid: "a1".repeat(32), vout: 0, sequence: 4294967295 },
    { txid: "b2".repeat(32), vout: 1, sequence: 4294967295 },
  ],
  vout: [
    {
      value: 0.0005,
      valueZat: 50_000,
      n: 0,
      scriptPubKey: { type: "pubkeyhash", addresses: [T_ADDRESS] },
    },
  ],
  vShieldedSpend: [],
  vShieldedOutput: [],
  vjoinsplit: [],
};

const TIP_BLOCK = { ...BLOCK_3483400, tx: [...BLOCK_3483400.tx, TRANSPARENT_TX] };
const KNOWN_TRANSACTIONS = new Map(TIP_BLOCK.tx.map((tx) => [tx.txid, tx]));

export const ZCASH = {
  networkSlug: "zec",
  tipHeight: BLOCK_3483400.height,
  mempoolSize: 9,
  transparentTxid: TRANSPARENT_TX.txid,
} as const;

// Mainnet value pools at block 3,483,461, in zatoshis
const VALUE_POOLS: Array<[string, number]> = [
  ["transparent", 1_197_461_726_829_416],
  ["sprout", 2_259_146_261_837],
  ["sapling", 51_144_292_792_244],
  ["orchard", 41_719_811_959_765],
  ["lockbox", 6_319_912_500_000],
  ["ironwood", 394_349_188_711_218],
];
const CHAIN_SUPPLY_ZAT = 1_693_254_079_054_480;

export interface RecordedRpcCall {
  method: string;
  params: unknown[];
}

/** Earlier blocks reuse the tip's header with their own height and hash */
function blockSummary(height: number) {
  return {
    ...BLOCK_3483400,
    height,
    hash: height.toString(16).padStart(64, "0"),
    confirmations: ZCASH.tipHeight - height + 1,
    tx: [height.toString(16).padStart(64, "f")],
  };
}

/** Any unknown txid is served as a previous transaction with 20 outputs of 0.0003 ZEC */
function previousTransaction(txid: string) {
  return {
    txid,
    version: 4,
    size: 225,
    locktime: 0,
    height: ZCASH.tipHeight - 400,
    confirmations: 401,
    blockhash: "0".repeat(64),
    vin: [],
    vout: Array.from({ length: 20 }, (_, n) => ({
      value: PREVIOUS_OUTPUT_ZAT / 1e8,
      valueZat: PREVIOUS_OUTPUT_ZAT,
      n,
      scriptPubKey: { type: "pubkeyhash", addresses: [T_ADDRESS] },
    })),
    vShieldedSpend: [],
    vShieldedOutput: [],
    vjoinsplit: [],
  };
}

/**
 * Serve a Zcash chain whose tip is mainnet block 3,483,400 (plus one synthetic transparent
 * transaction) and record every Zcash RPC call the page makes, including unmocked methods.
 */
export async function mockZcashRpc(page: Page): Promise<RecordedRpcCall[]> {
  const calls: RecordedRpcCall[] = [];
  page.on("request", (request) => {
    if (request.method() !== "POST" || !ZCASH_RPC_PATTERN.test(request.url())) return;
    try {
      const body = JSON.parse(request.postData() ?? "{}");
      calls.push({ method: body.method, params: body.params ?? [] });
    } catch {
      // Not a JSON-RPC body
    }
  });

  await mockJsonRpc(page, ZCASH_RPC_PATTERN, {
    getblockcount: { result: ZCASH.tipHeight },
    getblockchaininfo: {
      result: {
        chain: "main",
        blocks: ZCASH.tipHeight,
        headers: ZCASH.tipHeight,
        bestblockhash: BLOCK_3483400.hash,
        difficulty: BLOCK_3483400.difficulty,
        estimatedheight: ZCASH.tipHeight,
        verificationprogress: 1,
        chainSupply: {
          chainValue: CHAIN_SUPPLY_ZAT / 1e8,
          chainValueZat: CHAIN_SUPPLY_ZAT,
          monitored: true,
        },
        valuePools: VALUE_POOLS.map(([id, chainValueZat]) => ({
          id,
          chainValue: chainValueZat / 1e8,
          chainValueZat,
          monitored: true,
        })),
      },
    },
    getmempoolinfo: { result: { size: ZCASH.mempoolSize, bytes: 4_512, usage: 9_000 } },
    getblock: (params) => {
      const [hashOrHeight, verbosity] = params as [string, number];
      const isTip =
        hashOrHeight === String(ZCASH.tipHeight) || hashOrHeight === BLOCK_3483400.hash;
      if (isTip) {
        return verbosity === 2 ? TIP_BLOCK : { ...TIP_BLOCK, tx: TIP_BLOCK.tx.map((tx) => tx.txid) };
      }
      const summary = blockSummary(Number(hashOrHeight));
      return verbosity === 2 ? { ...summary, tx: [] } : summary;
    },
    getrawtransaction: (params) => {
      const [txid] = params as [string];
      return KNOWN_TRANSACTIONS.get(txid) ?? previousTransaction(txid);
    },
  });

  return calls;
}
