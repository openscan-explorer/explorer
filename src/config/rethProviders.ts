import { ClientFactory, type EthereumClient } from "@openscan/network-connectors";

/**
 * Hardcoded reth RPC providers for eth_getTransactionBySenderAndNonce support.
 * These are separate from user-configured RPCs and used only for nonce-based tx lookups.
 */
export const RETH_PROVIDER_URLS = [
  "https://eth-pokt.nodies.app",
  "https://eth.api.onfinality.io/public",
  "https://ethereum.rpc.subquery.network/public",
];

/** Chain ID where nonce-based transaction lookup is available */
export const NONCE_LOOKUP_CHAIN_ID = 1;

let rethClient: EthereumClient | null = null;

/**
 * Get a singleton EthereumClient configured with reth providers using race strategy.
 * Race strategy means the fastest provider wins each call.
 */
export function getRethClient(): EthereumClient {
  if (!rethClient) {
    rethClient = ClientFactory.createTypedClient(1, {
      rpcUrls: RETH_PROVIDER_URLS,
      type: "race",
    });
  }
  return rethClient;
}
