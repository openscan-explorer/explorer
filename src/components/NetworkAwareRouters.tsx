import { useParams } from "react-router-dom";
import { getAllNetworks } from "../config/networks";
import { isBitcoinNetwork, resolveNetwork } from "../utils/networkResolver";
import {
  LazyAddress,
  LazyBitcoinAddress,
  LazyBitcoinBlock,
  LazyBitcoinTx,
  LazyBlock,
  LazyTx,
} from "./LazyComponents";

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
