// src/services/transformers/transactionTransformer.ts
import type { RPCTransaction, RPCTransactionReceipt } from '../../types';
import type { Transaction } from '../../types';

export class TransactionAdapter {
  static fromRPCTransaction(
    rpcTx: RPCTransaction,
    chainId: number,
    receipt?: RPCTransactionReceipt | null
  ): Transaction {
    return {
      hash: rpcTx.hash,
      from: rpcTx.from,
      to: rpcTx.to,
      value: BigInt(rpcTx.value).toString(),
      gas: BigInt(rpcTx.gas).toString(),
      gasPrice: BigInt(rpcTx.gasPrice).toString(),
      nonce: parseInt(rpcTx.nonce, 16).toString(),
      data: rpcTx.input,
      blockNumber: parseInt(rpcTx.blockNumber, 16).toString(),
      blockHash: rpcTx.blockHash,
      transactionIndex: parseInt(rpcTx.transactionIndex, 16).toString(),
      v: rpcTx.v,
      r: rpcTx.r,
      s: rpcTx.s,
      type: rpcTx.type,
    };
  }
}