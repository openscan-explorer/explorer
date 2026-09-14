import type { Page } from "@playwright/test";
import { BLOCK_3483400 } from "../../src/services/adapters/ZcashAdapter/fixtures";
import { mockJsonRpc } from "./rpcMock";

/** The built-in Zcash RPC defaults are Tatum's gateways, so every Zcash request matches this */
export const ZCASH_RPC_PATTERN = /zcash-(mainnet|testnet)(-zebrad)?\.gateway\.tatum\.io/;

export const ZCASH = {
  networkSlug: "zec",
  tipHeight: BLOCK_3483400.height,
  mempoolSize: 9,
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

/**
 * Serve a Zcash chain whose tip is mainnet block 3,483,400 and record every Zcash RPC call
 * the page makes, including methods that are not mocked.
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
      return isTip && verbosity === 2 ? BLOCK_3483400 : blockSummary(Number(hashOrHeight));
    },
  });

  return calls;
}
