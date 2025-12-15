import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAccount } from "wagmi";
import { getAllNetworks, getNetworkById, loadNetworks } from "../config/networks";
import { useWagmiConnection } from "../hooks/useWagmiConnection";
import type { IAppContext, NetworkConfig, RpcUrlsContextType } from "../types";
import { loadJsonFilesFromStorage, saveJsonFilesToStorage } from "../utils/artifactsStorage";
import { getEffectiveRpcUrls, saveRpcUrlsToStorage } from "../utils/rpcStorage";

// Alias exported for use across the app where a shorter/consistent name is preferred
export type tRpcUrlsContextType = RpcUrlsContextType;

export const AppContext = createContext<IAppContext>({
  appReady: false,
  resourcesLoaded: false,
  isHydrated: false,
  rpcUrls: {},
  setRpcUrls: () => {},
  jsonFiles: loadJsonFilesFromStorage(),
  setJsonFiles: () => {},
  // Network defaults
  networks: [],
  enabledNetworks: [],
  networksLoading: true,
  networksError: null,
  getNetwork: () => undefined,
  reloadNetworks: async () => {},
});

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [appReady, setAppReady] = useState<boolean>(false);
  const [resourcesLoaded, setResourcesLoaded] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [rpcUrls, setRpcUrlsState] = useState<RpcUrlsContextType>({} as RpcUrlsContextType);
  // biome-ignore lint/suspicious/noExplicitAny: <TODO>
  const [jsonFiles, setJsonFilesState] = useState<Record<string, any>>(() =>
    loadJsonFilesFromStorage(),
  );

  // Network state
  const [networks, setNetworks] = useState<NetworkConfig[]>([]);
  const [networksLoading, setNetworksLoading] = useState(true);
  const [networksError, setNetworksError] = useState<string | null>(null);

  // Derive enabled networks from networks state
  const enabledNetworks = useMemo(() => {
    const envNetworks = process.env.REACT_APP_OPENSCAN_NETWORKS;

    if (!envNetworks || envNetworks.trim() === "") {
      return networks;
    }

    // Parse comma-separated network IDs
    const enabledNetworkIds = envNetworks
      .split(",")
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !Number.isNaN(id));

    if (enabledNetworkIds.length === 0) {
      return networks;
    }

    // Filter networks by enabled network IDs, maintaining order from env var
    const filtered: NetworkConfig[] = [];
    for (const networkId of enabledNetworkIds) {
      const network = networks.find((n) => n.networkId === networkId);
      if (network) {
        filtered.push(network);
      }
    }

    return filtered.length > 0 ? filtered : networks;
  }, [networks]);

  const setRpcUrls = useCallback((next: RpcUrlsContextType) => {
    setRpcUrlsState(next);
    try {
      saveRpcUrlsToStorage(next);
    } catch (err) {
      console.warn("Failed to persist rpc urls", err);
    }
  }, []);

  // biome-ignore lint/suspicious/noExplicitAny: <TODO>
  const setJsonFiles = useCallback((next: Record<string, any>) => {
    setJsonFilesState(next);
    try {
      saveJsonFilesToStorage(next);
    } catch (err) {
      console.warn("Failed to persist json files", err);
    }
  }, []);

  // Hardhat network config for local development
  const hardhatNetwork: NetworkConfig = useMemo(
    () => ({
      networkId: 31337,
      name: "Hardhat",
      shortName: "hardhat",
      description: "Local development network",
      color: "#FFF100",
      currency: "ETH",
      isTestnet: true,
      rpc: {
        public: ["http://127.0.0.1:8545"],
      },
    }),
    [],
  );

  // Load networks from metadata
  const loadNetworkData = useCallback(async () => {
    setNetworksLoading(true);
    setNetworksError(null);

    try {
      const loadedNetworks = await loadNetworks();

      // Check if Hardhat should be included (only when both conditions are met)
      const envNetworks = process.env.REACT_APP_OPENSCAN_NETWORKS;
      const isDevelopment = process.env.REACT_APP_ENVIRONMENT === "development";
      const hardhatInEnv = envNetworks?.split(",").some((id) => id.trim() === "31337");

      // Add Hardhat network if in development AND explicitly enabled
      if (isDevelopment && hardhatInEnv && !loadedNetworks.some((n) => n.networkId === 31337)) {
        loadedNetworks.push(hardhatNetwork);
      }

      setNetworks(loadedNetworks);
      // Update RPC URLs with the newly loaded network defaults
      setRpcUrlsState(getEffectiveRpcUrls());
    } catch (err) {
      setNetworksError(err instanceof Error ? err.message : "Failed to load networks");
      setNetworks(getAllNetworks());
    } finally {
      setNetworksLoading(false);
    }
  }, [hardhatNetwork]);

  const _account = useAccount();
  const { isFullyConnected, address } = useWagmiConnection();

  // Mark as hydrated when component mounts (React has taken control)
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Load networks on mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: only run once on mount
  useEffect(() => {
    loadNetworkData();
  }, []);

  useEffect(() => {
    const checkResourcesLoaded = () => {
      // Check if all critical resources are loaded
      const images = Array.from(document.images);
      const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));

      const allImagesLoaded = images.every((img) => img.complete);
      const allStylesheetsLoaded = stylesheets.every((_link) => {
        // For external stylesheets, we assume they're loaded if the element exists
        return true; // You can add more sophisticated checking if needed
      });

      if (allImagesLoaded && allStylesheetsLoaded) {
        setResourcesLoaded(true);
      }
    };

    // Check immediately
    checkResourcesLoaded();

    // Also check after a short delay to catch any resources that might still be loading
    const timer = setTimeout(checkResourcesLoaded, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Wait for DOM to be ready
        if (document.readyState !== "complete") {
          await new Promise((resolve) => {
            if (document.readyState === "complete") {
              resolve(true);
            } else {
              window.addEventListener("load", () => resolve(true), {
                once: true,
              });
            }
          });
        }

        if (isFullyConnected && address) {
          //
        }

        // Mark app as ready
        setAppReady(true);
      } catch (error) {
        console.error("Error initializing app:", error);
        setAppReady(true); // Still mark as ready even if there's an error
      }
    };

    initializeApp();
  }, [isFullyConnected, address]);

  const contextValue = useMemo<IAppContext>(
    () => ({
      appReady,
      resourcesLoaded,
      isHydrated,
      rpcUrls,
      setRpcUrls,
      jsonFiles,
      setJsonFiles,
      // Network values
      networks,
      enabledNetworks,
      networksLoading,
      networksError,
      getNetwork: getNetworkById,
      reloadNetworks: loadNetworkData,
    }),
    [
      appReady,
      resourcesLoaded,
      isHydrated,
      rpcUrls,
      setRpcUrls,
      jsonFiles,
      setJsonFiles,
      networks,
      enabledNetworks,
      networksLoading,
      networksError,
      loadNetworkData,
    ],
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

// Hook to use networks from AppContext
export function useNetworks() {
  const context = useContext(AppContext);
  return {
    networks: context.networks,
    enabledNetworks: context.enabledNetworks,
    isLoading: context.networksLoading,
    error: context.networksError,
    getNetwork: context.getNetwork,
    reload: context.reloadNetworks,
  };
}

export function useNetwork(networkId: number): NetworkConfig | undefined {
  const { getNetwork } = useNetworks();
  return getNetwork(networkId);
}
