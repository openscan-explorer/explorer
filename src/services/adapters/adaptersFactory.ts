import type { NetworkAdapter } from "./NetworkAdapter";
import { EVMAdapter } from "./EVMAdapter/EVMAdapter";
import { OptimismAdapter } from "./OptimismAdapter/OptimismAdapter";
import { BaseAdapter } from "./BaseAdapter/BaseAdapter";
import { BNBAdapter } from "./BNBAdapter/BNBAdapter";
import { PolygonAdapter } from "./PolygonAdapter/PolygonAdapter";
import { ArbitrumAdapter } from "./ArbitrumAdapter/ArbitrumAdapter";
import { HardhatAdapter } from "./HardhatAdapter/HardhatAdapter";
import { BitcoinAdapter } from "./BitcoinAdapter/BitcoinAdapter";
import { SolanaAdapter } from "./SolanaAdapter/SolanaAdapter";
import type {
  ArbitrumClient,
  AvalancheClient,
  AztecClient,
  BaseClient,
  BitcoinClient,
  BNBClient,
  EthereumClient,
  HardhatClient,
  OptimismClient,
  PolygonClient,
  SolanaClient,
  SupportedChainId,
} from "@openscan/network-connectors";

// biome-ignore lint/complexity/noStaticOnlyClass: <TODO>
export class AdapterFactory {
  /**
   * Create an EVM network adapter
   */
  static createAdapter(
    networkId: SupportedChainId | number,
    client:
      | EthereumClient
      | OptimismClient
      | BNBClient
      | PolygonClient
      | BaseClient
      | ArbitrumClient
      | AvalancheClient
      | AztecClient
      | HardhatClient,
  ): NetworkAdapter {
    switch (networkId) {
      case 1:
      case 11155111:
      case 43114:
      case 43113:
        return new EVMAdapter(networkId, client as unknown as EthereumClient);
      case 31337:
        return new HardhatAdapter(client as HardhatClient);
      case 10:
      case 11155420:
        return new OptimismAdapter(networkId, client as OptimismClient);
      case 56:
      case 97:
        return new BNBAdapter(networkId, client as BNBClient);
      case 137:
      case 80002:
        return new PolygonAdapter(networkId, client as PolygonClient);
      case 8453:
      case 84532:
        return new BaseAdapter(networkId, client as BaseClient);
      case 42161:
      case 421614:
        return new ArbitrumAdapter(networkId, client as ArbitrumClient);
      default:
        throw new Error(`Unknown adapter for networkId: ${networkId}`);
    }
  }

  /**
   * Create a Bitcoin network adapter
   */
  static createBitcoinAdapter(networkId: string, client: BitcoinClient): BitcoinAdapter {
    return new BitcoinAdapter(networkId, client);
  }

  /**
   * Create a Solana network adapter
   */
  static createSolanaAdapter(networkId: string, client: SolanaClient): SolanaAdapter {
    return new SolanaAdapter(networkId, client);
  }
}
