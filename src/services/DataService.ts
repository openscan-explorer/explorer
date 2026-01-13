import { type SupportedChainId, ClientFactory } from "@openscan/network-connectors";

import { AdapterFactory } from "./adapters/adaptersFactory";
import type { NetworkAdapter } from "./adapters/NetworkAdapter";
import type { RpcUrlsContextType } from "../types";
import { getRPCUrls } from "../config/rpcConfig";

export class DataService {
  networkAdapter: NetworkAdapter;
  constructor(
    networkId: SupportedChainId,
    rpcUrlsMap: RpcUrlsContextType,
    strategy: "fallback" | "parallel" = "fallback",
  ) {
    const rpcUrls = getRPCUrls(networkId, rpcUrlsMap);
    const networkClient = ClientFactory.createTypedClient<typeof networkId>(networkId, {
      rpcUrls,
      type: strategy,
    });
    this.networkAdapter = AdapterFactory.createAdapter(networkId, networkClient);
  }
}
