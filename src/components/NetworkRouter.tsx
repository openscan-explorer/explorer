import { useParams, Navigate } from "react-router-dom";
import { resolveNetwork, isBitcoinNetwork } from "../utils/networkResolver";
import { getAllNetworks } from "../config/networks";
import { LazyChain, LazyBitcoinNetwork } from "./LazyComponents";

/**
 * Network router component that selects the appropriate dashboard
 * based on the network type (EVM vs Bitcoin)
 */
export default function NetworkRouter() {
  const { networkId } = useParams<{ networkId?: string }>();

  if (!networkId) {
    return <Navigate to="/" replace />;
  }

  const network = resolveNetwork(networkId, getAllNetworks());

  if (!network) {
    // Network not found - redirect to home
    return <Navigate to="/" replace />;
  }

  // Route to appropriate dashboard based on network type
  if (isBitcoinNetwork(network)) {
    return <LazyBitcoinNetwork />;
  }

  // Default to EVM dashboard
  return <LazyChain />;
}
