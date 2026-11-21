import type {
  ZecBlock,
  ZecBlockchainInfo,
  ZecChainSupply,
  ZecJoinSplit,
  ZecMempoolEntry,
  ZecOrchardBundle,
  ZecRawTransaction,
  ZecScriptPubKey,
  ZecValuePoolBalance,
  ZecVin,
  ZecVout,
} from "@openscan/network-connectors";
import { ZCASH_TREE_POOLS, ZCASH_VALUE_POOL_IDS } from "../../../config/zcashConstants";
import type {
  DataWithMetadata,
  ZcashActionBundle,
  ZcashBlock,
  ZcashBlockWithTransactions,
  ZcashMempoolEntry,
  ZcashNetworkStats,
  ZcashShieldedBundles,
  ZcashShieldedPool,
  ZcashTransaction,
  ZcashTreePool,
  ZcashTreeSizes,
  ZcashValuePool,
  ZcashValuePoolId,
} from "../../../types";
import {
  getShieldedNetZat,
  getShieldedPools,
  getTransparentOutputZat,
  isCoinbaseTransaction,
  zecToZat,
} from "../../../utils/zcashUtils";

/*
 * Raw Zebra RPC shapes, limited to the fields the explorer reads. They are picked from the
 * connector's types so renamed fields fail to compile, and loosened where Zebra omits fields
 * or where the NU6.3 Ironwood bundle and note commitment tree aren't modelled upstream yet.
 */

export type ZcashRawActionBundle = Partial<
  Pick<ZecOrchardBundle, "valueBalance" | "valueBalanceZat">
> & {
  actions?: unknown[];
};

export type ZcashRawVin = Pick<ZecVin, "txid" | "vout" | "coinbase" | "sequence">;

export type ZcashRawVout = Pick<ZecVout, "value" | "valueZat" | "n"> & {
  scriptPubKey: Pick<ZecScriptPubKey, "type" | "addresses">;
};

export type ZcashRawJoinSplit = Pick<
  ZecJoinSplit,
  "vpub_old" | "vpub_new" | "vpub_oldZat" | "vpub_newZat"
>;

export type ZcashRawTransaction = Pick<
  ZecRawTransaction,
  | "txid"
  | "size"
  | "version"
  | "versiongroupid"
  | "locktime"
  | "expiryheight"
  | "valueBalance"
  | "valueBalanceZat"
  | "blockhash"
  | "height"
  | "confirmations"
  | "time"
  | "blocktime"
> & {
  vin: ZcashRawVin[];
  vout: ZcashRawVout[];
  vShieldedSpend?: unknown[];
  vShieldedOutput?: unknown[];
  vjoinsplit?: ZcashRawJoinSplit[];
  orchard?: ZcashRawActionBundle;
  ironwood?: ZcashRawActionBundle; // NU6.3, not in the connector yet
};

// Pool ids stay strings: a newer node may report pools this explorer doesn't know
export type ZcashRawValuePool = Pick<ZecValuePoolBalance, "chainValueZat"> & { id: string };

type ZcashRawBlockCommon = Pick<
  ZecBlock,
  | "hash"
  | "height"
  | "version"
  | "merkleroot"
  | "finalorchardroot"
  | "time"
  | "nonce"
  | "bits"
  | "difficulty"
  | "previousblockhash"
  | "nextblockhash"
  | "size"
  | "nTx"
> &
  Partial<
    Pick<ZecBlock, "confirmations" | "blockcommitments" | "finalsaplingroot" | "solution">
  > & {
    trees?: Partial<Record<ZcashTreePool, { size: number }>>;
    chainSupply?: Pick<ZecChainSupply, "chainValueZat">;
    valuePools?: ZcashRawValuePool[];
  };

/** getblock with verbosity 1 (transaction ids only) */
export type ZcashRawBlockSummary = ZcashRawBlockCommon & { tx: string[] };

/** getblock with verbosity 2 (full transactions) */
export type ZcashRawBlock = ZcashRawBlockCommon & { tx: ZcashRawTransaction[] };

export type ZcashRawBlockchainInfo = Pick<
  ZecBlockchainInfo,
  "chain" | "blocks" | "bestblockhash" | "difficulty"
> &
  Partial<Pick<ZecBlockchainInfo, "estimatedheight" | "verificationprogress">> & {
    chainSupply?: Pick<ZecChainSupply, "chainValueZat">;
    valuePools?: ZcashRawValuePool[];
  };

export type ZcashRawMempoolEntry = Pick<ZecMempoolEntry, "size" | "fee" | "time" | "height">;

/**
 * Apply a transform to every provider response in parallel-strategy metadata, so each provider
 * carries a complete domain object rather than raw Zebra JSON
 */
export function mapMetadata<T>(
  metadata: unknown,
  transform: (raw: never) => T,
): DataWithMetadata<T>["metadata"] {
  const typed = metadata as DataWithMetadata<T>["metadata"];
  if (!typed?.responses) return typed;
  return {
    ...typed,
    responses: typed.responses.map((response) => {
      if (response.data === undefined) return response;
      try {
        return { ...response, data: transform(response.data as never) };
      } catch {
        return response;
      }
    }),
  };
}

function isValuePoolId(id: string): id is ZcashValuePoolId {
  return (ZCASH_VALUE_POOL_IDS as readonly string[]).includes(id);
}

export function transformValuePools(pools: ZcashRawValuePool[] | undefined): ZcashValuePool[] {
  return (pools ?? []).flatMap((pool) =>
    isValuePoolId(pool.id) ? [{ id: pool.id, valueZat: pool.chainValueZat }] : [],
  );
}

function toActionBundle(raw: ZcashRawActionBundle | undefined): ZcashActionBundle | undefined {
  const actions = raw?.actions?.length ?? 0;
  const valueBalanceZat = raw?.valueBalanceZat ?? zecToZat(raw?.valueBalance ?? 0);
  return actions > 0 || valueBalanceZat !== 0 ? { actions, valueBalanceZat } : undefined;
}

function toShieldedBundles(raw: ZcashRawTransaction): ZcashShieldedBundles {
  const bundles: ZcashShieldedBundles = {};

  const joinSplits = raw.vjoinsplit ?? [];
  if (joinSplits.length > 0) {
    bundles.sprout = {
      joinSplits: joinSplits.length,
      vpubOldZat: joinSplits.reduce(
        (sum, js) => sum + (js.vpub_oldZat ?? zecToZat(js.vpub_old)),
        0,
      ),
      vpubNewZat: joinSplits.reduce(
        (sum, js) => sum + (js.vpub_newZat ?? zecToZat(js.vpub_new)),
        0,
      ),
    };
  }

  const spends = raw.vShieldedSpend?.length ?? 0;
  const outputs = raw.vShieldedOutput?.length ?? 0;
  const saplingBalanceZat = raw.valueBalanceZat ?? zecToZat(raw.valueBalance ?? 0);
  if (spends > 0 || outputs > 0 || saplingBalanceZat !== 0) {
    bundles.sapling = { spends, outputs, valueBalanceZat: saplingBalanceZat };
  }

  const orchard = toActionBundle(raw.orchard);
  if (orchard) bundles.orchard = orchard;

  const ironwood = toActionBundle(raw.ironwood);
  if (ironwood) bundles.ironwood = ironwood;

  return bundles;
}

export function transformTransaction(raw: ZcashRawTransaction): ZcashTransaction {
  return {
    txid: raw.txid ?? "",
    version: raw.version ?? 0,
    versionGroupId: raw.versiongroupid,
    size: raw.size ?? 0,
    locktime: raw.locktime ?? 0,
    expiryHeight: raw.expiryheight,
    vin: raw.vin.map((input) => ({
      txid: input.txid,
      vout: input.vout,
      coinbase: input.coinbase,
      sequence: input.sequence,
    })),
    vout: raw.vout.map((output) => ({
      n: output.n,
      valueZat: output.valueZat ?? zecToZat(output.value),
      address: output.scriptPubKey.addresses?.[0],
      scriptType: output.scriptPubKey.type,
    })),
    shielded: toShieldedBundles(raw),
    blockhash: raw.blockhash,
    blockheight: raw.height,
    confirmations: raw.confirmations,
    blocktime: raw.blocktime,
    time: raw.time,
  };
}

function transformTrees(trees: NonNullable<ZcashRawBlockCommon["trees"]>): ZcashTreeSizes {
  const sizes: ZcashTreeSizes = {};
  for (const pool of ZCASH_TREE_POOLS) {
    const size = trees[pool]?.size;
    if (size !== undefined) sizes[pool] = size;
  }
  return sizes;
}

function transformBlockCommon(raw: ZcashRawBlockCommon, txCount: number): ZcashBlock {
  return {
    hash: raw.hash,
    height: raw.height,
    time: raw.time,
    nTx: raw.nTx ?? txCount,
    size: raw.size ?? 0,
    version: raw.version,
    merkleRoot: raw.merkleroot,
    previousBlockHash: raw.previousblockhash,
    nextBlockHash: raw.nextblockhash,
    bits: raw.bits,
    nonce: raw.nonce,
    difficulty: raw.difficulty,
    confirmations: raw.confirmations,
    solution: raw.solution,
    blockCommitments: raw.blockcommitments,
    finalSaplingRoot: raw.finalsaplingroot,
    finalOrchardRoot: raw.finalorchardroot,
    trees: raw.trees && transformTrees(raw.trees),
    chainSupplyZat: raw.chainSupply?.chainValueZat,
    valuePools: raw.valuePools && transformValuePools(raw.valuePools),
  };
}

export function transformBlockSummary(raw: ZcashRawBlockSummary): ZcashBlock {
  return { ...transformBlockCommon(raw, raw.tx.length), txids: raw.tx };
}

export function transformBlock(raw: ZcashRawBlock): ZcashBlockWithTransactions {
  const transactions = raw.tx.map(transformTransaction);
  const coinbase = transactions[0];
  const isCoinbase = coinbase !== undefined && isCoinbaseTransaction(coinbase);

  const shieldedTxCounts: Partial<Record<ZcashShieldedPool, number>> = {};
  for (const tx of transactions) {
    for (const pool of getShieldedPools(tx)) {
      shieldedTxCounts[pool] = (shieldedTxCounts[pool] ?? 0) + 1;
    }
  }

  return {
    block: {
      ...transformBlockCommon(raw, transactions.length),
      txids: transactions.map((tx) => tx.txid),
      coinbaseOutputs: isCoinbase
        ? coinbase.vout.map((output) => ({ address: output.address, valueZat: output.valueZat }))
        : [],
      // A shielded coinbase pays the miner into Sapling or Orchard: the value entering the pools
      coinbaseShieldedZat: isCoinbase ? Math.max(0, -getShieldedNetZat(coinbase)) : 0,
      shieldedTxCounts,
      transparentOutputZat: transactions.reduce((sum, tx) => sum + getTransparentOutputZat(tx), 0),
    },
    transactions,
  };
}

export function transformNetworkStats(
  info: ZcashRawBlockchainInfo,
  mempool: { size: number; bytes: number },
): ZcashNetworkStats {
  return {
    blockHeight: info.blocks,
    bestBlockHash: info.bestblockhash,
    difficulty: info.difficulty,
    chain: info.chain,
    estimatedHeight: info.estimatedheight,
    verificationProgress: info.verificationprogress,
    mempoolSize: mempool.size,
    mempoolBytes: mempool.bytes,
    chainSupplyZat: info.chainSupply?.chainValueZat,
    valuePools: transformValuePools(info.valuePools),
  };
}

/**
 * Convert a verbose mempool listing, highest fee rate first
 */
export function transformMempoolEntries(
  entries: Record<string, ZcashRawMempoolEntry>,
): ZcashMempoolEntry[] {
  const feeRate = (entry: ZcashMempoolEntry) => entry.feeZat / Math.max(entry.size, 1);
  return Object.entries(entries)
    .map(([txid, entry]) => ({
      txid,
      size: entry.size,
      feeZat: zecToZat(entry.fee),
      time: entry.time,
      height: entry.height,
    }))
    .sort((a, b) => feeRate(b) - feeRate(a));
}

/**
 * Fill transparent input values and addresses from the transactions they spend
 */
export function applyResolvedInputs(
  tx: ZcashTransaction,
  previous: Map<string, ZcashTransaction>,
): ZcashTransaction {
  return {
    ...tx,
    vin: tx.vin.map((input) => {
      const spent =
        input.txid === undefined
          ? undefined
          : previous.get(input.txid)?.vout.find((output) => output.n === input.vout);
      return spent ? { ...input, valueZat: spent.valueZat, address: spent.address } : input;
    }),
  };
}
