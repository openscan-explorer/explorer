import type React from "react";
import { useCallback, useContext, useMemo, useState } from "react";
import { getEnabledNetworks } from "../../../config/networks";
import { AppContext } from "../../../context/AppContext";
import { useSettings } from "../../../context/SettingsContext";
import type { RPCUrls, RpcUrlsContextType } from "../../../types";

const Settings: React.FC = () => {
  const { rpcUrls, setRpcUrls } = useContext(AppContext);
  const { settings, updateSettings } = useSettings();
  const [localRpc, setLocalRpc] = useState<Record<number, string | RPCUrls>>({
    ...rpcUrls,
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ chainId: number; index: number } | null>(null);
  const [fetchingChainId, setFetchingChainId] = useState<number | null>(null);

  const updateField = (key: keyof RpcUrlsContextType, value: string) => {
    setLocalRpc((prev) => ({ ...prev, [key]: value }));
  };

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
        .filter((url: string) => url && !url.includes("${"));

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
          .filter(Boolean); // Previene errores por multiples comas (,,,)
        // biome-ignore lint/suspicious/noExplicitAny: <TODO>
        (acc as any)[k] = arr;
      } else {
        // biome-ignore lint/suspicious/noExplicitAny: <TODO>
        (acc as any)[k] = val;
      }
      return acc;
    }, {} as RpcUrlsContextType);

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
    <div className="container-medium page-container-padded">
      <div className="page-card settings-container">
        <h1 className="page-title-small">Settings</h1>

        {/* Success Message */}
        {saveSuccess && (
          <div className="settings-success-message">✓ Settings saved successfully!</div>
        )}

        {/* Top Row: Appearance and RPC Strategy side by side */}
        <div className="settings-top-row">
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
          </div>
        </div>

        {/* RPC Configuration Section */}
        <div className="settings-section">
          <h2 className="settings-section-title">🔗 RPC Endpoints</h2>
          <p className="settings-section-description">
            Enter comma-separated RPC URLs for each network. Multiple URLs provide fallback support.
          </p>

          <div className="flex-column settings-chain-list">
            {chainConfigs.map((chain) => (
              <div key={chain.id} className="settings-chain-item">
                <div className="flex-column settings-chain-label">
                  <div className="settings-chain-name">
                    {chain.name}
                    <span className="settings-chain-id-badge">Chain ID: {chain.id}</span>
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
                              <span className="settings-rpc-tag-url">{url}</span>
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
              </div>
            ))}

            {/** biome-ignore lint/a11y/useButtonType: <TODO> */}
            <button onClick={save} className="settings-save-button">
              💾 Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
