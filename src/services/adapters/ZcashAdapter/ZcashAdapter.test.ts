import type { ZcashClient } from "@openscan/network-connectors";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RPCMetadata, ZcashTransaction } from "../../../types";
import { computeFee } from "../../../utils/zcashUtils";
import {
  BLOCK_3483400,
  COINBASE_TX,
  IRONWOOD_ONLY_TX,
  SAPLING_IRONWOOD_TX,
  SHIELDING_TX,
} from "./fixtures";
import type { ZcashRawBlock, ZcashRawTransaction } from "./utils";
import { getZcashSession, ZcashAdapter, ZcashRpcError, type ZcashSession } from "./ZcashAdapter";

const NETWORK_ID = "bip122:00040fe8ec8471911baa1db1266ea15d";
const T_ADDRESS = "t1KAuVfS2r2hc7RwSh6GTuyfqCGMFEpwkZ2";
const METHOD_NOT_FOUND = "RPC error: Method not found: getaddressbalance";
const RATE_LIMITED = "HTTP error! status: 429";

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

function setup(session: ZcashSession = { unsupportedMethods: new Set() }) {
  const client = createClient();
  const sleep = vi.fn().mockResolvedValue(undefined);
  const adapter = new ZcashAdapter(NETWORK_ID, client as unknown as ZcashClient, {
    sleep,
    session,
  });
  return { adapter, client, sleep };
}

const CHAIN_INFO = { chain: "main", blocks: 3483464, bestblockhash: "0".repeat(64), difficulty: 1 };

afterEach(() => {
  vi.useRealTimers();
});

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

    expect(computeFee(findTx(transactions, IRONWOOD_ONLY_TX.txid))).toEqual({
      kind: "known",
      zat: 10_000,
    });
    expect(computeFee(findTx(transactions, SAPLING_IRONWOOD_TX.txid))).toEqual({
      kind: "known",
      zat: 20_000,
    });
    expect(computeFee(findTx(transactions, SHIELDING_TX.txid))).toEqual({ kind: "unknown" });
    expect(computeFee(findTx(transactions, COINBASE_TX.txid))).toEqual({ kind: "coinbase" });
  });

  it("reports a transparent coinbase as paying nothing into the shielded pools", async () => {
    const { adapter, client } = setup();
    client.getBlock.mockResolvedValue(ok(BLOCK_3483400));

    const { block } = (await adapter.getBlock(3483400)).data;

    expect(block.coinbaseShieldedZat).toBe(0);
  });

  it("adds a shielded coinbase reward from the value entering the pools", async () => {
    const { adapter, client } = setup();
    const shieldedCoinbase: ZcashRawTransaction = {
      ...COINBASE_TX,
      vout: COINBASE_TX.vout.slice(1),
      orchard: { actions: [{}, {}], valueBalanceZat: -125_490_751 },
    };
    const block: ZcashRawBlock = {
      ...BLOCK_3483400,
      tx: [shieldedCoinbase, ...BLOCK_3483400.tx.slice(1)],
    };
    client.getBlock.mockResolvedValue(ok(block));

    const { data } = await adapter.getBlock(3483400);

    expect(data.block.coinbaseShieldedZat).toBe(125_490_751);
    expect(data.block.coinbaseOutputs).toEqual([
      { address: "t3cFfPt1Bcvgez9ZbMBFWeZsskxTkPzGCow", valueZat: 12_500_000 },
    ]);
  });

  it("transforms each provider's response in parallel mode", async () => {
    const { adapter, client } = setup();
    const metadata: RPCMetadata = {
      strategy: "parallel",
      timestamp: 0,
      hasInconsistencies: false,
      responses: [
        { url: "https://a.test", status: "success", responseTime: 1, data: BLOCK_3483400 },
        { url: "https://b.test", status: "error", responseTime: 1, error: "timeout" },
      ],
    };
    client.getBlock.mockResolvedValue({ ...ok(BLOCK_3483400), metadata });

    const result = await adapter.getBlock(3483400);

    expect(result.metadata?.responses[0]?.data.block.height).toBe(3483400);
    expect(result.metadata?.responses[1]).toEqual(metadata.responses[1]);
  });

  it("fetches block summaries one at a time and reports blocks that fail", async () => {
    const { adapter, client } = setup();
    const summary = (height: number) => ({ ...BLOCK_3483400, height, tx: ["a".repeat(64)] });
    client.getBlock
      .mockResolvedValueOnce(ok(summary(3483399)))
      .mockResolvedValueOnce(fail("RPC error: Block not found"))
      .mockResolvedValueOnce(ok(summary(3483400)));

    const onBlock = vi.fn();
    const { blocks, failedHeights } = await adapter.getBlockSummaries([3483399, 3483398, 3483400], {
      onBlock,
    });

    expect(client.getBlock.mock.calls).toEqual([
      ["3483399", 1],
      ["3483398", 1],
      ["3483400", 1],
    ]);
    expect(blocks.map((block) => block.height)).toEqual([3483400, 3483399]);
    expect(blocks[0]?.txids).toEqual(["a".repeat(64)]);
    expect(failedHeights).toEqual([3483398]);
    // Rows can render in request order as each block arrives
    expect(onBlock.mock.calls.map(([block]) => block.height)).toEqual([3483399, 3483400]);
  });

  it("stops fetching summaries once a block stays rate limited", async () => {
    const { adapter, client, sleep } = setup();
    client.getBlock.mockResolvedValue(fail(RATE_LIMITED));

    const { blocks, failedHeights } = await adapter.getBlockSummaries([10, 9, 8]);

    // One block: the first attempt plus two retries, then the rest are reported untried
    expect(client.getBlock).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(blocks).toEqual([]);
    expect(failedHeights).toEqual([10, 9, 8]);
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

  it("sums Sprout JoinSplit public values, preferring the integer zatoshi fields", async () => {
    const { adapter, client } = setup();
    const sproutTx: ZcashRawTransaction = {
      txid: "9".repeat(64),
      version: 2,
      vin: [],
      vout: [],
      vjoinsplit: [
        { vpub_old: 0, vpub_new: 0.4, vpub_newZat: 40_000_000 },
        { vpub_old: 0.10000001, vpub_new: 0 },
      ],
    };
    client.getRawTransaction.mockResolvedValue(ok(sproutTx));

    const { data } = await adapter.getTransaction(sproutTx.txid ?? "");

    expect(data.shielded.sprout).toEqual({
      joinSplits: 2,
      vpubOldZat: 10_000_001,
      vpubNewZat: 40_000_000,
    });
    expect(computeFee(data)).toEqual({ kind: "known", zat: 29_999_999 });
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
      expect(result).toMatchObject({ resolved: 2, total: 2, exceedsCap: false });
      expect(onProgress).toHaveBeenLastCalledWith(2, 2);
      expect(result.transaction.vin.map((vin) => vin.valueZat)).toEqual([30_000, 20_000, 20_000]);
      expect(result.transaction.vin[0]?.address).toBe(T_ADDRESS);
      expect(computeFee(result.transaction)).toEqual({ kind: "known", zat: 10_000 });
    });

    it("spends no calls when the inputs exceed the lookup cap", async () => {
      const { adapter, client } = setup();

      const result = await adapter.resolveTransparentInputs(spending, { max: 1 });

      expect(client.getRawTransaction).not.toHaveBeenCalled();
      expect(result).toMatchObject({ resolved: 0, total: 2, exceedsCap: true });
      expect(computeFee(result.transaction)).toEqual({ kind: "unknown" });
    });

    it("keeps inputs resolved before a failure and resumes from them", async () => {
      const { adapter, client } = setup();
      client.getRawTransaction
        .mockResolvedValueOnce(ok(previousTx(firstTxid, [0.0003, 0.0002])))
        .mockResolvedValueOnce(fail("HTTP error! status: 502"));

      const partial = await adapter.resolveTransparentInputs(spending);

      expect(partial).toMatchObject({ resolved: 1, total: 2, exceedsCap: false });
      expect(partial.error).toBeInstanceOf(ZcashRpcError);
      expect(partial.transaction.vin.map((vin) => vin.valueZat)).toEqual([
        30_000,
        20_000,
        undefined,
      ]);

      client.getRawTransaction.mockResolvedValueOnce(ok(previousTx(secondTxid, [0.0002])));
      const resumed = await adapter.resolveTransparentInputs(partial.transaction);

      expect(client.getRawTransaction).toHaveBeenLastCalledWith(secondTxid, 1);
      expect(client.getRawTransaction).toHaveBeenCalledTimes(3);
      expect(resumed).toMatchObject({ resolved: 2, total: 2 });
      expect(resumed.error).toBeUndefined();
      expect(computeFee(resumed.transaction)).toEqual({ kind: "known", zat: 10_000 });
    });
  });
});

describe("ZcashAdapter RPC failures", () => {
  it("retries rate-limited calls after a backoff", async () => {
    const { adapter, client, sleep } = setup();
    client.getRawMempool
      .mockResolvedValueOnce(fail(RATE_LIMITED, RATE_LIMITED))
      .mockResolvedValueOnce(ok({}));

    await expect(adapter.getMempoolEntries()).resolves.toMatchObject({ data: [] });
    expect(sleep).toHaveBeenCalledWith(15_000, undefined);
  });

  it("gives up after the last backoff", async () => {
    const { adapter, client, sleep } = setup();
    client.getRawMempool.mockResolvedValue(fail(RATE_LIMITED));

    await expect(adapter.getMempoolEntries()).rejects.toMatchObject({
      name: "ZcashRpcError",
      kind: "rateLimited",
    });
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([15_000, 30_000]);
    expect(client.getRawMempool).toHaveBeenCalledTimes(3);
  });

  it("throws instead of returning empty data when every endpoint fails", async () => {
    const { adapter, client, sleep } = setup();
    client.getBlock.mockResolvedValue(fail("RPC error: Block not found"));

    const error = await adapter.getBlock("0").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ZcashRpcError);
    expect(error).toMatchObject({ kind: "failed", messages: ["RPC error: Block not found"] });
    expect(sleep).not.toHaveBeenCalled();
  });

  it("returns a definitive answer without waiting on a rate-limited endpoint", async () => {
    const { adapter, client, sleep } = setup();
    client.getRawTransaction.mockResolvedValue(
      fail("RPC error: No such mempool or main chain transaction", RATE_LIMITED),
    );

    await expect(adapter.getTransaction("a".repeat(64))).rejects.toMatchObject({ kind: "failed" });
    expect(sleep).not.toHaveBeenCalled();
    expect(client.getRawTransaction).toHaveBeenCalledTimes(1);
  });

  it("retries concurrent rate-limited calls and still combines their results", async () => {
    const { adapter, client, sleep } = setup();
    client.getBlockchainInfo
      .mockResolvedValueOnce(fail(RATE_LIMITED))
      .mockResolvedValueOnce(
        ok({ chain: "main", blocks: 1, bestblockhash: "0".repeat(64), difficulty: 1 }),
      );
    client.getMempoolInfo
      .mockResolvedValueOnce(fail(RATE_LIMITED))
      .mockResolvedValueOnce(ok({ size: 2, bytes: 300, usage: 0 }));

    const { data } = await adapter.getNetworkStats();

    expect(sleep.mock.calls).toEqual([
      [15_000, undefined],
      [15_000, undefined],
    ]);
    expect(data).toMatchObject({ blockHeight: 1, mempoolSize: 2 });
  });

  it("stops waiting to retry when aborted", async () => {
    vi.useFakeTimers();
    const client = createClient();
    const adapter = new ZcashAdapter(NETWORK_ID, client as unknown as ZcashClient);
    client.getRawMempool.mockResolvedValue(fail(RATE_LIMITED));
    const controller = new AbortController();

    const pending = adapter.getMempoolEntries({ signal: controller.signal });
    const outcome = pending.catch((caught: unknown) => caught);
    await vi.advanceTimersByTimeAsync(5_000);
    controller.abort();

    expect(await outcome).toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(client.getRawMempool).toHaveBeenCalledTimes(1);
  });

  it("doesn't send a call that was aborted before it started", async () => {
    const { adapter, client } = setup();
    const controller = new AbortController();
    controller.abort();

    await expect(adapter.getBlock(1, { signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(client.getBlock).not.toHaveBeenCalled();
  });

  it("remembers unsupported methods across adapters sharing an endpoint list", async () => {
    const first = setup(getZcashSession(NETWORK_ID, ["https://rpc.test/remember"]));
    first.client.getAddressBalance.mockResolvedValue(fail(METHOD_NOT_FOUND));
    await first.adapter.getAddress(T_ADDRESS);

    const second = setup(getZcashSession(NETWORK_ID, ["https://rpc.test/remember"]));
    const result = await second.adapter.getAddress(T_ADDRESS);

    expect(result.balance).toEqual({ availability: "unsupported" });
    expect(second.client.getAddressBalance).not.toHaveBeenCalled();
    expect(getZcashSession(NETWORK_ID, ["https://other.test"]).unsupportedMethods.size).toBe(0);
  });
});

describe("ZcashAdapter shared chain info", () => {
  it("serves the height and the network stats from one getblockchaininfo call", async () => {
    const { adapter, client } = setup();
    client.getBlockchainInfo.mockResolvedValue(ok(CHAIN_INFO));
    client.getMempoolInfo.mockResolvedValue(ok({ size: 0, bytes: 0, usage: 0 }));

    const [height, stats] = await Promise.all([
      adapter.getLatestBlockNumber(),
      adapter.getNetworkStats(),
    ]);

    expect(height).toBe(3483464);
    expect(stats.data.blockHeight).toBe(3483464);
    expect(client.getBlockchainInfo).toHaveBeenCalledTimes(1);
    expect(client.getBlockCount).not.toHaveBeenCalled();
  });

  it("shares the response across adapters of one session, then refreshes it", async () => {
    vi.useFakeTimers();
    const session: ZcashSession = { unsupportedMethods: new Set() };
    const navbar = setup(session);
    const page = setup(session);
    navbar.client.getBlockchainInfo.mockResolvedValue(ok(CHAIN_INFO));
    page.client.getBlockchainInfo.mockResolvedValue(ok({ ...CHAIN_INFO, blocks: 3483465 }));

    await navbar.adapter.getLatestBlockNumber();
    await expect(page.adapter.getLatestBlockNumber()).resolves.toBe(3483464);
    expect(page.client.getBlockchainInfo).not.toHaveBeenCalled();

    vi.advanceTimersByTime(31_000);
    await expect(page.adapter.getLatestBlockNumber()).resolves.toBe(3483465);
  });

  it("lets one caller abort without cancelling the shared request for the others", async () => {
    const { adapter, client } = setup();
    let respond: (value: unknown) => void = () => {};
    client.getBlockchainInfo.mockReturnValue(
      new Promise((resolve) => {
        respond = resolve;
      }),
    );
    const controller = new AbortController();

    const aborted = adapter.getLatestBlockNumber({ signal: controller.signal });
    const other = adapter.getLatestBlockNumber();
    controller.abort();
    respond(ok(CHAIN_INFO));

    await expect(aborted).rejects.toMatchObject({ name: "AbortError" });
    await expect(other).resolves.toBe(3483464);
  });

  it("drops a failed response so the next caller asks again", async () => {
    const { adapter, client } = setup();
    client.getBlockchainInfo
      .mockResolvedValueOnce(fail("HTTP error! status: 502"))
      .mockResolvedValueOnce(ok(CHAIN_INFO));

    await expect(adapter.getLatestBlockNumber()).rejects.toBeInstanceOf(ZcashRpcError);
    await expect(adapter.getLatestBlockNumber()).resolves.toBe(3483464);
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
    // The three methods share the address index, so one probe is enough
    expect(client.getAddressUtxos).not.toHaveBeenCalled();
    expect(client.getAddressTxIds).not.toHaveBeenCalled();
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

    const result = await adapter.getAddress(T_ADDRESS);

    expect(result.balance).toEqual({ availability: "error" });
    expect(result.utxos).toEqual({ availability: "error" });
    expect(result.txids).toEqual({ availability: "error" });
    expect(client.getAddressUtxos).not.toHaveBeenCalled();
  });

  it("reports one section's failure when the index is available", async () => {
    const { adapter, client } = setup();
    client.getAddressBalance.mockResolvedValue(ok({ balance: 5 }));
    client.getAddressUtxos.mockResolvedValue(fail("RPC error: index busy"));
    client.getAddressTxIds.mockResolvedValue(ok([]));

    const result = await adapter.getAddress(T_ADDRESS);

    expect(result.utxos).toEqual({ availability: "error" });
    expect(result.txids).toEqual({ availability: "ok", data: [] });
  });

  it("makes no RPC calls for an address of the other network", async () => {
    const { adapter, client } = setup();
    const testnetAddress = `tm${"a".repeat(33)}`;

    const result = await adapter.getAddress(testnetAddress);

    expect(result).toEqual({ address: testnetAddress, type: "unknown" });
    expect(client.getAddressBalance).not.toHaveBeenCalled();
  });

  it("normalizes an all-uppercase unified address before querying it", async () => {
    const { adapter, client } = setup();
    const unified = `u1${"q".repeat(100)}`;
    client.zListUnifiedReceivers.mockResolvedValue(ok({ orchard: `u1${"p".repeat(60)}` }));

    const result = await adapter.getAddress(unified.toUpperCase());

    expect(client.zListUnifiedReceivers).toHaveBeenCalledWith(unified);
    expect(result).toMatchObject({ address: unified, type: "unified" });
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
