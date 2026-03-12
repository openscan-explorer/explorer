import type React from "react";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MetaMaskIcon } from "../../common/MetaMaskIcon";
import { getEnabledNetworks } from "../../../config/networks";
import { AppContext, useNetworks } from "../../../context/AppContext";
import { useSettings } from "../../../context/SettingsContext";
import { useMetaMaskExplorer } from "../../../hooks/useMetaMaskExplorer";
import { SUPPORTED_LANGUAGES } from "../../../i18n";
import { clearSupportersCache } from "../../../services/MetadataService";
import type { MetadataRpcEndpoint } from "../../../services/MetadataService";
import type {
  AIProvider,
  NetworkType,
  PromptVersion,
  RPCUrls,
  RpcUrlsContextType,
} from "../../../types";
import { AI_PROVIDERS, AI_PROVIDER_ORDER } from "../../../config/aiProviders";
import { clearAICache } from "../../common/AIAnalysis/aiCache";
import { logger } from "../../../utils/logger";
import { getChainIdFromNetwork } from "../../../utils/networkResolver";
import { clearPersistentCache, getPersistentCacheSize } from "../../../utils/persistentCache";
import { clearMetadataRpcCache, getMetadataEndpointMap } from "../../../utils/rpcStorage";
import { sortRpcsByQuality } from "../../../utils/rpcAutoSync";
import { type RpcTestResult, testRpcEndpoint } from "../rpcs/useRpcLatencyTest";

// Infura network slugs by chain ID
const INFURA_NETWORKS: Record<number, string> = {
  1: "mainnet",
  11155111: "sepolia",
  42161: "arbitrum-mainnet",
  10: "optimism-mainnet",
  137: "polygon-mainnet",
  8453: "base-mainnet",
};

// Alchemy network slugs by chain ID
const ALCHEMY_NETWORKS: Record<number, string> = {
  1: "eth-mainnet",
  11155111: "eth-sepolia",
  42161: "arb-mainnet",
  10: "opt-mainnet",
  137: "polygon-mainnet",
  8453: "base-mainnet",
};

// Alchemy Bitcoin networks keyed by CAIP-2 networkId
const ALCHEMY_BTC_NETWORKS: Record<string, string> = {
  "bip122:000000000019d6689c085ae165831e93": "btc-mainnet",
  "bip122:00000000da84f2bafbbc53dee25a72ae": "btc-testnet",
};

const SETTINGS_ACTIVE_TAB_KEY = "openscan_settings_active_tab";

type SettingsTab = "network" | "providers" | "display" | "advanced";

const SETTINGS_TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: "network", label: "🌐 Network" },
  { id: "providers", label: "🔑 Providers" },
  { id: "display", label: "🎨 Display" },
  { id: "advanced", label: "🧪 Advanced" },
];

const isValidSettingsTab = (value: string | null): value is SettingsTab =>
  value === "network" || value === "providers" || value === "display" || value === "advanced";

const getInfuraUrl = (chainId: number, apiKey: string): string | null => {
  const slug = INFURA_NETWORKS[chainId];
  return slug ? `https://${slug}.infura.io/v3/${apiKey}` : null;
};

const getAlchemyUrl = (chainId: number, apiKey: string): string | null => {
  const slug = ALCHEMY_NETWORKS[chainId];
  return slug ? `https://${slug}.g.alchemy.com/v2/${apiKey}` : null;
};

const getAlchemyBtcUrl = (networkId: string, apiKey: string): string | null => {
  const slug = ALCHEMY_BTC_NETWORKS[networkId];
  return slug ? `https://${slug}.g.alchemy.com/v2/${apiKey}` : null;
};

const isInfuraUrl = (url: string): boolean => url.includes("infura.io");
const isAlchemyUrl = (url: string): boolean => url.includes("alchemy.com");

const Settings: React.FC = () => {
  const { t, i18n } = useTranslation("settings");
  const location = useLocation();
  const navigate = useNavigate();
  const { rpcUrls, setRpcUrls } = useContext(AppContext);
  const { settings, updateSettings, isSuperUser } = useSettings();
  const { enabledNetworks } = useNetworks();
  const { isMetaMaskAvailable, isSupported, setAsDefaultExplorer } = useMetaMaskExplorer();
  const [activeTab, setActiveTab] = useState<SettingsTab>("network");
  const [localRpc, setLocalRpc] = useState<Record<string, string | RPCUrls>>({
    ...rpcUrls,
  });
  const [cacheCleared, setCacheCleared] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{
    networkId: string;
    index: number;
  } | null>(null);
  const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set());
  const [localApiKeys, setLocalApiKeys] = useState({
    infura: settings.apiKeys?.infura || "",
    alchemy: settings.apiKeys?.alchemy || "",
    etherscan: settings.apiKeys?.etherscan || "",
    groq: settings.apiKeys?.groq || "",
    openai: settings.apiKeys?.openai || "",
    anthropic: settings.apiKeys?.anthropic || "",
    perplexity: settings.apiKeys?.perplexity || "",
    gemini: settings.apiKeys?.gemini || "",
  });
  const [showApiKeys, setShowApiKeys] = useState({
    infura: false,
    alchemy: false,
    etherscan: false,
    groq: false,
    openai: false,
    anthropic: false,
    perplexity: false,
    gemini: false,
  });
  const [aiKeysExpanded, setAiKeysExpanded] = useState(false);
  const [metamaskStatus, setMetamaskStatus] = useState<
    Record<string, "idle" | "loading" | "success" | "error">
  >({});
  const [persistentCacheBytes, setPersistentCacheBytes] = useState(() => getPersistentCacheSize());
  const [syncingChain, setSyncingChain] = useState<string | null>(null);
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const initialRenderRef = useRef(true);
  const saveTimerRef = useRef<number | null>(null);
  const savedHintTimerRef = useRef<number | null>(null);
  const lastSavedDraftRef = useRef<string>("");

  const normalizeRpcConfig = useCallback(
    (draft: Record<string, string | RPCUrls>): RpcUrlsContextType => {
      const normalized = Object.keys(draft)
        .sort()
        .reduce((acc, networkId) => {
          const value = draft[networkId];
          if (typeof value === "string") {
            acc[networkId] = value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);
            return acc;
          }

          if (Array.isArray(value)) {
            acc[networkId] = value.map((item) => item.trim()).filter(Boolean);
            return acc;
          }

          return acc;
        }, {} as RpcUrlsContextType);

      return normalized;
    },
    [],
  );

  const serializeDraft = useCallback(
    (draftRpc: Record<string, string | RPCUrls>, draftApiKeys: typeof localApiKeys): string => {
      const normalizedRpc = normalizeRpcConfig(draftRpc);
      const sortedRpcEntries = Object.keys(normalizedRpc)
        .sort()
        .map((networkId) => [networkId, normalizedRpc[networkId]]);

      const sortedApiEntries = Object.keys(draftApiKeys)
        .sort()
        .map((key) => [key, draftApiKeys[key as keyof typeof draftApiKeys]]);

      return JSON.stringify({ rpc: sortedRpcEntries, apiKeys: sortedApiEntries });
    },
    [normalizeRpcConfig],
  );

  const applyProviderUrlsToRpcs = useCallback(
    (
      parsedRpc: RpcUrlsContextType,
      previousApiKeys: { infura?: string; alchemy?: string },
      nextApiKeys: { infura: string; alchemy: string },
    ) => {
      const prevInfuraKey = previousApiKeys.infura || "";
      const prevAlchemyKey = previousApiKeys.alchemy || "";

      for (const chainId of Object.keys(INFURA_NETWORKS).map(Number)) {
        const networkId = `eip155:${chainId}`;
        let urls: string[] = (parsedRpc[networkId] as string[]) || [];

        const oldInfuraUrl = prevInfuraKey ? getInfuraUrl(chainId, prevInfuraKey) : null;
        const newInfuraUrl = nextApiKeys.infura ? getInfuraUrl(chainId, nextApiKeys.infura) : null;

        if (oldInfuraUrl && oldInfuraUrl !== newInfuraUrl) {
          urls = urls.filter((url) => url !== oldInfuraUrl);
        }

        if (newInfuraUrl && !urls.includes(newInfuraUrl)) {
          urls = [newInfuraUrl, ...urls];
        }

        parsedRpc[networkId] = urls;
      }

      for (const chainId of Object.keys(ALCHEMY_NETWORKS).map(Number)) {
        const networkId = `eip155:${chainId}`;
        let urls: string[] = (parsedRpc[networkId] as string[]) || [];

        const oldAlchemyUrl = prevAlchemyKey ? getAlchemyUrl(chainId, prevAlchemyKey) : null;
        const newAlchemyUrl = nextApiKeys.alchemy
          ? getAlchemyUrl(chainId, nextApiKeys.alchemy)
          : null;

        if (oldAlchemyUrl && oldAlchemyUrl !== newAlchemyUrl) {
          urls = urls.filter((url) => url !== oldAlchemyUrl);
        }

        if (newAlchemyUrl && !urls.includes(newAlchemyUrl)) {
          urls = [newAlchemyUrl, ...urls];
        }

        parsedRpc[networkId] = urls;
      }
    },
    [],
  );

  const persistConfiguration = useCallback(
    (
      draftRpc: Record<string, string | RPCUrls>,
      draftApiKeys: typeof localApiKeys,
      options?: { silent?: boolean },
    ) => {
      const parsedRpc = normalizeRpcConfig(draftRpc);

      const nextApiKeys = {
        infura: draftApiKeys.infura,
        alchemy: draftApiKeys.alchemy,
      };

      applyProviderUrlsToRpcs(parsedRpc, settings.apiKeys || {}, nextApiKeys);

      updateSettings({
        apiKeys: {
          infura: draftApiKeys.infura || undefined,
          alchemy: draftApiKeys.alchemy || undefined,
          etherscan: draftApiKeys.etherscan || undefined,
          groq: draftApiKeys.groq || undefined,
          openai: draftApiKeys.openai || undefined,
          anthropic: draftApiKeys.anthropic || undefined,
          perplexity: draftApiKeys.perplexity || undefined,
          gemini: draftApiKeys.gemini || undefined,
        },
      });

      setRpcUrls(parsedRpc);
      lastSavedDraftRef.current = serializeDraft(draftRpc, draftApiKeys);

      if (!options?.silent) {
        setAutoSaveState("saved");
        if (savedHintTimerRef.current) {
          window.clearTimeout(savedHintTimerRef.current);
        }
        savedHintTimerRef.current = window.setTimeout(() => {
          setAutoSaveState("idle");
        }, 1800);
      }
    },
    [
      applyProviderUrlsToRpcs,
      normalizeRpcConfig,
      serializeDraft,
      setRpcUrls,
      settings.apiKeys,
      updateSettings,
    ],
  );

  // Keep local inputs in sync when context values are updated from elsewhere.
  useEffect(() => {
    setLocalRpc({ ...rpcUrls });
  }, [rpcUrls]);

  useEffect(() => {
    setLocalApiKeys({
      infura: settings.apiKeys?.infura || "",
      alchemy: settings.apiKeys?.alchemy || "",
      etherscan: settings.apiKeys?.etherscan || "",
      groq: settings.apiKeys?.groq || "",
      openai: settings.apiKeys?.openai || "",
      anthropic: settings.apiKeys?.anthropic || "",
      perplexity: settings.apiKeys?.perplexity || "",
      gemini: settings.apiKeys?.gemini || "",
    });
  }, [settings.apiKeys]);

  // Hydrate active tab from URL (query/hash) or previous session.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabFromQuery = params.get("tab");
    const tabFromHash = location.hash ? location.hash.replace(/^#/, "") : null;

    let nextTab: SettingsTab | null = null;

    if (isValidSettingsTab(tabFromQuery)) {
      nextTab = tabFromQuery;
    } else if (isValidSettingsTab(tabFromHash)) {
      nextTab = tabFromHash;
    } else {
      const stored = localStorage.getItem(SETTINGS_ACTIVE_TAB_KEY);
      if (isValidSettingsTab(stored)) {
        nextTab = stored;
      }
    }

    if (!nextTab) {
      return;
    }

    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }

    localStorage.setItem(SETTINGS_ACTIVE_TAB_KEY, nextTab);

    if (!isValidSettingsTab(tabFromQuery) || tabFromQuery !== nextTab) {
      const updatedParams = new URLSearchParams(location.search);
      updatedParams.set("tab", nextTab);
      navigate(
        {
          pathname: location.pathname,
          search: `?${updatedParams.toString()}`,
          hash: `#${nextTab}`,
        },
        { replace: true },
      );
    }
  }, [activeTab, location.hash, location.pathname, location.search, navigate]);

  const handleTabChange = useCallback(
    (tab: SettingsTab) => {
      if (tab === activeTab) {
        return;
      }

      setActiveTab(tab);
      localStorage.setItem(SETTINGS_ACTIVE_TAB_KEY, tab);

      const updatedParams = new URLSearchParams(location.search);
      updatedParams.set("tab", tab);

      navigate(
        {
          pathname: location.pathname,
          search: `?${updatedParams.toString()}`,
          hash: `#${tab}`,
        },
        { replace: true },
      );
    },
    [activeTab, location.pathname, location.search, navigate],
  );

  useEffect(() => {
    const currentDraft = serializeDraft(localRpc, localApiKeys);

    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      lastSavedDraftRef.current = currentDraft;
      return;
    }

    if (currentDraft === lastSavedDraftRef.current) {
      return;
    }

    setAutoSaveState("saving");

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      persistConfiguration(localRpc, localApiKeys);
      saveTimerRef.current = null;
    }, 450);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [localApiKeys, localRpc, persistConfiguration, serializeDraft]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        const currentDraft = serializeDraft(localRpc, localApiKeys);
        if (currentDraft !== lastSavedDraftRef.current) {
          persistConfiguration(localRpc, localApiKeys, { silent: true });
        }
      }

      if (savedHintTimerRef.current) {
        window.clearTimeout(savedHintTimerRef.current);
      }
    };
  }, [localApiKeys, localRpc, persistConfiguration, serializeDraft]);

  const updateField = useCallback((networkId: string, value: string) => {
    setLocalRpc((prev) => ({ ...prev, [networkId]: value }));
  }, []);

  // Toggle chain section expand/collapse
  const toggleChainExpanded = (networkId: string) => {
    setExpandedChains((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(networkId)) {
        newSet.delete(networkId);
      } else {
        newSet.add(networkId);
      }
      return newSet;
    });
  };

  // Clear all caches
  const clearAllCaches = useCallback(() => {
    clearSupportersCache();
    clearMetadataRpcCache();
    localStorage.removeItem("openscan_cache");
    clearAICache();
    clearPersistentCache();
    setPersistentCacheBytes(0);
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 3000);
    // Clear RPC sync timestamp so RPCs are re-sorted on next load
    localStorage.removeItem("openScan_lastRpcSyncTime");
  }, []);

  // Clear all site data (like browser dev tools)
  const clearSiteData = useCallback(async () => {
    if (!window.confirm(t("cacheData.clearSiteData.confirmMessage"))) {
      return;
    }

    localStorage.clear();
    sessionStorage.clear();

    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=")[0]?.trim();
      if (name) {
        // biome-ignore lint/suspicious/noDocumentCookie: Required to clear cookies
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    }

    if (window.indexedDB?.databases) {
      try {
        const databases = await window.indexedDB.databases();
        for (const db of databases) {
          if (db.name) {
            window.indexedDB.deleteDatabase(db.name);
          }
        }
      } catch (e) {
        logger.warn("Could not clear IndexedDB:", e);
      }
    }

    if ("caches" in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      } catch (e) {
        logger.warn("Could not clear Cache Storage:", e);
      }
    }

    if ("serviceWorker" in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
      } catch (e) {
        logger.warn("Could not unregister service workers:", e);
      }
    }

    window.location.reload();
  }, [t]);

  // Helper to get URLs as array from localRpc
  const getLocalRpcArray = useCallback(
    (networkId: string): string[] => {
      const value = localRpc[networkId];
      if (Array.isArray(value)) return [...value];
      if (typeof value === "string") {
        return value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return [];
    },
    [localRpc],
  );

  // Helper to get URLs as string for input display
  const getLocalRpcString = (networkId: string): string => {
    const value = localRpc[networkId];
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "string") return value;
    return "";
  };

  // Build URL→endpoint lookup map from cached metadata
  const metadataUrlMap = useMemo(() => {
    const endpointMap = getMetadataEndpointMap();
    const urlMap = new Map<string, MetadataRpcEndpoint>();
    for (const endpoints of Object.values(endpointMap)) {
      for (const ep of endpoints) {
        urlMap.set(ep.url, ep);
      }
    }
    return urlMap;
  }, []);

  const getRpcTagClass = useCallback(
    (url: string): string => {
      if (isInfuraUrl(url) || isAlchemyUrl(url)) return "rpc-tracking";
      const ep = metadataUrlMap.get(url);
      if (!ep) return "";
      if (ep.tracking !== "none") return "rpc-tracking";
      if (ep.isOpenSource) return "rpc-opensource";
      return "rpc-private";
    },
    [metadataUrlMap],
  );

  const getRpcTagLabel = useCallback(
    (url: string): string => {
      if (isInfuraUrl(url)) return "Infura Personal";
      if (isAlchemyUrl(url)) return "Alchemy Personal";
      const ep = metadataUrlMap.get(url);
      if (ep?.provider && ep.provider.toLowerCase() !== "unknown") return ep.provider;
      try {
        return new URL(url).hostname;
      } catch {
        return url;
      }
    },
    [metadataUrlMap],
  );

  const copyToClipboard = useCallback((url: string) => {
    navigator.clipboard.writeText(url);
  }, []);

  const handleSetMetaMaskExplorer = useCallback(
    async (networkId: string, chainId: number | undefined) => {
      if (chainId === undefined) return;

      const network = enabledNetworks.find((n) => n.networkId === networkId);
      if (!network) return;

      const networkRpcUrls = rpcUrls[networkId] || [];

      setMetamaskStatus((prev) => ({ ...prev, [networkId]: "loading" }));

      const result = await setAsDefaultExplorer(
        {
          type: network.type,
          networkId: network.networkId,
          chainId: chainId,
          name: network.name,
          shortName: network.shortName,
          currency: network.currency,
        },
        networkRpcUrls,
      );

      setMetamaskStatus((prev) => ({
        ...prev,
        [networkId]: result.success ? "success" : "error",
      }));

      if (result.success) {
        setTimeout(() => {
          setMetamaskStatus((prev) => ({ ...prev, [networkId]: "idle" }));
        }, 3000);
      }
    },
    [enabledNetworks, rpcUrls, setAsDefaultExplorer],
  );

  const deleteRpc = useCallback((networkId: string, index: number) => {
    setLocalRpc((prev) => {
      const currentValue = prev[networkId];
      const currentUrls = Array.isArray(currentValue)
        ? [...currentValue]
        : typeof currentValue === "string"
          ? currentValue
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
      currentUrls.splice(index, 1);
      return {
        ...prev,
        [networkId]: currentUrls,
      };
    });
  }, []);

  const handleDragStart = useCallback((networkId: string, index: number) => {
    setDraggedItem({ networkId, index });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (networkId: string, dropIndex: number) => {
      if (!draggedItem || draggedItem.networkId !== networkId) {
        setDraggedItem(null);
        return;
      }

      setLocalRpc((prev) => {
        const currentValue = prev[networkId];
        const currentUrls = Array.isArray(currentValue)
          ? [...currentValue]
          : typeof currentValue === "string"
            ? currentValue
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [];
        const draggedUrl = currentUrls.splice(draggedItem.index, 1)[0];
        if (!draggedUrl) return prev;
        currentUrls.splice(dropIndex, 0, draggedUrl);
        return {
          ...prev,
          [networkId]: currentUrls,
        };
      });
      setDraggedItem(null);
    },
    [draggedItem],
  );

  const handleSyncRpcs = useCallback(
    async (chainId: string, networkType: NetworkType) => {
      const urls = getLocalRpcArray(chainId);
      if (urls.length < 2) return;
      setSyncingChain(chainId);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const allResults = await Promise.all(
        urls.map((url) => testRpcEndpoint(url, controller.signal, networkType)),
      );
      clearTimeout(timeout);

      const resultsMap = new Map<string, RpcTestResult>();
      for (const r of allResults) {
        resultsMap.set(r.url, r);
      }
      const sorted = sortRpcsByQuality(urls, resultsMap, metadataUrlMap);
      updateField(chainId, sorted.join(","));
      setSyncingChain(null);
    },
    [getLocalRpcArray, metadataUrlMap, updateField],
  );

  const chainConfigs = useMemo(() => {
    return getEnabledNetworks().map((network) => {
      const chainId = getChainIdFromNetwork(network);
      return {
        id: network.networkId,
        chainId: chainId,
        name: network.name,
        type: network.type,
      };
    });
  }, []);

  // Filter out keyless providers (openscan-groq) — they don't need user-configured keys
  type KeyRequiredProvider = Exclude<AIProvider, "openscan-groq">;
  const keyRequiredProviders = AI_PROVIDER_ORDER.filter(
    (id): id is KeyRequiredProvider => AI_PROVIDERS[id].keyUrl !== "",
  );
  const primaryAIProviderId = keyRequiredProviders[0] ?? ("groq" as KeyRequiredProvider);
  const otherAIProviderIds = keyRequiredProviders.filter(
    (providerId) => providerId !== primaryAIProviderId,
  );

  const autoSaveMessage =
    autoSaveState === "saving"
      ? "Saving…"
      : autoSaveState === "saved"
        ? "Saved"
        : "Auto-save enabled";

  return (
    <>
      {cacheCleared && (
        <div className="settings-toast-container">
          <div className="settings-toast settings-toast-success">✓ {t("toasts.cacheCleared")}</div>
        </div>
      )}

      <div className="container-medium page-container-padded">
        <div className="page-card settings-container">
          <h1 className="page-title-small">{t("pageTitle")}</h1>

          <div className="settings-tabs-shell">
            <div className="settings-tabs-mobile">
              <select
                value={activeTab}
                onChange={(e) => handleTabChange(e.target.value as SettingsTab)}
                className="settings-tabs-mobile-select"
              >
                {SETTINGS_TABS.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}
                  </option>
                ))}
              </select>
              <span className="settings-tabs-mobile-arrow">▼</span>
            </div>

            <div className="settings-tabs" role="tablist" aria-label="Settings tabs">
              {SETTINGS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`settings-panel-${tab.id}`}
                  id={`settings-tab-${tab.id}`}
                  className={`settings-tab ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => handleTabChange(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-tab-panel-wrap">
            {activeTab === "display" && (
              <div
                id="settings-panel-display"
                className="settings-tab-panel"
                role="tabpanel"
                aria-labelledby="settings-tab-display"
              >
                <div className="settings-grid settings-tab-grid">
                  <div className="settings-section no-margin">
                    <h2 className="settings-section-title">🎨 {t("appearance.title")}</h2>
                    <p className="settings-section-description">{t("appearance.description")}</p>

                    <div className="settings-item">
                      <div>
                        <div className="settings-item-label">
                          {t("appearance.backgroundBlocks.label")}
                        </div>
                        <div className="settings-item-description">
                          {t("appearance.backgroundBlocks.description")}
                        </div>
                      </div>
                      <label className="settings-toggle">
                        <input
                          type="checkbox"
                          checked={settings.showBackgroundBlocks ?? true}
                          onChange={(e) =>
                            updateSettings({ showBackgroundBlocks: e.target.checked })
                          }
                          className="settings-toggle-input"
                        />
                        <span
                          className={`settings-toggle-slider ${settings.showBackgroundBlocks ? "active" : ""}`}
                        >
                          <span
                            className={`settings-toggle-knob ${settings.showBackgroundBlocks ? "active" : ""}`}
                          />
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="settings-section no-margin">
                    <h2 className="settings-section-title">🌐 {t("language.title")}</h2>
                    <p className="settings-section-description">{t("language.description")}</p>

                    <div className="settings-item">
                      <div>
                        <div className="settings-item-label">{t("language.label")}</div>
                        <div className="settings-item-description">
                          {t("language.selectDescription")}
                        </div>
                      </div>
                      <select
                        value={i18n.language}
                        onChange={(e) => i18n.changeLanguage(e.target.value)}
                        className="settings-select"
                      >
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "providers" && (
              <div
                id="settings-panel-providers"
                className="settings-tab-panel"
                role="tabpanel"
                aria-labelledby="settings-tab-providers"
              >
                <div className="settings-autosave-row">
                  <span className={`settings-autosave-pill ${autoSaveState}`}>
                    {autoSaveMessage}
                  </span>
                </div>

                <div className="settings-grid settings-tab-grid">
                  <div className="settings-section no-margin">
                    <h2 className="settings-section-title">🔑 {t("apiKeys.title")}</h2>
                    <p className="settings-section-description">{t("apiKeys.description")}</p>

                    <div className="settings-api-key-item">
                      <div className="settings-api-key-header">
                        <span className="settings-api-key-name">{t("apiKeys.infura.name")}</span>
                        <a
                          href="https://app.infura.io/dashboard"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="settings-api-key-link"
                        >
                          {t("apiKeys.infura.getKey")} →
                        </a>
                      </div>
                      <div className="settings-api-key-input-wrapper">
                        <input
                          type={showApiKeys.infura ? "text" : "password"}
                          className="settings-rpc-input"
                          value={localApiKeys.infura}
                          onChange={(e) =>
                            setLocalApiKeys((prev) => ({ ...prev, infura: e.target.value }))
                          }
                          placeholder={t("apiKeys.infura.placeholder")}
                        />
                        <button
                          type="button"
                          className="settings-api-key-toggle"
                          onClick={() =>
                            setShowApiKeys((prev) => ({ ...prev, infura: !prev.infura }))
                          }
                          title={
                            showApiKeys.infura ? t("apiKeys.toggleHide") : t("apiKeys.toggleShow")
                          }
                        >
                          {showApiKeys.infura ? "👁️" : "👁️‍🗨️"}
                        </button>
                      </div>
                    </div>

                    <div className="settings-api-key-item">
                      <div className="settings-api-key-header">
                        <span className="settings-api-key-name">{t("apiKeys.alchemy.name")}</span>
                        <a
                          href="https://dashboard.alchemy.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="settings-api-key-link"
                        >
                          {t("apiKeys.alchemy.getKey")} →
                        </a>
                      </div>
                      <div className="settings-api-key-input-wrapper">
                        <input
                          type={showApiKeys.alchemy ? "text" : "password"}
                          className="settings-rpc-input"
                          value={localApiKeys.alchemy}
                          onChange={(e) =>
                            setLocalApiKeys((prev) => ({ ...prev, alchemy: e.target.value }))
                          }
                          placeholder={t("apiKeys.alchemy.placeholder")}
                        />
                        <button
                          type="button"
                          className="settings-api-key-toggle"
                          onClick={() =>
                            setShowApiKeys((prev) => ({ ...prev, alchemy: !prev.alchemy }))
                          }
                          title={
                            showApiKeys.alchemy ? t("apiKeys.toggleHide") : t("apiKeys.toggleShow")
                          }
                        >
                          {showApiKeys.alchemy ? "👁️" : "👁️‍🗨️"}
                        </button>
                      </div>
                    </div>

                    <div className="settings-api-key-item">
                      <div className="settings-api-key-header">
                        <span className="settings-api-key-name">{t("apiKeys.etherscan.name")}</span>
                        <a
                          href="https://etherscan.io/myapikey"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="settings-api-key-link"
                        >
                          {t("apiKeys.etherscan.getKey")} →
                        </a>
                      </div>
                      <div className="settings-api-key-input-wrapper">
                        <input
                          type={showApiKeys.etherscan ? "text" : "password"}
                          className="settings-rpc-input"
                          value={localApiKeys.etherscan}
                          onChange={(e) =>
                            setLocalApiKeys((prev) => ({ ...prev, etherscan: e.target.value }))
                          }
                          placeholder={t("apiKeys.etherscan.placeholder")}
                        />
                        <button
                          type="button"
                          className="settings-api-key-toggle"
                          onClick={() =>
                            setShowApiKeys((prev) => ({ ...prev, etherscan: !prev.etherscan }))
                          }
                          title={
                            showApiKeys.etherscan
                              ? t("apiKeys.toggleHide")
                              : t("apiKeys.toggleShow")
                          }
                        >
                          {showApiKeys.etherscan ? "👁️" : "👁️‍🗨️"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="settings-section no-margin">
                    <h2 className="settings-section-title">🤖 {t("apiKeys.aiTitle")}</h2>
                    <p className="settings-section-description">{t("apiKeys.aiDescription")}</p>

                    <div className="settings-api-key-item">
                      <div className="settings-api-key-header">
                        <span className="settings-api-key-name">
                          {t(`apiKeys.${primaryAIProviderId}.name`)}
                        </span>
                        <a
                          href={AI_PROVIDERS[primaryAIProviderId].keyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="settings-api-key-link"
                        >
                          {t(`apiKeys.${primaryAIProviderId}.getKey`)} →
                        </a>
                      </div>
                      <div className="settings-api-key-input-wrapper">
                        <input
                          type={showApiKeys[primaryAIProviderId] ? "text" : "password"}
                          className="settings-rpc-input"
                          value={localApiKeys[primaryAIProviderId]}
                          onChange={(e) =>
                            setLocalApiKeys((prev) => ({
                              ...prev,
                              [primaryAIProviderId]: e.target.value,
                            }))
                          }
                          placeholder={t(`apiKeys.${primaryAIProviderId}.placeholder`)}
                        />
                        <button
                          type="button"
                          className="settings-api-key-toggle"
                          onClick={() =>
                            setShowApiKeys((prev) => ({
                              ...prev,
                              [primaryAIProviderId]: !prev[primaryAIProviderId],
                            }))
                          }
                          title={
                            showApiKeys[primaryAIProviderId]
                              ? t("apiKeys.toggleHide")
                              : t("apiKeys.toggleShow")
                          }
                        >
                          {showApiKeys[primaryAIProviderId] ? "👁️" : "👁️‍🗨️"}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="settings-section-collapse-button"
                      onClick={() => setAiKeysExpanded((prev) => !prev)}
                      aria-expanded={aiKeysExpanded}
                      aria-controls="settings-ai-other-providers"
                    >
                      {aiKeysExpanded ? t("apiKeys.aiProvidersHide") : t("apiKeys.aiProvidersShow")}{" "}
                      <span aria-hidden="true">{aiKeysExpanded ? "▲" : "▼"}</span>
                    </button>

                    {aiKeysExpanded && (
                      <div id="settings-ai-other-providers" className="settings-ai-other-providers">
                        {otherAIProviderIds.map((providerId) => {
                          const provider = AI_PROVIDERS[providerId];
                          return (
                            <div key={providerId} className="settings-api-key-item">
                              <div className="settings-api-key-header">
                                <span className="settings-api-key-name">
                                  {t(`apiKeys.${providerId}.name`)}
                                </span>
                                <a
                                  href={provider.keyUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="settings-api-key-link"
                                >
                                  {t(`apiKeys.${providerId}.getKey`)} →
                                </a>
                              </div>
                              <div className="settings-api-key-input-wrapper">
                                <input
                                  type={showApiKeys[providerId] ? "text" : "password"}
                                  className="settings-rpc-input"
                                  value={localApiKeys[providerId]}
                                  onChange={(e) =>
                                    setLocalApiKeys((prev) => ({
                                      ...prev,
                                      [providerId]: e.target.value,
                                    }))
                                  }
                                  placeholder={t(`apiKeys.${providerId}.placeholder`)}
                                />
                                <button
                                  type="button"
                                  className="settings-api-key-toggle"
                                  onClick={() =>
                                    setShowApiKeys((prev) => ({
                                      ...prev,
                                      [providerId]: !prev[providerId],
                                    }))
                                  }
                                  title={
                                    showApiKeys[providerId]
                                      ? t("apiKeys.toggleHide")
                                      : t("apiKeys.toggleShow")
                                  }
                                >
                                  {showApiKeys[providerId] ? "👁️" : "👁️‍🗨️"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="settings-item">
                      <div>
                        <div className="settings-item-label">
                          {t("apiKeys.promptVersion.label")}
                        </div>
                        <div className="settings-item-description">
                          {t("apiKeys.promptVersion.description")}
                        </div>
                      </div>
                      <select
                        value={settings.promptVersion || "stable"}
                        onChange={(e) =>
                          updateSettings({ promptVersion: e.target.value as PromptVersion })
                        }
                        className="settings-select"
                      >
                        <option value="stable">{t("apiKeys.promptVersion.stable")}</option>
                        <option value="latest">{t("apiKeys.promptVersion.latest")}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "network" && (
              <div
                id="settings-panel-network"
                className="settings-tab-panel"
                role="tabpanel"
                aria-labelledby="settings-tab-network"
              >
                <div className="settings-autosave-row">
                  <span className={`settings-autosave-pill ${autoSaveState}`}>
                    {autoSaveMessage}
                  </span>
                </div>

                <div className="settings-section no-margin-bottom">
                  <h2 className="settings-section-title">⚡ {t("rpcStrategy.title")}</h2>
                  <p className="settings-section-description">{t("rpcStrategy.description")}</p>

                  <div className="settings-item">
                    <div>
                      <div className="settings-item-label">
                        {t("rpcStrategy.requestStrategy.label")}
                      </div>
                      <div className="settings-item-description">
                        <strong>Fallback:</strong> {t("rpcStrategy.requestStrategy.fallbackDesc")}
                        <br />
                        <strong>Parallel:</strong> {t("rpcStrategy.requestStrategy.parallelDesc")}
                        <br />
                        <strong>Race:</strong> {t("rpcStrategy.requestStrategy.raceDesc")}
                      </div>
                    </div>
                    <select
                      value={settings.rpcStrategy || "fallback"}
                      onChange={(e) =>
                        updateSettings({
                          rpcStrategy: e.target.value as "fallback" | "parallel" | "race",
                        })
                      }
                      className="settings-select"
                    >
                      <option value="fallback">{t("rpcStrategy.requestStrategy.fallback")}</option>
                      <option value="parallel">{t("rpcStrategy.requestStrategy.parallel")}</option>
                      <option value="race">{t("rpcStrategy.requestStrategy.race")}</option>
                    </select>
                  </div>

                  {(settings.rpcStrategy === "parallel" || settings.rpcStrategy === "race") && (
                    <div className="settings-item">
                      <div>
                        <div className="settings-item-label">
                          {t("rpcStrategy.maxParallelRequests.label")}
                        </div>
                        <div className="settings-item-description">
                          {t("rpcStrategy.maxParallelRequests.description")}
                        </div>
                      </div>
                      <select
                        value={settings.maxParallelRequests ?? 3}
                        onChange={(e) =>
                          updateSettings({ maxParallelRequests: Number(e.target.value) })
                        }
                        className="settings-select"
                      >
                        <option value={1}>{t("rpcStrategy.maxParallelRequests.option1")}</option>
                        <option value={2}>{t("rpcStrategy.maxParallelRequests.option2")}</option>
                        <option value={3}>{t("rpcStrategy.maxParallelRequests.option3")}</option>
                        <option value={5}>{t("rpcStrategy.maxParallelRequests.option5")}</option>
                        <option value={10}>{t("rpcStrategy.maxParallelRequests.option10")}</option>
                        <option value={0}>
                          {t("rpcStrategy.maxParallelRequests.optionUnlimited")}
                        </option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="settings-section">
                  <div className="settings-section-title-row">
                    <h2 className="settings-section-title">🔗 {t("rpcEndpoints.title")}</h2>
                    <Link to="/rpcs" className="settings-section-link">
                      {t("rpcEndpoints.testEndpoints")} →
                    </Link>
                  </div>
                  <p className="settings-section-description">{t("rpcEndpoints.description")}</p>

                  <div className="flex-start settings-rpc-legend">
                    <span className="settings-rpc-tag rpc-opensource">
                      {t("rpcEndpoints.legendOpensource")}
                    </span>
                    <span className="settings-rpc-tag rpc-private">
                      {t("rpcEndpoints.legendPrivate")}
                    </span>
                    <span className="settings-rpc-tag rpc-tracking">
                      {t("rpcEndpoints.legendTracking")}
                    </span>
                  </div>

                  <div className="flex-column settings-chain-list">
                    {chainConfigs.map((chain) => {
                      const isExpanded = expandedChains.has(chain.id);
                      const rpcCount = getLocalRpcArray(chain.id).length;

                      return (
                        <div key={chain.id} className="settings-chain-item">
                          <div className="settings-chain-header">
                            <button
                              type="button"
                              className="settings-chain-header-toggle"
                              onClick={() => toggleChainExpanded(chain.id)}
                            >
                              <span
                                className={`settings-chain-chevron ${isExpanded ? "expanded" : ""}`}
                              >
                                ▶
                              </span>
                              <span className="settings-chain-name-text">{chain.name}</span>
                              <span className="settings-chain-id-badge">
                                {chain.chainId !== undefined ? `Chain ${chain.chainId}` : chain.id}
                              </span>
                            </button>
                            {isMetaMaskAvailable && chain.chainId !== undefined && (
                              <button
                                type="button"
                                className={`settings-metamask-button ${metamaskStatus[chain.id] === "success" ? "success" : ""} ${metamaskStatus[chain.id] === "loading" ? "loading" : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetMetaMaskExplorer(chain.id, chain.chainId);
                                }}
                                disabled={
                                  !isSupported(chain.chainId) ||
                                  metamaskStatus[chain.id] === "loading"
                                }
                                title={
                                  !isSupported(chain.chainId)
                                    ? t("rpcEndpoints.metamask.notSupported")
                                    : metamaskStatus[chain.id] === "success"
                                      ? t("rpcEndpoints.metamask.configured")
                                      : t("rpcEndpoints.metamask.setDefault")
                                }
                              >
                                <MetaMaskIcon size={16} />
                                <span>
                                  {metamaskStatus[chain.id] === "loading"
                                    ? t("rpcEndpoints.metamask.configuring")
                                    : metamaskStatus[chain.id] === "success"
                                      ? t("rpcEndpoints.metamask.configuredText")
                                      : t("rpcEndpoints.metamask.useAsDefault")}
                                </span>
                              </button>
                            )}
                            <button
                              type="button"
                              className={`settings-sync-button ${syncingChain === chain.id ? "loading" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSyncRpcs(chain.id, chain.type);
                              }}
                              disabled={syncingChain !== null || rpcCount < 2}
                              title={t("rpcEndpoints.syncRpcs")}
                            >
                              {syncingChain === chain.id
                                ? t("rpcEndpoints.syncing")
                                : t("rpcEndpoints.syncRpcs")}
                            </button>
                            <span className="settings-chain-rpc-count">
                              {rpcCount} RPC{rpcCount !== 1 ? "s" : ""}
                            </span>
                          </div>

                          {isExpanded && (
                            <div className="settings-chain-content">
                              <input
                                className="settings-rpc-input"
                                value={getLocalRpcString(chain.id)}
                                onChange={(e) => updateField(chain.id, e.target.value)}
                                placeholder="https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY"
                              />

                              {chain.chainId === 31337 && (
                                <div className="settings-help-text">
                                  💡 {t("rpcEndpoints.localhostHelp")}{" "}
                                  <a
                                    href="https://dashboard.ngrok.com/get-started/setup"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="settings-link"
                                  >
                                    {t("rpcEndpoints.localhostHelpLink")}
                                  </a>
                                </div>
                              )}

                              {(() => {
                                const rpcArray = getLocalRpcArray(chain.id);
                                if (rpcArray.length === 0) return null;
                                return (
                                  <div className="flex-column settings-rpc-list">
                                    <span className="settings-rpc-list-label">
                                      {t("rpcEndpoints.currentRPCs")}
                                    </span>
                                    <div className="flex-start settings-rpc-tags">
                                      {rpcArray.map((url, idx) => (
                                        <div
                                          key={url}
                                          className={`settings-rpc-tag ${getRpcTagClass(url)} ${draggedItem?.networkId === chain.id && draggedItem?.index === idx ? "dragging" : ""}`}
                                          title={url}
                                          draggable
                                          onDragStart={() => handleDragStart(chain.id, idx)}
                                          onDragOver={handleDragOver}
                                          onDrop={() => handleDrop(chain.id, idx)}
                                          onDragEnd={() => setDraggedItem(null)}
                                          onClick={() => copyToClipboard(url)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ")
                                              copyToClipboard(url);
                                          }}
                                        >
                                          <span className="settings-rpc-tag-index">{idx + 1}</span>
                                          <span className="settings-rpc-tag-provider">
                                            {getRpcTagLabel(url)}
                                          </span>
                                          <button
                                            type="button"
                                            className="settings-rpc-tag-delete"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteRpc(chain.id, idx);
                                            }}
                                            title={t("rpcEndpoints.removeRpc")}
                                          >
                                            ×
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "advanced" && (
              <div
                id="settings-panel-advanced"
                className="settings-tab-panel"
                role="tabpanel"
                aria-labelledby="settings-tab-advanced"
              >
                <div className="settings-grid settings-tab-grid">
                  <div className="settings-section no-margin">
                    <h2 className="settings-section-title">🗑️ {t("cacheData.title")}</h2>
                    <p className="settings-section-description">{t("cacheData.description")}</p>

                    <div className="settings-item">
                      <div>
                        <div className="settings-item-label">{t("cacheData.clearCache.label")}</div>
                        <div className="settings-item-description">
                          {t("cacheData.clearCache.description")}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="settings-clear-cache-button"
                        onClick={clearAllCaches}
                      >
                        🗑️ {t("cacheData.clearCache.button")}
                      </button>
                    </div>

                    <br />

                    <div className="settings-item">
                      <div>
                        <div className="settings-item-label">
                          {t("cacheData.clearSiteData.label")}
                        </div>
                        <div className="settings-item-description">
                          {t("cacheData.clearSiteData.description")}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="settings-clear-site-data-button"
                        onClick={clearSiteData}
                      >
                        ⚠️ {t("cacheData.clearSiteData.button")}
                      </button>
                    </div>
                  </div>

                  {isSuperUser && (
                    <div className="settings-section no-margin">
                      <h2 className="settings-section-title">{t("superUser.title")}</h2>
                      <p className="settings-section-description">{t("superUser.description")}</p>

                      <div className="settings-item">
                        <div>
                          <div className="settings-item-label">
                            {t("superUser.persistentCache.sizeLimit.label")}
                          </div>
                          <div className="settings-item-description">
                            {t("superUser.persistentCache.sizeLimit.description")}
                          </div>
                        </div>
                        <select
                          value={settings.persistentCacheSizeMB ?? 10}
                          onChange={(e) =>
                            updateSettings({ persistentCacheSizeMB: Number(e.target.value) })
                          }
                          className="settings-select"
                        >
                          <option value={5}>5 MB</option>
                          <option value={10}>10 MB</option>
                          <option value={25}>25 MB</option>
                          <option value={50}>50 MB</option>
                          <option value={100}>100 MB</option>
                        </select>
                      </div>

                      <div className="settings-item">
                        <div>
                          <div className="settings-item-label">
                            {t("superUser.persistentCache.label")}
                          </div>
                          <div className="settings-item-description">
                            {t("superUser.persistentCache.usage", {
                              used: `${(persistentCacheBytes / (1024 * 1024)).toFixed(2)} MB`,
                              limit: `${settings.persistentCacheSizeMB ?? 10} MB`,
                            })}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="settings-clear-cache-button"
                          onClick={() => {
                            clearPersistentCache();
                            setPersistentCacheBytes(0);
                          }}
                        >
                          {t("superUser.persistentCache.clear.button")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings;
