import type {
  ZcashActionBundle,
  ZcashBlock,
  ZcashBlockWithTransactions,
  ZcashMempoolEntry,
  ZcashNetworkStats,
  ZcashShieldedBundles,
  ZcashShieldedPool,
  ZcashTransaction,
  ZcashValuePool,
  ZcashValuePoolId,
} from "../../../types";
import {
  getShieldedPools,
  getTransparentOutputZat,
  isCoinbaseTransaction,
  zecToZat,
} from "../../../utils/zcashUtils";

/*
 * Raw Zebra RPC shapes, limited to the fields the explorer reads. They are looser than the
 * connector's types on purpose: they also cover the NU6.3 Ironwood bundle and note commitment
 * tree, which @openscan/network-connectors does not model yet.
 */

export interface ZcashRawActionBundle {
  actions?: unknown[];
  valueBalance?: number;
  valueBalanceZat?: number;
}

export interface ZcashRawVin {
  txid?: string;
  vout?: number;
  coinbase?: string;
  sequence: number;
}

export interface ZcashRawVout {
  value: number;
  valueZat?: number;
  n: number;
  scriptPubKey: { type: string; addresses?: string[] };
}

export interface ZcashRawJoinSplit {
  vpub_old: number;
  vpub_new: number;
  vpub_oldZat?: number;
  vpub_newZat?: number;
}

export interface ZcashRawTransaction {
  txid?: string;
  size?: number;
  version?: number;
  versiongroupid?: string;
  locktime?: number;
  expiryheight?: number;
  vin: ZcashRawVin[];
  vout: ZcashRawVout[];
  valueBalance?: number;
  valueBalanceZat?: number;
  vShieldedSpend?: unknown[];
  vShieldedOutput?: unknown[];
  vjoinsplit?: ZcashRawJoinSplit[];
  orchard?: ZcashRawActionBundle;
  ironwood?: ZcashRawActionBundle;
  blockhash?: string;
  height?: number;
  confirmations?: number;
  time?: number;
  blocktime?: number;
}

export interface ZcashRawValuePool {
  id: string;
  chainValueZat: number;
}

interface ZcashRawBlockCommon {
  hash: string;
  confirmations?: number;
  height: number;
  version: number;
  merkleroot: string;
  blockcommitments?: string;
  finalsaplingroot?: string;
  finalorchardroot?: string;
  time: number;
  nonce: string;
  solution?: string;
  bits: string;
  difficulty: number;
  previousblockhash?: string;
  nextblockhash?: string;
  size?: number;
  nTx?: number;
  trees?: {
    sapling?: { size: number };
    orchard?: { size: number };
    ironwood?: { size: number };
  };
  chainSupply?: { chainValueZat: number };
  valuePools?: ZcashRawValuePool[];
}

/** getblock with verbosity 1 (transaction ids only) */
export interface ZcashRawBlockSummary extends ZcashRawBlockCommon {
  tx: string[];
}

/** getblock with verbosity 2 (full transactions) */
export interface ZcashRawBlock extends ZcashRawBlockCommon {
  tx: ZcashRawTransaction[];
}

export interface ZcashRawBlockchainInfo {
  chain: string;
  blocks: number;
  bestblockhash: string;
  difficulty: number;
  estimatedheight?: number;
  verificationprogress?: number;
  chainSupply?: { chainValueZat: number };
  valuePools?: ZcashRawValuePool[];
}

export interface ZcashRawMempoolEntry {
  size: number;
  fee: number;
  time: number;
  height: number;
}

const VALUE_POOL_IDS: ZcashValuePoolId[] = [
  "transparent",
  "sprout",
  "sapling",
  "orchard",
  "lockbox",
  "ironwood",
];

function isValuePoolId(id: string): id is ZcashValuePoolId {
  return (VALUE_POOL_IDS as string[]).includes(id);
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
    trees: raw.trees && {
      sapling: raw.trees.sapling?.size,
      orchard: raw.trees.orchard?.size,
      ironwood: raw.trees.ironwood?.size,
    },
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
      coinbaseOutputs:
        coinbase && isCoinbaseTransaction(coinbase)
          ? coinbase.vout.map((output) => ({ address: output.address, valueZat: output.valueZat }))
          : [],
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
