import type { NetworkAdapter } from "./NetworkAdapter";
import { EVMAdapter } from "./EVMAdapter/EVMAdapter";
import { OptimismAdapter } from "./OptimismAdapter/OptimismAdapter";
import { BaseAdapter } from "./BaseAdapter/BaseAdapter";
import { BNBAdapter } from "./BNBAdapter/BNBAdapter";
import { PolygonAdapter } from "./PolygonAdapter/PolygonAdapter";
import { ArbitrumAdapter } from "./ArbitrumAdapter/ArbitrumAdapter";
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
    networkId: SupportedChainId | 11155111 | 97 | 31337,
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
      case 11155111:
        return new EVMAdapter(networkId, client as EthereumClient);
      case 10:
        return new OptimismAdapter(networkId, client as OptimismClient);
      case 56:
      case 97:
        return new BNBAdapter(networkId, client as BNBClient);
      case 137:
        return new PolygonAdapter(networkId, client as PolygonClient);
      case 8453:
        return new BaseAdapter(networkId, client as BaseClient);
      case 42161:
        return new ArbitrumAdapter(networkId, client as ArbitrumClient);
      default:
        throw new Error(`Unknown adapter for networkId: ${networkId}`);
    }
  }
}
