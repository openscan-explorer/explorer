import type React from "react";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getEnabledNetworks } from "../../../config/networks";
import { AppContext } from "../../../context/AppContext";
import { useSettings } from "../../../context/SettingsContext";
import { clearSupportersCache } from "../../../services/MetadataService";
import type { RPCUrls, RpcUrlsContextType } from "../../../types";

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

const getInfuraUrl = (chainId: number, apiKey: string): string | null => {
  const slug = INFURA_NETWORKS[chainId];
  return slug ? `https://${slug}.infura.io/v3/${apiKey}` : null;
};

const getAlchemyUrl = (chainId: number, apiKey: string): string | null => {
  const slug = ALCHEMY_NETWORKS[chainId];
  return slug ? `https://${slug}.g.alchemy.com/v2/${apiKey}` : null;
};

const isInfuraUrl = (url: string): boolean => url.includes("infura.io");
const isAlchemyUrl = (url: string): boolean => url.includes("alchemy.com");

const getProviderBadge = (url: string): string | null => {
  if (isInfuraUrl(url)) return "INFURA";
  if (isAlchemyUrl(url)) return "ALCHEMY";
  return null;
};

const Settings: React.FC = () => {
  const { rpcUrls, setRpcUrls } = useContext(AppContext);
  const { settings, updateSettings } = useSettings();
  const [localRpc, setLocalRpc] = useState<Record<number, string | RPCUrls>>({
    ...rpcUrls,
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ chainId: number; index: number } | null>(null);
  const [fetchingChainId, setFetchingChainId] = useState<number | null>(null);
  const [expandedChains, setExpandedChains] = useState<Set<number>>(new Set());
  const [localApiKeys, setLocalApiKeys] = useState({
    infura: settings.apiKeys?.infura || "",
    alchemy: settings.apiKeys?.alchemy || "",
  });
  const [showApiKeys, setShowApiKeys] = useState({
    infura: false,
    alchemy: false,
  });

  // Sync localRpc when context rpcUrls changes (e.g., after save)
  useEffect(() => {
    setLocalRpc({ ...rpcUrls });
  }, [rpcUrls]);

  const updateField = (key: keyof RpcUrlsContextType, value: string) => {
    setLocalRpc((prev) => ({ ...prev, [key]: value }));
  };

  // Toggle chain section expand/collapse
  const toggleChainExpanded = (chainId: number) => {
    setExpandedChains((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chainId)) {
        newSet.delete(chainId);
      } else {
        newSet.add(chainId);
      }
      return newSet;
    });
  };

  // Clear all caches
  const clearAllCaches = useCallback(() => {
    // Clear metadata service caches
    clearSupportersCache();
    // Clear localStorage caches if any
    localStorage.removeItem("openscan_cache");
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 3000);
  }, []);

  // Clear all site data (like browser dev tools)
  const clearSiteData = useCallback(async () => {
    if (
      !window.confirm(
        "This will clear all settings, RPC configurations, API keys, and cached data. The page will reload. Continue?",
      )
    ) {
      return;
    }

    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();

    // Clear all cookies for this site
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=")[0]?.trim();
      if (name) {
        // biome-ignore lint/suspicious/noDocumentCookie: Required to clear cookies
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    }

    // Clear IndexedDB databases
    if (window.indexedDB?.databases) {
      try {
        const databases = await window.indexedDB.databases();
        for (const db of databases) {
          if (db.name) {
            window.indexedDB.deleteDatabase(db.name);
          }
        }
      } catch (e) {
        console.warn("Could not clear IndexedDB:", e);
      }
    }

    // Clear Cache Storage (Service Worker caches)
    if ("caches" in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      } catch (e) {
        console.warn("Could not clear Cache Storage:", e);
      }
    }

    // Unregister service workers
    if ("serviceWorker" in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
      } catch (e) {
        console.warn("Could not unregister service workers:", e);
      }
    }

    window.location.reload();
  }, []);

  // Helper to get URLs as array from localRpc
  const getLocalRpcArray = (chainId: number): string[] => {
    const value = localRpc[chainId];
    if (Array.isArray(value)) return [...value];
    if (typeof value === "string") {
      return value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  };

  // Helper to get URLs as string for input display
  const getLocalRpcString = (chainId: number): string => {
    const value = localRpc[chainId];
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "string") return value;
    return "";
  };

  // Fetch RPCs from Chainlist API
  const fetchFromChainlist = useCallback(async (chainId: number) => {
    setFetchingChainId(chainId);
    try {
      const response = await fetch("https://chainlist.org/rpcs.json");
      if (!response.ok) throw new Error("Failed to fetch from Chainlist");

      const chains = await response.json();
      const chain = chains.find((c: { chainId: number }) => c.chainId === chainId);

      if (!chain?.rpc) {
        throw new Error(`No RPCs found for chain ${chainId}`);
      }

      // Filter for tracking: "none" and extract URLs
      const newUrls = chain.rpc
        .filter((rpc: { tracking?: string }) => rpc.tracking === "none")
        .map((rpc: { url: string }) => rpc.url)
        .filter((url: string) => url && !url.includes("${"))
        .filter((url: string) => !url.startsWith("wss://"));

      if (newUrls.length === 0) {
        throw new Error(`No privacy-friendly RPCs found for chain ${chainId}`);
      }

      // Merge with existing URLs, avoiding duplicates
      setLocalRpc((prev) => {
        const currentValue = prev[chainId];
        const existingUrls = Array.isArray(currentValue)
          ? currentValue
          : typeof currentValue === "string"
            ? currentValue
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [];
        const mergedUrls = Array.from(new Set([...existingUrls, ...newUrls]));
        return {
          ...prev,
          [chainId]: mergedUrls,
        };
      });
    } catch (error) {
      console.error("Error fetching from Chainlist:", error);
    } finally {
      setFetchingChainId(null);
    }
  }, []);

  const deleteRpc = useCallback((chainId: number, index: number) => {
    setLocalRpc((prev) => {
      const currentValue = prev[chainId];
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
        [chainId]: currentUrls,
      };
    });
  }, []);

  const handleDragStart = useCallback((chainId: number, index: number) => {
    setDraggedItem({ chainId, index });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (chainId: number, dropIndex: number) => {
      if (!draggedItem || draggedItem.chainId !== chainId) {
        setDraggedItem(null);
        return;
      }

      setLocalRpc((prev) => {
        const currentValue = prev[chainId];
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
          [chainId]: currentUrls,
        };
      });
      setDraggedItem(null);
    },
    [draggedItem],
  );

  const save = () => {
    // Convert comma-separated strings into arrays for each chainId
    const parsed: RpcUrlsContextType = Object.keys(localRpc).reduce((acc, key) => {
      const k = Number(key) as unknown as keyof RpcUrlsContextType;
      // biome-ignore lint/suspicious/noExplicitAny: <TODO>
      const val = (localRpc as any)[k];
      if (typeof val === "string") {
        const arr = val
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        // biome-ignore lint/suspicious/noExplicitAny: <TODO>
        (acc as any)[k] = arr;
      } else {
        // biome-ignore lint/suspicious/noExplicitAny: <TODO>
        (acc as any)[k] = val;
      }
      return acc;
    }, {} as RpcUrlsContextType);

    // Get previous API keys from settings
    const prevInfuraKey = settings.apiKeys?.infura || "";
    const prevAlchemyKey = settings.apiKeys?.alchemy || "";

    // Process each chain to add/remove provider URLs
    for (const chainId of Object.keys(INFURA_NETWORKS).map(Number)) {
      const key = chainId as unknown as keyof RpcUrlsContextType;
      // biome-ignore lint/suspicious/noExplicitAny: <TODO>
      let urls: string[] = (parsed as any)[key] || [];

      // Handle Infura
      const oldInfuraUrl = prevInfuraKey ? getInfuraUrl(chainId, prevInfuraKey) : null;
      const newInfuraUrl = localApiKeys.infura ? getInfuraUrl(chainId, localApiKeys.infura) : null;

      // Remove old Infura URL if key changed or removed
      if (oldInfuraUrl && oldInfuraUrl !== newInfuraUrl) {
        urls = urls.filter((u) => u !== oldInfuraUrl);
      }
      // Add new Infura URL if key added and not already present
      if (newInfuraUrl && !urls.includes(newInfuraUrl)) {
        urls = [newInfuraUrl, ...urls];
      }

      // biome-ignore lint/suspicious/noExplicitAny: <TODO>
      (parsed as any)[key] = urls;
    }

    for (const chainId of Object.keys(ALCHEMY_NETWORKS).map(Number)) {
      const key = chainId as unknown as keyof RpcUrlsContextType;
      // biome-ignore lint/suspicious/noExplicitAny: <TODO>
      let urls: string[] = (parsed as any)[key] || [];

      // Handle Alchemy
      const oldAlchemyUrl = prevAlchemyKey ? getAlchemyUrl(chainId, prevAlchemyKey) : null;
      const newAlchemyUrl = localApiKeys.alchemy
        ? getAlchemyUrl(chainId, localApiKeys.alchemy)
        : null;

      // Remove old Alchemy URL if key changed or removed
      if (oldAlchemyUrl && oldAlchemyUrl !== newAlchemyUrl) {
        urls = urls.filter((u) => u !== oldAlchemyUrl);
      }
      // Add new Alchemy URL if key added and not already present
      if (newAlchemyUrl && !urls.includes(newAlchemyUrl)) {
        urls = [newAlchemyUrl, ...urls];
      }

      // biome-ignore lint/suspicious/noExplicitAny: <TODO>
      (parsed as any)[key] = urls;
    }

    // Save API keys to settings
    updateSettings({
      apiKeys: {
        infura: localApiKeys.infura || undefined,
        alchemy: localApiKeys.alchemy || undefined,
      },
    });

    setRpcUrls(parsed);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Get enabled networks from config
  const chainConfigs = useMemo(() => {
    return getEnabledNetworks().map((network) => ({
      id: network.networkId,
      name: network.name,
    }));
  }, []);

  return (
    <>
      {/* Fixed Toast Notifications */}
      {(saveSuccess || cacheCleared) && (
        <div className="settings-toast-container">
          {saveSuccess && (
            <div className="settings-toast settings-toast-success">
              ✓ Settings saved successfully!
            </div>
          )}
          {cacheCleared && (
            <div className="settings-toast settings-toast-success">✓ Cache cleared!</div>
          )}
        </div>
      )}

      <div className="container-medium page-container-padded">
        <div className="page-card settings-container">
          <h1 className="page-title-small">Settings</h1>

          {/* Settings Grid: 2x2 layout */}
          <div className="settings-grid">
            {/* Appearance Settings Section */}
            <div className="settings-section no-margin">
              <h2 className="settings-section-title">🎨 Appearance</h2>
              <p className="settings-section-description">
                Customize the visual appearance of the application.
              </p>

              <div className="settings-item">
                <div>
                  <div className="settings-item-label">Funny Background Blocks</div>
                  <div className="settings-item-description">
                    Show animated isometric blocks in the background
                  </div>
                </div>
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={settings.showBackgroundBlocks ?? true}
                    onChange={(e) => updateSettings({ showBackgroundBlocks: e.target.checked })}
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

            {/* Cache & Data Section */}
            <div className="settings-section no-margin">
              <h2 className="settings-section-title">🗑️ Cache & Data</h2>
              <p className="settings-section-description">
                Manage cached data and application storage.
              </p>

              <div className="settings-item">
                <div>
                  <div className="settings-item-label">Clear Cache</div>
                  <div className="settings-item-description">
                    Clear cached metadata without losing your settings.
                  </div>
                </div>
                <button
                  type="button"
                  className="settings-clear-cache-button"
                  onClick={clearAllCaches}
                >
                  🗑️ Clear Cache
                </button>
              </div>
              <br />
              <div className="settings-item">
                <div>
                  <div className="settings-item-label">Clear Site Data</div>
                  <div className="settings-item-description">
                    Clear all data including settings, RPC configs, and API keys.
                  </div>
                </div>
                <button
                  type="button"
                  className="settings-clear-site-data-button"
                  onClick={clearSiteData}
                >
                  ⚠️ Clear Site Data
                </button>
              </div>
            </div>

            {/* RPC Strategy Section */}
            <div className="settings-section no-margin">
              <h2 className="settings-section-title">⚡ RPC Strategy</h2>
              <p className="settings-section-description">
                Choose how requests are sent to multiple RPC endpoints.
              </p>

              <div className="settings-item">
                <div>
                  <div className="settings-item-label">Request Strategy</div>
                  <div className="settings-item-description">
                    <strong>Fallback:</strong> Try endpoints one by one until one succeeds.
                    <br />
                    <strong>Parallel:</strong> Query all endpoints simultaneously.
                  </div>
                </div>
                <select
                  value={settings.rpcStrategy || "fallback"}
                  onChange={(e) =>
                    updateSettings({
                      rpcStrategy: e.target.value as "fallback" | "parallel",
                    })
                  }
                  className="settings-select"
                >
                  <option value="fallback">Fallback (Default)</option>
                  <option value="parallel">Parallel</option>
                </select>
              </div>

              {/* Max Parallel Requests - Only show when parallel mode is active */}
              {settings.rpcStrategy === "parallel" && (
                <div className="settings-item">
                  <div>
                    <div className="settings-item-label">Max Parallel Requests</div>
                    <div className="settings-item-description">
                      Limit how many RPC endpoints are queried simultaneously. Lower values reduce
                      bandwidth usage. Uses the first N endpoints from your RPC list (reorder by
                      dragging).
                    </div>
                  </div>
                  <select
                    value={settings.maxParallelRequests ?? 3}
                    onChange={(e) =>
                      updateSettings({
                        maxParallelRequests: Number(e.target.value),
                      })
                    }
                    className="settings-select"
                  >
                    <option value={1}>1 endpoint</option>
                    <option value={2}>2 endpoints</option>
                    <option value={3}>3 endpoints (Default)</option>
                    <option value={5}>5 endpoints</option>
                    <option value={10}>10 endpoints</option>
                    <option value={0}>Unlimited</option>
                  </select>
                </div>
              )}
            </div>

            {/* API Keys Section */}
            <div className="settings-section no-margin">
              <h2 className="settings-section-title">🔑 API Keys</h2>
              <p className="settings-section-description">Enter your API keys for RPC providers.</p>

              <div className="settings-api-key-item">
                <div className="settings-api-key-header">
                  <span className="settings-api-key-name">Infura</span>
                  <a
                    href="https://app.infura.io/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="settings-api-key-link"
                  >
                    Get Key →
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
                    placeholder="Enter your Infura API key"
                  />
                  <button
                    type="button"
                    className="settings-api-key-toggle"
                    onClick={() => setShowApiKeys((prev) => ({ ...prev, infura: !prev.infura }))}
                    title={showApiKeys.infura ? "Hide API key" : "Show API key"}
                  >
                    {showApiKeys.infura ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
              </div>

              <div className="settings-api-key-item">
                <div className="settings-api-key-header">
                  <span className="settings-api-key-name">Alchemy</span>
                  <a
                    href="https://dashboard.alchemy.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="settings-api-key-link"
                  >
                    Get Key →
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
                    placeholder="Enter your Alchemy API key"
                  />
                  <button
                    type="button"
                    className="settings-api-key-toggle"
                    onClick={() => setShowApiKeys((prev) => ({ ...prev, alchemy: !prev.alchemy }))}
                    title={showApiKeys.alchemy ? "Hide API key" : "Show API key"}
                  >
                    {showApiKeys.alchemy ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button - positioned after general settings */}
          <div className="settings-save-section">
            <button type="button" onClick={save} className="settings-save-button">
              💾 Save Configuration
            </button>
          </div>

          {/* RPC Configuration Section */}
          <div className="settings-section">
            <h2 className="settings-section-title">🔗 RPC Endpoints</h2>
            <p className="settings-section-description">
              Configure RPC URLs for each network. Click on a network to expand and configure its
              endpoints.
            </p>

            <div className="flex-column settings-chain-list">
              {chainConfigs.map((chain) => {
                const isExpanded = expandedChains.has(chain.id);
                const rpcCount = getLocalRpcArray(chain.id).length;

                return (
                  <div key={chain.id} className="settings-chain-item">
                    {/* Collapsible Header */}
                    <button
                      type="button"
                      className="settings-chain-header"
                      onClick={() => toggleChainExpanded(chain.id)}
                    >
                      <div className="settings-chain-header-left">
                        <span className={`settings-chain-chevron ${isExpanded ? "expanded" : ""}`}>
                          ▶
                        </span>
                        <span className="settings-chain-name-text">{chain.name}</span>
                        <span className="settings-chain-id-badge">Chain ID: {chain.id}</span>
                      </div>
                      <span className="settings-chain-rpc-count">
                        {rpcCount} RPC{rpcCount !== 1 ? "s" : ""}
                      </span>
                    </button>

                    {/* Collapsible Content */}
                    {isExpanded && (
                      <div className="settings-chain-content">
                        <div className="settings-chain-actions">
                          <button
                            type="button"
                            className="settings-fetch-rpc-button"
                            onClick={() => fetchFromChainlist(chain.id)}
                            disabled={fetchingChainId === chain.id}
                          >
                            {fetchingChainId === chain.id ? "Fetching..." : "Fetch from Chainlist"}
                          </button>
                        </div>

                        <input
                          className="settings-rpc-input"
                          value={getLocalRpcString(chain.id)}
                          onChange={(e) =>
                            updateField(chain.id as keyof RpcUrlsContextType, e.target.value)
                          }
                          placeholder="https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY"
                        />

                        {/* Help text for localhost network */}
                        {chain.id === 31337 && (
                          <div className="settings-help-text">
                            💡 Need to access your local network remotely?{" "}
                            <a
                              href="https://dashboard.ngrok.com/get-started/setup"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="settings-link"
                            >
                              Learn how to set up a tunnel with ngrok
                            </a>
                          </div>
                        )}

                        {/* Display current RPC list as tags */}
                        {(() => {
                          const rpcArray = getLocalRpcArray(chain.id);
                          if (rpcArray.length === 0) return null;
                          return (
                            <div className="flex-column settings-rpc-list">
                              <span className="settings-rpc-list-label">Current RPCs:</span>
                              <div className="flex-start settings-rpc-tags">
                                {rpcArray.map((url, idx) => (
                                  // biome-ignore lint/a11y/noStaticElementInteractions: Drag-and-drop requires these handlers
                                  <div
                                    key={url}
                                    className={`settings-rpc-tag ${draggedItem?.chainId === chain.id && draggedItem?.index === idx ? "dragging" : ""}`}
                                    draggable
                                    onDragStart={() => handleDragStart(chain.id, idx)}
                                    onDragOver={handleDragOver}
                                    onDrop={() => handleDrop(chain.id, idx)}
                                    onDragEnd={() => setDraggedItem(null)}
                                  >
                                    <span className="settings-rpc-tag-index">{idx + 1}</span>
                                    {getProviderBadge(url) ? (
                                      <span className="settings-rpc-tag-provider">
                                        {getProviderBadge(url)}
                                      </span>
                                    ) : (
                                      <span className="settings-rpc-tag-url">{url}</span>
                                    )}
                                    <button
                                      type="button"
                                      className="settings-rpc-tag-delete"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteRpc(chain.id, idx);
                                      }}
                                      title="Remove RPC"
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
      </div>
    </>
  );
};

export default Settings;
