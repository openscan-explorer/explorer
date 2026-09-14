/**
 * Compact contexts for the AI analysis panel. Amounts are converted to ZEC and field names carry
 * the unit, so the model never has to infer one.
 */

import type {
  ZcashAddress,
  ZcashBlock,
  ZcashShieldedBundles,
  ZcashTransaction,
} from "../../../types";
import {
  classifyTransaction,
  computeFeeZat,
  getTransactionPools,
  getTransparentOutputZat,
  isCoinbaseTransaction,
  zatToZec,
} from "../../../utils/zcashUtils";

function summarizeShieldedBundles({ sprout, sapling, orchard, ironwood }: ZcashShieldedBundles) {
  return {
    sprout: sprout && {
      joinSplits: sprout.joinSplits,
      enteredSproutZEC: zatToZec(sprout.vpubOldZat),
      leftSproutZEC: zatToZec(sprout.vpubNewZat),
    },
    sapling: sapling && {
      spends: sapling.spends,
      outputs: sapling.outputs,
      valueBalanceZEC: zatToZec(sapling.valueBalanceZat),
    },
    orchard: orchard && {
      actions: orchard.actions,
      valueBalanceZEC: zatToZec(orchard.valueBalanceZat),
    },
    ironwood: ironwood && {
      actions: ironwood.actions,
      valueBalanceZEC: zatToZec(ironwood.valueBalanceZat),
    },
  };
}

export function buildTransactionAnalysisContext(tx: ZcashTransaction): Record<string, unknown> {
  const feeZat = computeFeeZat(tx);
  const inputValuesKnown =
    tx.vin.length > 0 && tx.vin.every((input) => input.valueZat !== undefined);

  return {
    txid: tx.txid,
    status: tx.blockhash && tx.confirmations ? "confirmed" : "unconfirmed (in mempool)",
    confirmations: tx.confirmations,
    blockHeight: tx.blockheight,
    kind: classifyTransaction(tx),
    pools: getTransactionPools(tx),
    isCoinbase: isCoinbaseTransaction(tx),
    version: tx.version,
    expiryHeight: tx.expiryHeight,
    sizeBytes: tx.size,
    transparentInputCount: tx.vin.length,
    transparentOutputCount: tx.vout.length,
    transparentInputsZEC: inputValuesKnown
      ? zatToZec(tx.vin.reduce((sum, input) => sum + (input.valueZat ?? 0), 0))
      : undefined,
    transparentOutputsZEC: zatToZec(getTransparentOutputZat(tx)),
    feeZEC: feeZat === null ? undefined : zatToZec(feeZat),
    feeRateZatPerByte:
      feeZat !== null && tx.size > 0 ? Number((feeZat / tx.size).toFixed(2)) : undefined,
    shieldedBundles: summarizeShieldedBundles(tx.shielded),
    transparentOutputs: tx.vout.map((output) => ({
      address: output.address,
      amountZEC: zatToZec(output.valueZat),
      scriptType: output.scriptType,
    })),
  };
}

export function buildBlockAnalysisContext(block: ZcashBlock): Record<string, unknown> {
  const coinbaseOutputs = block.coinbaseOutputs ?? [];

  return {
    height: block.height,
    hash: block.hash,
    time: block.time,
    confirmations: block.confirmations,
    transactionCount: block.nTx,
    sizeBytes: block.size,
    difficulty: block.difficulty,
    coinbaseTotalZEC:
      coinbaseOutputs.length > 0
        ? zatToZec(coinbaseOutputs.reduce((sum, output) => sum + output.valueZat, 0))
        : undefined,
    coinbaseOutputs: coinbaseOutputs.map((output) => ({
      address: output.address,
      amountZEC: zatToZec(output.valueZat),
    })),
    transparentOutputZEC:
      block.transparentOutputZat === undefined ? undefined : zatToZec(block.transparentOutputZat),
    shieldedTransactionCounts: block.shieldedTxCounts,
    noteCommitmentTreeSizes: block.trees,
    valuePoolsZEC:
      block.valuePools &&
      Object.fromEntries(block.valuePools.map((pool) => [pool.id, zatToZec(pool.valueZat)])),
    chainSupplyZEC: block.chainSupplyZat === undefined ? undefined : zatToZec(block.chainSupplyZat),
  };
}

export function buildAddressAnalysisContext(address: ZcashAddress): Record<string, unknown> {
  const { balance, utxos, txids, receivers } = address;

  return {
    address: address.address,
    addressType: address.type,
    transparentReceiver:
      address.transparentAddress !== address.address ? address.transparentAddress : undefined,
    receiverTypes: receivers?.data && Object.keys(receivers.data),
    receiversLookup: receivers?.availability,
    // Availability per address-index section, so a blocked index isn't read as a zero balance
    addressIndex: balance && {
      balance: balance.availability,
      unspentOutputs: utxos?.availability,
      history: txids?.availability,
    },
    balanceZEC: balance?.data === undefined ? undefined : zatToZec(balance.data.balanceZat),
    totalReceivedZEC:
      balance?.data?.receivedZat === undefined ? undefined : zatToZec(balance.data.receivedZat),
    unspentOutputCount: utxos?.data?.length,
    transactionCount: txids?.data?.length,
    // getaddresstxids returns chain order, oldest first
    recentTxids: txids?.data && [...txids.data].reverse().slice(0, 10),
  };
}
