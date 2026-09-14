import type { ZcashClient } from "@openscan/network-connectors";
import { describe, expect, it, vi } from "vitest";
import type { ZcashTransaction } from "../../../types";
import { computeFeeZat } from "../../../utils/zcashUtils";
import {
  BLOCK_3483400,
  COINBASE_TX,
  IRONWOOD_ONLY_TX,
  SAPLING_IRONWOOD_TX,
  SHIELDING_TX,
} from "./fixtures";
import { ZcashAdapter, ZcashRpcError } from "./ZcashAdapter";

const NETWORK_ID = "bip122:00040fe8ec8471911baa1db1266ea15d";
const T_ADDRESS = "t1KAuVfS2r2hc7RwSh6GTuyfqCGMFEpwkZ2";
const METHOD_NOT_FOUND = "RPC error: Method not found: getaddressbalance";

const ok = <T>(data: T) => ({ success: true, data });
const fail = (...errors: string[]) => ({
  success: false,
  errors: errors.map((error) => ({
    url: "https://rpc.test",
    status: "error",
    responseTime: 1,
    error,
  })),
});

function createClient() {
  return {
    getBlockCount: vi.fn(),
    getBlockchainInfo: vi.fn(),
    getMempoolInfo: vi.fn(),
    getBlock: vi.fn(),
    getRawTransaction: vi.fn(),
    getRawMempool: vi.fn(),
    getAddressBalance: vi.fn(),
    getAddressUtxos: vi.fn(),
    getAddressTxIds: vi.fn(),
    zListUnifiedReceivers: vi.fn(),
  };
}

function setup() {
  const client = createClient();
  const sleep = vi.fn().mockResolvedValue(undefined);
  const adapter = new ZcashAdapter(NETWORK_ID, client as unknown as ZcashClient, { sleep });
  return { adapter, client, sleep };
}

function findTx(transactions: ZcashTransaction[], txid: string | undefined): ZcashTransaction {
  const match = transactions.find((transaction) => transaction.txid === txid);
  if (!match) throw new Error(`Transaction ${txid} not found`);
  return match;
}

describe("ZcashAdapter blocks", () => {
  it("fetches a block by height as a decimal string with full transactions", async () => {
    const { adapter, client } = setup();
    client.getBlock.mockResolvedValue(ok(BLOCK_3483400));

    const { data } = await adapter.getBlock(3483400);

    expect(client.getBlock).toHaveBeenCalledTimes(1);
    expect(client.getBlock).toHaveBeenCalledWith("3483400", 2);
    expect(data.block).toMatchObject({
      height: 3483400,
      nTx: 18,
      nonce: BLOCK_3483400.nonce,
      trees: { sapling: 73958787, orchard: 50458646, ironwood: 318976 },
      shieldedTxCounts: { sapling: 2, ironwood: 2 },
    });
    expect(data.block.coinbaseOutputs).toEqual([
      { address: "t1SqwRAAdSig6dE4EBPLonAait219VmkUjP", valueZat: 125_490_751 },
      { address: "t3cFfPt1Bcvgez9ZbMBFWeZsskxTkPzGCow", valueZat: 12_500_000 },
    ]);
  });

  it("derives shielded fees from value balances", async () => {
    const { adapter, client } = setup();
    client.getBlock.mockResolvedValue(ok(BLOCK_3483400));

    const { transactions } = (await adapter.getBlock(3483400)).data;

    expect(computeFeeZat(findTx(transactions, IRONWOOD_ONLY_TX.txid))).toBe(10_000);
    expect(computeFeeZat(findTx(transactions, SAPLING_IRONWOOD_TX.txid))).toBe(20_000);
    expect(computeFeeZat(findTx(transactions, SHIELDING_TX.txid))).toBeNull();
    expect(computeFeeZat(findTx(transactions, COINBASE_TX.txid))).toBeNull();
  });

  it("fetches block summaries one at a time and skips blocks that fail", async () => {
    const { adapter, client } = setup();
    const summary = (height: number) => ({ ...BLOCK_3483400, height, tx: ["a".repeat(64)] });
    client.getBlock
      .mockResolvedValueOnce(ok(summary(3483399)))
      .mockResolvedValueOnce(fail("RPC error: Block not found"))
      .mockResolvedValueOnce(ok(summary(3483400)));

    const blocks = await adapter.getBlockSummaries([3483399, 3483398, 3483400]);

    expect(client.getBlock.mock.calls).toEqual([
      ["3483399", 1],
      ["3483398", 1],
      ["3483400", 1],
    ]);
    expect(blocks.map((block) => block.height)).toEqual([3483400, 3483399]);
    expect(blocks[0]?.txids).toEqual(["a".repeat(64)]);
  });
});

describe("ZcashAdapter transactions", () => {
  it("requests verbose transactions with numeric verbosity", async () => {
    const { adapter, client } = setup();
    client.getRawTransaction.mockResolvedValue(ok(SHIELDING_TX));

    const { data } = await adapter.getTransaction(SHIELDING_TX.txid ?? "");

    expect(client.getRawTransaction).toHaveBeenCalledWith(SHIELDING_TX.txid, 1);
    expect(data.blockheight).toBe(3483400);
    expect(data.vin).toHaveLength(15);
    expect(data.vout).toHaveLength(0);
    expect(data.shielded).toEqual({
      sapling: { spends: 0, outputs: 2, valueBalanceZat: -1_877_663_138 },
    });
  });

  describe("resolveTransparentInputs", () => {
    const firstTxid = "c".repeat(64);
    const secondTxid = "d".repeat(64);
    const spending: ZcashTransaction = {
      txid: "e".repeat(64),
      version: 4,
      size: 0,
      locktime: 0,
      vin: [
        { txid: firstTxid, vout: 0, sequence: 0 },
        { txid: firstTxid, vout: 1, sequence: 0 },
        { txid: secondTxid, vout: 0, sequence: 0 },
      ],
      vout: [{ n: 0, valueZat: 60_000, scriptType: "pubkeyhash" }],
      shielded: {},
    };
    const previousTx = (txid: string, values: number[]) => ({
      txid,
      vin: [],
      vout: values.map((value, n) => ({
        value,
        n,
        scriptPubKey: { type: "pubkeyhash", addresses: [T_ADDRESS] },
      })),
    });

    it("fills input values from the transactions they spend", async () => {
      const { adapter, client } = setup();
      client.getRawTransaction.mockImplementation(async (txid: string) =>
        ok(txid === firstTxid ? previousTx(txid, [0.0003, 0.0002]) : previousTx(txid, [0.0002])),
      );
      const onProgress = vi.fn();

      const result = await adapter.resolveTransparentInputs(spending, { onProgress });

      expect(client.getRawTransaction).toHaveBeenCalledTimes(2);
      expect(result).toMatchObject({ resolved: 2, total: 2 });
      expect(onProgress).toHaveBeenLastCalledWith(2, 2);
      expect(result.transaction.vin.map((vin) => vin.valueZat)).toEqual([30_000, 20_000, 20_000]);
      expect(result.transaction.vin[0]?.address).toBe(T_ADDRESS);
      expect(computeFeeZat(result.transaction)).toBe(10_000);
    });

    it("stops at the lookup cap and leaves the fee unknown", async () => {
      const { adapter, client } = setup();
      client.getRawTransaction.mockResolvedValue(ok(previousTx(firstTxid, [0.0003, 0.0002])));

      const result = await adapter.resolveTransparentInputs(spending, { max: 1 });

      expect(client.getRawTransaction).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ resolved: 1, total: 2 });
      expect(computeFeeZat(result.transaction)).toBeNull();
    });
  });
});

describe("ZcashAdapter RPC failures", () => {
  it("retries rate-limited calls after a backoff", async () => {
    const { adapter, client, sleep } = setup();
    client.getBlockCount
      .mockResolvedValueOnce(fail("HTTP error! status: 429", "HTTP error! status: 429"))
      .mockResolvedValueOnce(ok(3483464));

    await expect(adapter.getLatestBlockNumber()).resolves.toBe(3483464);
    expect(sleep).toHaveBeenCalledWith(15_000);
  });

  it("gives up after the last backoff", async () => {
    const { adapter, client, sleep } = setup();
    client.getBlockCount.mockResolvedValue(fail("HTTP error! status: 429"));

    await expect(adapter.getLatestBlockNumber()).rejects.toMatchObject({
      name: "ZcashRpcError",
      kind: "rateLimited",
    });
    expect(sleep.mock.calls).toEqual([[15_000], [30_000]]);
    expect(client.getBlockCount).toHaveBeenCalledTimes(3);
  });

  it("throws instead of returning empty data when every endpoint fails", async () => {
    const { adapter, client, sleep } = setup();
    client.getBlock.mockResolvedValue(fail("RPC error: Block not found"));

    const error = await adapter.getBlock("0").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ZcashRpcError);
    expect(error).toMatchObject({ kind: "failed", messages: ["RPC error: Block not found"] });
    expect(sleep).not.toHaveBeenCalled();
  });
});

describe("ZcashAdapter addresses", () => {
  it("marks address index sections unsupported when the gateway blocks them", async () => {
    const { adapter, client } = setup();
    client.getAddressBalance.mockResolvedValue(fail(METHOD_NOT_FOUND, METHOD_NOT_FOUND));
    client.getAddressUtxos.mockResolvedValue(fail(METHOD_NOT_FOUND, METHOD_NOT_FOUND));
    client.getAddressTxIds.mockResolvedValue(fail(METHOD_NOT_FOUND, METHOD_NOT_FOUND));

    const result = await adapter.getAddress(T_ADDRESS);

    expect(client.getAddressBalance).toHaveBeenCalledWith({ addresses: [T_ADDRESS] });
    expect(result).toEqual({
      address: T_ADDRESS,
      type: "p2pkh",
      transparentAddress: T_ADDRESS,
      balance: { availability: "unsupported" },
      utxos: { availability: "unsupported" },
      txids: { availability: "unsupported" },
    });
  });

  it("reports other address index failures as errors", async () => {
    const { adapter, client } = setup();
    client.getAddressBalance.mockResolvedValue(fail("RPC error: invalid address"));
    client.getAddressUtxos.mockResolvedValue(ok([]));
    client.getAddressTxIds.mockResolvedValue(ok([]));

    const result = await adapter.getAddress(T_ADDRESS);

    expect(result.balance).toEqual({ availability: "error" });
    expect(result.utxos).toEqual({ availability: "ok", data: [] });
  });

  it("maps address index data when the node exposes it", async () => {
    const { adapter, client } = setup();
    const txid = "f".repeat(64);
    client.getAddressBalance.mockResolvedValue(ok({ balance: 9_514_810, received: 19_029_620 }));
    client.getAddressUtxos.mockResolvedValue(
      ok([
        {
          address: T_ADDRESS,
          txid,
          outputIndex: 0,
          script: "76a9",
          satoshis: 9_514_810,
          height: 3483400,
        },
      ]),
    );
    client.getAddressTxIds.mockResolvedValue(ok([txid]));

    const result = await adapter.getAddress(T_ADDRESS);

    expect(result.balance).toEqual({
      availability: "ok",
      data: { balanceZat: 9_514_810, receivedZat: 19_029_620 },
    });
    expect(result.utxos).toEqual({
      availability: "ok",
      data: [{ txid, outputIndex: 0, valueZat: 9_514_810, height: 3483400 }],
    });
    expect(result.txids).toEqual({ availability: "ok", data: [txid] });
  });

  it("queries the transparent receiver of a unified address", async () => {
    const { adapter, client } = setup();
    const unified = `u1${"q".repeat(100)}`;
    client.zListUnifiedReceivers.mockResolvedValue(
      ok({ orchard: `u1${"p".repeat(60)}`, p2pkh: T_ADDRESS }),
    );
    client.getAddressBalance.mockResolvedValue(ok({ balance: 1 }));
    client.getAddressUtxos.mockResolvedValue(ok([]));
    client.getAddressTxIds.mockResolvedValue(ok([]));

    const result = await adapter.getAddress(unified);

    expect(client.zListUnifiedReceivers).toHaveBeenCalledWith(unified);
    expect(result.transparentAddress).toBe(T_ADDRESS);
    expect(client.getAddressBalance).toHaveBeenCalledWith({ addresses: [T_ADDRESS] });
  });

  it("makes no RPC calls for Sapling addresses", async () => {
    const { adapter, client } = setup();
    const sapling = `zs1${"q".repeat(75)}`;

    const result = await adapter.getAddress(sapling);

    expect(result).toEqual({ address: sapling, type: "sapling" });
    for (const method of Object.values(client)) {
      expect(method).not.toHaveBeenCalled();
    }
  });
});

describe("ZcashAdapter network data", () => {
  it("maps value pools and chain supply to zatoshis", async () => {
    const { adapter, client } = setup();
    client.getBlockchainInfo.mockResolvedValue(
      ok({
        chain: "main",
        blocks: 3483461,
        bestblockhash: "0".repeat(64),
        difficulty: 241391812.2,
        chainSupply: { chainValue: 16932540.7905448, chainValueZat: 1_693_254_079_054_480 },
        valuePools: [
          {
            id: "transparent",
            chainValue: 11974617.26829416,
            chainValueZat: 1_197_461_726_829_416,
          },
          { id: "ironwood", chainValue: 3943491.88711218, chainValueZat: 394_349_188_711_218 },
          { id: "future", chainValue: 1, chainValueZat: 100_000_000 },
        ],
      }),
    );
    client.getMempoolInfo.mockResolvedValue(ok({ size: 9, bytes: 4_512, usage: 9_000 }));

    const { data } = await adapter.getNetworkStats();

    expect(data).toMatchObject({
      blockHeight: 3483461,
      mempoolSize: 9,
      mempoolBytes: 4_512,
      chainSupplyZat: 1_693_254_079_054_480,
    });
    expect(data.valuePools).toEqual([
      { id: "transparent", valueZat: 1_197_461_726_829_416 },
      { id: "ironwood", valueZat: 394_349_188_711_218 },
    ]);
  });

  it("sorts mempool entries by fee rate", async () => {
    const { adapter, client } = setup();
    const entry = (size: number, fee: number) => ({
      size,
      fee,
      modifiedfee: fee,
      time: 1789416139,
      height: 3483464,
      descendantcount: 1,
      descendantsize: size,
      descendantfees: 0,
      depends: [],
    });
    client.getRawMempool.mockResolvedValue(
      ok({ ["a".repeat(64)]: entry(1000, 0.0001), ["b".repeat(64)]: entry(245, 0.000113) }),
    );

    const { data } = await adapter.getMempoolEntries();

    expect(client.getRawMempool).toHaveBeenCalledWith(true);
    expect(data).toEqual([
      { txid: "b".repeat(64), size: 245, feeZat: 11_300, time: 1789416139, height: 3483464 },
      { txid: "a".repeat(64), size: 1000, feeZat: 10_000, time: 1789416139, height: 3483464 },
    ]);
  });
});
