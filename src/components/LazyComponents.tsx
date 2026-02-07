import { lazy, Suspense } from "react";
import { logger } from "../utils/logger";
import Loading from "./common/Loading";

// Lazy load page components - Shared
const Home = lazy(() => import("./pages/home"));
const Settings = lazy(() => import("./pages/settings"));
const DevTools = lazy(() => import("./pages/devtools"));
const About = lazy(() => import("./pages/about"));
const Subscriptions = lazy(() => import("./pages/subscriptions"));
const Profile = lazy(() => import("./pages/profile"));
const Supporters = lazy(() => import("./pages/supporters"));
const Contact = lazy(() => import("./pages/contact"));
const Search = lazy(() => import("./pages/search"));

// Lazy load page components - Bitcoin
const BitcoinNetwork = lazy(() => import("./pages/bitcoin"));
const BitcoinBlockPage = lazy(() => import("./pages/bitcoin/BitcoinBlockPage"));
const BitcoinBlocksPage = lazy(() => import("./pages/bitcoin/BitcoinBlocksPage"));
const BitcoinTransactionPage = lazy(() => import("./pages/bitcoin/BitcoinTransactionPage"));
const BitcoinTransactionsPage = lazy(() => import("./pages/bitcoin/BitcoinTransactionsPage"));
const BitcoinAddressPage = lazy(() => import("./pages/bitcoin/BitcoinAddressPage"));
const BitcoinMempoolPage = lazy(() => import("./pages/bitcoin/BitcoinMempoolPage"));

// Lazy load page components - EVM
const Chain = lazy(() => import("./pages/evm/network"));
const Blocks = lazy(() => import("./pages/evm/blocks"));
const Block = lazy(() => import("./pages/evm/block"));
const Txs = lazy(() => import("./pages/evm/txs"));
const Tx = lazy(() => import("./pages/evm/tx"));
const Address = lazy(() => import("./pages/evm/address"));
const TokenDetails = lazy(() => import("./pages/evm/tokenDetails"));
const Mempool = lazy(() => import("./pages/evm/mempool"));
const GasTracker = lazy(() => import("./pages/evm/gastracker"));

// Higher-order component to wrap lazy components with Suspense
// biome-ignore lint/suspicious/noExplicitAny: <TODO>
export const withSuspense = (Component: React.ComponentType<any>) => {
  // biome-ignore lint/suspicious/noExplicitAny: <TODO>
  return function SuspenseWrapper(props: any) {
    return (
      <Suspense fallback={<Loading />}>
        <Component {...props} />
      </Suspense>
    );
  };
};

// Export lazy components wrapped with Suspense
export const LazyHome = withSuspense(Home);
export const LazyChain = withSuspense(Chain);
export const LazyBitcoinNetwork = withSuspense(BitcoinNetwork);
export const LazyBitcoinBlock = withSuspense(BitcoinBlockPage);
export const LazyBitcoinBlocks = withSuspense(BitcoinBlocksPage);
export const LazyBitcoinTx = withSuspense(BitcoinTransactionPage);
export const LazyBitcoinTxs = withSuspense(BitcoinTransactionsPage);
export const LazyBitcoinAddress = withSuspense(BitcoinAddressPage);
export const LazyBitcoinMempool = withSuspense(BitcoinMempoolPage);
export const LazyBlocks = withSuspense(Blocks);
export const LazyBlock = withSuspense(Block);
export const LazyTxs = withSuspense(Txs);
export const LazyTx = withSuspense(Tx);
export const LazyAddress = withSuspense(Address);
export const LazyTokenDetails = withSuspense(TokenDetails);
export const LazyMempool = withSuspense(Mempool);
export const LazySettings = withSuspense(Settings);
export const LazyDevTools = withSuspense(DevTools);
export const LazyAbout = withSuspense(About);
export const LazySubscriptions = withSuspense(Subscriptions);
export const LazyProfile = withSuspense(Profile);
export const LazySupporters = withSuspense(Supporters);
export const LazyContact = withSuspense(Contact);
export const LazySearch = withSuspense(Search);
export const LazyGasTracker = withSuspense(GasTracker);

/**
 * Preload all route chunks after app loads.
 * This ensures navigation between pages is instant (no chunk download delay).
 */
export function preloadAllRoutes() {
  logger.debug("Preloading all route chunks...");
  // Shared pages
  import("./pages/home");
  import("./pages/settings");
  import("./pages/devtools");
  import("./pages/about");
  import("./pages/subscriptions");
  import("./pages/profile");
  import("./pages/supporters");
  import("./pages/contact");
  import("./pages/search");
  // Bitcoin pages
  import("./pages/bitcoin");
  import("./pages/bitcoin/BitcoinBlockPage");
  import("./pages/bitcoin/BitcoinBlocksPage");
  import("./pages/bitcoin/BitcoinTransactionPage");
  import("./pages/bitcoin/BitcoinTransactionsPage");
  import("./pages/bitcoin/BitcoinAddressPage");
  import("./pages/bitcoin/BitcoinMempoolPage");
  // EVM pages
  import("./pages/evm/network");
  import("./pages/evm/blocks");
  import("./pages/evm/block");
  import("./pages/evm/txs");
  import("./pages/evm/tx");
  import("./pages/evm/address");
  import("./pages/evm/tokenDetails");
  import("./pages/evm/mempool");
  import("./pages/evm/gastracker");
}

// Default exports for backward compatibility
export { Home };
