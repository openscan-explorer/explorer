import { useParams } from "react-router-dom";
import { getAllNetworks } from "../config/networks";
import { isBitcoinNetwork, resolveNetwork } from "../utils/networkResolver";
import {
  LazyAddress,
  LazyBitcoinAddress,
  LazyBitcoinBlock,
  LazyBitcoinBlocks,
  LazyBitcoinTx,
  LazyBitcoinTxs,
  LazyBlock,
  LazyBlocks,
  LazyTx,
  LazyTxs,
} from "./LazyComponents";

/**
 * Network-aware blocks list page router
 * Routes to BitcoinBlocksPage for Bitcoin networks, LazyBlocks for EVM
 */
export function BlocksPageRouter() {
  const { networkId } = useParams<{ networkId?: string }>();
  const network = resolveNetwork(networkId || "", getAllNetworks());

  if (network && isBitcoinNetwork(network)) {
    return <LazyBitcoinBlocks />;
  }
  return <LazyBlocks />;
}

/**
 * Network-aware block page router
 * Routes to BitcoinBlockPage for Bitcoin networks, LazyBlock for EVM
 */
export function BlockPageRouter() {
  const { networkId } = useParams<{ networkId?: string }>();
  const network = resolveNetwork(networkId || "", getAllNetworks());

  if (network && isBitcoinNetwork(network)) {
    return <LazyBitcoinBlock />;
  }
  return <LazyBlock />;
}

/**
 * Network-aware transactions list page router
 * Routes to BitcoinTransactionsPage for Bitcoin networks, LazyTxs for EVM
 */
export function TxsPageRouter() {
  const { networkId } = useParams<{ networkId?: string }>();
  const network = resolveNetwork(networkId || "", getAllNetworks());

  if (network && isBitcoinNetwork(network)) {
    return <LazyBitcoinTxs />;
  }
  return <LazyTxs />;
}

/**
 * Network-aware transaction page router
 * Routes to BitcoinTransactionPage for Bitcoin networks, LazyTx for EVM
 */
export function TxPageRouter() {
  const { networkId } = useParams<{ networkId?: string }>();
  const network = resolveNetwork(networkId || "", getAllNetworks());

  if (network && isBitcoinNetwork(network)) {
    return <LazyBitcoinTx />;
  }
  return <LazyTx />;
}

/**
 * Network-aware address page router
 * Routes to BitcoinAddressPage for Bitcoin networks, LazyAddress for EVM
 */
export function AddressPageRouter() {
  const { networkId } = useParams<{ networkId?: string }>();
  const network = resolveNetwork(networkId || "", getAllNetworks());

  if (network && isBitcoinNetwork(network)) {
    return <LazyBitcoinAddress />;
  }
  return <LazyAddress />;
}
