import { useLocation, useParams } from "react-router-dom";
import { getAllNetworks } from "../config/networks";
import { isBitcoinNetwork, resolveNetwork } from "../utils/networkResolver";

/**
 * Helper to get network from URL - tries params first, then path segment
 */
function useNetworkFromUrl() {
  const { networkId } = useParams<{ networkId?: string }>();
  const location = useLocation();
  // Extract from path if not in params (e.g., "/btc/block/123" → "btc")
  const pathSlug = location.pathname.split("/")[1] || "";
  const slug = networkId || pathSlug;
  return resolveNetwork(slug, getAllNetworks());
}
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
  const network = useNetworkFromUrl();

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
  const network = useNetworkFromUrl();

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
  const network = useNetworkFromUrl();

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
  const network = useNetworkFromUrl();

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
  const network = useNetworkFromUrl();

  if (network && isBitcoinNetwork(network)) {
    return <LazyBitcoinAddress />;
  }
  return <LazyAddress />;
}
