import type { NetworkAdapter } from "./NetworkAdapter";
import { EVMAdapter } from "./EVMAdapter/EVMAdapter";
import { OptimismAdapter } from "./OptimismAdapter/OptimismAdapter";
import { BNBAdapter } from "./BNBAdapter/BNBAdapter";
import { PolygonAdapter } from "./PolygonAdapter/PolygonAdapter";
import type {
  ArbitrumClient,
  AztecClient,
  BaseClient,
  BNBClient,
  EthereumClient,
  OptimismClient,
  PolygonClient,
  SupportedChainId,
} from "explorer-network-connectors";

// biome-ignore lint/complexity/noStaticOnlyClass: <TODO>
export class AdapterFactory {
  static createAdapter(
    networkId: SupportedChainId,
    client:
      | EthereumClient
      | OptimismClient
      | BNBClient
      | PolygonClient
      | BaseClient
      | ArbitrumClient
      | AztecClient,
  ): NetworkAdapter {
    switch (networkId) {
      case 1:
        return new EVMAdapter(networkId, client as EthereumClient);
      case 10:
        return new OptimismAdapter(networkId, client as OptimismClient);
      case 56:
        return new BNBAdapter(networkId, client as BNBClient);
      case 137:
        return new PolygonAdapter(networkId, client as PolygonClient);
      default:
        throw new Error(`Unknown adapter for networkId: ${networkId}`);
    }
  }
}
