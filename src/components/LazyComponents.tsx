import { lazy, Suspense } from "react";
import Loading from "./common/Loading";

// Lazy load page components
const Home = lazy(() => import("./pages/home"));
const Chain = lazy(() => import("./pages/network"));
const BitcoinNetwork = lazy(() => import("./pages/bitcoin"));
const BitcoinBlockPage = lazy(() => import("./pages/bitcoin/BitcoinBlockPage"));
const BitcoinBlocksPage = lazy(() => import("./pages/bitcoin/BitcoinBlocksPage"));
const BitcoinTransactionPage = lazy(() => import("./pages/bitcoin/BitcoinTransactionPage"));
const BitcoinTransactionsPage = lazy(() => import("./pages/bitcoin/BitcoinTransactionsPage"));
const BitcoinAddressPage = lazy(() => import("./pages/bitcoin/BitcoinAddressPage"));
const BitcoinMempoolPage = lazy(() => import("./pages/bitcoin/BitcoinMempoolPage"));
const Blocks = lazy(() => import("./pages/blocks"));
const Block = lazy(() => import("./pages/block"));
const Txs = lazy(() => import("./pages/txs"));
const Tx = lazy(() => import("./pages/tx"));
const Address = lazy(() => import("./pages/address"));
const TokenDetails = lazy(() => import("./pages/tokenDetails"));
const Mempool = lazy(() => import("./pages/mempool"));
const Settings = lazy(() => import("./pages/settings"));
const DevTools = lazy(() => import("./pages/devtools"));
const About = lazy(() => import("./pages/about"));
const Subscriptions = lazy(() => import("./pages/subscriptions"));
const Profile = lazy(() => import("./pages/profile"));
const Supporters = lazy(() => import("./pages/supporters"));
const Contact = lazy(() => import("./pages/contact"));
const Search = lazy(() => import("./pages/search"));
const GasTracker = lazy(() => import("./pages/gastracker"));

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
  console.log("Preloading all route chunks...");
  import("./pages/home");
  import("./pages/network");
  import("./pages/bitcoin");
  import("./pages/bitcoin/BitcoinBlockPage");
  import("./pages/bitcoin/BitcoinBlocksPage");
  import("./pages/bitcoin/BitcoinTransactionPage");
  import("./pages/bitcoin/BitcoinTransactionsPage");
  import("./pages/bitcoin/BitcoinAddressPage");
  import("./pages/bitcoin/BitcoinMempoolPage");
  import("./pages/blocks");
  import("./pages/block");
  import("./pages/txs");
  import("./pages/tx");
  import("./pages/address");
  import("./pages/tokenDetails");
  import("./pages/mempool");
  import("./pages/settings");
  import("./pages/devtools");
  import("./pages/about");
  import("./pages/subscriptions");
  import("./pages/profile");
  import("./pages/supporters");
  import("./pages/contact");
  import("./pages/search");
  import("./pages/gastracker");
}

// Default exports for backward compatibility
export { Home };
