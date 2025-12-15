import type { Block, Transaction, Address } from "../../../types";
import type { EthBlock, EthTransaction, EthTransactionReceipt } from "explorer-network-connectors";

/**
 * Transforms an RPC block response into a Block domain object
 * Handles hex-to-decimal conversions and normalizes fields
 */
export function transformRPCBlockToBlock(rpcBlock: EthBlock): Block {
  const timestamp = rpcBlock.timestamp
    ? parseInt(rpcBlock.timestamp, rpcBlock.timestamp.startsWith("0x") ? 16 : 10).toString()
    : "0";

  return {
    number: rpcBlock.number,
    hash: rpcBlock.hash,
    parentHash: rpcBlock.parentHash,
    timestamp,
    baseFeePerGas: rpcBlock.baseFeePerGas ? BigInt(rpcBlock.baseFeePerGas).toString() : undefined,
    nonce: rpcBlock.nonce,
    difficulty: BigInt(rpcBlock.difficulty).toString(),
    gasLimit: BigInt(rpcBlock.gasLimit).toString(),
    gasUsed: BigInt(rpcBlock.gasUsed).toString(),
    miner: rpcBlock.miner,
    extraData: rpcBlock.extraData,
    transactions: Array.isArray(rpcBlock.transactions)
      ? rpcBlock.transactions.map((tx) => (typeof tx === "string" ? tx : tx.hash))
      : [],
    size: rpcBlock.size,
    logsBloom: rpcBlock.logsBloom,
    stateRoot: rpcBlock.stateRoot,
    receiptsRoot: rpcBlock.receiptsRoot,
    transactionsRoot: rpcBlock.transactionsRoot,
    uncles: rpcBlock.uncles || [],
    mixHash: rpcBlock.mixHash || "",
    sha3Uncles: rpcBlock.sha3Uncles,
    totalDifficulty: rpcBlock.totalDifficulty
      ? BigInt(rpcBlock.totalDifficulty).toString()
      : BigInt(rpcBlock.difficulty).toString(),
    blobGasUsed: "",
    excessBlobGas: "",
    withdrawalsRoot: rpcBlock.withdrawalsRoot || "",
    withdrawals: rpcBlock.withdrawals || [],
  };
}

/**
 * Transforms an RPC transaction response into a Transaction domain object
 * Handles hex-to-decimal conversions and includes receipt if provided
 */
export function transformRPCTransactionToTransaction(
  rpcTx: EthTransaction,
  receipt?: EthTransactionReceipt | null,
): Transaction {
  const transaction: Transaction = {
    hash: rpcTx.hash,
    from: rpcTx.from,
    to: rpcTx.to || "",
    value: BigInt(rpcTx.value).toString(),
    gas: BigInt(rpcTx.gas).toString(),
    gasPrice: rpcTx.gasPrice ? BigInt(rpcTx.gasPrice).toString() : "0",
    maxFeePerGas: rpcTx.maxFeePerGas ? BigInt(rpcTx.maxFeePerGas).toString() : undefined,
    maxPriorityFeePerGas: rpcTx.maxPriorityFeePerGas
      ? BigInt(rpcTx.maxPriorityFeePerGas).toString()
      : undefined,
    nonce: rpcTx.nonce ? parseInt(rpcTx.nonce, 16).toString() : "0",
    data: rpcTx.input,
    blockNumber: rpcTx.blockNumber ? parseInt(rpcTx.blockNumber, 16).toString() : "0",
    blockHash: rpcTx.blockHash || "",
    transactionIndex: rpcTx.transactionIndex
      ? parseInt(rpcTx.transactionIndex, 16).toString()
      : "0",
    v: rpcTx.v,
    r: rpcTx.r,
    s: rpcTx.s,
    type: rpcTx.type,
  };

  if (receipt) {
    transaction.receipt = {
      blockHash: receipt.blockHash,
      blockNumber: parseInt(receipt.blockNumber, 16).toString(),
      contractAddress: receipt.contractAddress,
      cumulativeGasUsed: BigInt(receipt.cumulativeGasUsed).toString(),
      effectiveGasPrice: receipt.effectiveGasPrice
        ? BigInt(receipt.effectiveGasPrice).toString()
        : "0",
      from: receipt.from,
      gasUsed: BigInt(receipt.gasUsed).toString(),
      logs: receipt.logs,
      logsBloom: receipt.logsBloom,
      status: receipt.status || "0x1",
      to: receipt.to || "",
      transactionHash: receipt.transactionHash,
      transactionIndex: parseInt(receipt.transactionIndex, 16).toString(),
      type: receipt.type,
    };
  }

  return transaction;
}

/**
 * Creates an Address domain object from balance, code, and transaction count
 */
export function createAddressFromBalance(
  address: string,
  balance: string,
  code: string,
  txCount: string,
): Address {
  return {
    address,
    balance: BigInt(balance).toString(),
    code,
    txCount: parseInt(txCount, 16).toString(),
    storageAt: {},
  };
}

/**
 * Converts a hex string to a number
 */
export function hexToNumber(hex: string): number {
  return parseInt(hex, 16);
}
