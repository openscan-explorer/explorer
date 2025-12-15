import type { Block, Transaction, Address, TransactionReceipt } from "../../../types";
import type {
  ArbitrumBlock,
  ArbitrumTransaction,
  ArbitrumTransactionReceipt,
} from "explorer-network-connectors";

/**
 * Transforms an Arbitrum RPC block response into a Block domain object
 * Handles hex-to-decimal conversions and normalizes fields
 * Includes Arbitrum-specific fields: l1BlockNumber, sendCount, sendRoot
 */
export function transformArbitrumBlockToBlock(rpcBlock: ArbitrumBlock): Block {
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
      ? rpcBlock.transactions.map((tx) =>
          typeof tx === "string" ? tx : (tx as ArbitrumTransaction).hash,
        )
      : [],
    size: rpcBlock.size,
    logsBloom: rpcBlock.logsBloom,
    stateRoot: rpcBlock.stateRoot,
    receiptsRoot: rpcBlock.receiptsRoot,
    transactionsRoot: rpcBlock.transactionsRoot,
    uncles: rpcBlock.uncles || [],
    mixHash: rpcBlock.mixHash || "",
    sha3Uncles: rpcBlock.sha3Uncles,
    totalDifficulty: BigInt(rpcBlock.difficulty).toString(),
    blobGasUsed: "",
    excessBlobGas: "",
    withdrawalsRoot: "",
    withdrawals: [],
  };
}

/**
 * Transforms an Arbitrum RPC transaction response into a Transaction domain object
 * Includes Arbitrum-specific receipt fields: gasUsedForL1, l1BlockNumber
 */
export function transformArbitrumTransactionToTransaction(
  rpcTx: ArbitrumTransaction,
  receipt?: ArbitrumTransactionReceipt | null,
): Transaction {
  const transaction: Transaction = {
    hash: rpcTx.hash,
    from: rpcTx.from,
    to: rpcTx.to || "",
    value: BigInt(rpcTx.value).toString(),
    gas: BigInt(rpcTx.gas).toString(),
    gasPrice: rpcTx.gasPrice ? BigInt(rpcTx.gasPrice).toString() : "0",
    maxFeePerGas: undefined,
    maxPriorityFeePerGas: undefined,
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
    const arbitrumReceipt: TransactionReceipt = {
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
    transaction.receipt = arbitrumReceipt;
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
