import type React from "react";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { AppContext, useNetworks } from "../../../context/AppContext";
import type { MetadataRpcEndpoint } from "../../../services/MetadataService";
import type { NetworkConfig } from "../../../types";
import { getMetadataEndpointMap } from "../../../utils/rpcStorage";
import { NetworkIcon } from "../../common/NetworkIcon";
import RpcTestRow from "./RpcTestRow";
import { useRpcLatencyTest } from "./useRpcLatencyTest";

type SortField = "provider" | "latency" | "status";
type SortDirection = "asc" | "desc";

interface EndpointEntry {
  url: string;
  metadata: MetadataRpcEndpoint | undefined;
}

interface NetworkDropdownProps {
  networks: NetworkConfig[];
  selectedId: string;
  onSelect: (networkId: string) => void;
}

const NetworkDropdown: React.FC<NetworkDropdownProps> = ({ networks, selectedId, onSelect }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = networks.find((n) => n.networkId === selectedId);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="rpcs-dropdown" ref={ref}>
      <button
        type="button"
        className="rpcs-dropdown-trigger"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected && (
          <span className="rpcs-dropdown-icon">
            <NetworkIcon network={selected} size={20} />
          </span>
        )}
        <span className="rpcs-dropdown-label">{selected?.name ?? "—"}</span>
        <span className="rpcs-dropdown-chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="rpcs-dropdown-list">
          {networks.map((network) => (
            <button
              key={network.networkId}
              type="button"
              className={`rpcs-dropdown-option ${network.networkId === selectedId ? "rpcs-dropdown-option-active" : ""}`}
              onClick={() => {
                onSelect(network.networkId);
                setOpen(false);
              }}
              onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
            >
              <span className="rpcs-dropdown-icon">
                <NetworkIcon network={network} size={18} />
              </span>
              <span className="rpcs-dropdown-option-name">{network.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

function getProviderName(url: string, metadata: MetadataRpcEndpoint | undefined): string {
  if (metadata?.provider && metadata.provider.toLowerCase() !== "unknown") {
    return metadata.provider;
  }
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

const RPCs: React.FC = () => {
  const { t } = useTranslation("rpcs");
  const [searchParams, setSearchParams] = useSearchParams();
  const { rpcUrls } = useContext(AppContext);
  const { enabledNetworks } = useNetworks();
  const { results, isTesting, testAll, testSingle, clearResults } = useRpcLatencyTest();

  // Selected network from URL param or default to first network
  const selectedNetworkId = searchParams.get("network") || enabledNetworks[0]?.networkId || "";

  const selectedNetwork = useMemo(
    () => enabledNetworks.find((n) => n.networkId === selectedNetworkId),
    [enabledNetworks, selectedNetworkId],
  );

  const networkType = selectedNetwork?.type ?? "evm";

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("latency");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Build URL-to-metadata lookup map
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

  // Get endpoints for selected network: metadata endpoints + user-added that aren't in metadata
  const endpoints: EndpointEntry[] = useMemo(() => {
    if (!selectedNetworkId) return [];

    const endpointMap = getMetadataEndpointMap();
    const metadataEndpoints = endpointMap[selectedNetworkId] ?? [];
    const userUrls = rpcUrls[selectedNetworkId] ?? [];

    // Start with metadata endpoints
    const seen = new Set<string>();
    const entries: EndpointEntry[] = [];

    for (const ep of metadataEndpoints) {
      if (!seen.has(ep.url)) {
        seen.add(ep.url);
        entries.push({ url: ep.url, metadata: ep });
      }
    }

    // Add user-configured URLs that aren't in metadata
    for (const url of userUrls) {
      if (!seen.has(url)) {
        seen.add(url);
        entries.push({ url, metadata: metadataUrlMap.get(url) });
      }
    }

    return entries;
  }, [selectedNetworkId, rpcUrls, metadataUrlMap]);

  // Active URLs set for quick lookup
  const activeUrls = useMemo(() => {
    const urls = rpcUrls[selectedNetworkId] ?? [];
    return new Set(urls);
  }, [rpcUrls, selectedNetworkId]);

  // Sorted endpoints
  const sortedEndpoints = useMemo(() => {
    const sorted = [...endpoints];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "provider": {
          const nameA = getProviderName(a.url, a.metadata).toLowerCase();
          const nameB = getProviderName(b.url, b.metadata).toLowerCase();
          cmp = nameA.localeCompare(nameB);
          break;
        }
        case "latency": {
          const resultA = results.get(a.url);
          const resultB = results.get(b.url);
          const hasLatencyA = resultA?.status === "online" && resultA.latency != null;
          const hasLatencyB = resultB?.status === "online" && resultB.latency != null;
          // Always push non-online endpoints to the end, regardless of sort direction
          if (!hasLatencyA && !hasLatencyB) {
            cmp = 0;
            break;
          }
          if (!hasLatencyA) return 1;
          if (!hasLatencyB) return -1;
          cmp = (resultA.latency as number) - (resultB.latency as number);
          break;
        }
        case "status": {
          const statusOrder: Record<string, number> = {
            online: 0,
            pending: 1,
            timeout: 2,
            offline: 3,
            untested: 4,
          };
          const sA = statusOrder[results.get(a.url)?.status ?? "untested"] ?? 4;
          const sB = statusOrder[results.get(b.url)?.status ?? "untested"] ?? 4;
          cmp = sA - sB;
          break;
        }
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [endpoints, sortField, sortDirection, results]);

  // Handle sort column click
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    },
    [sortField],
  );

  // Handle network selection
  const handleNetworkChange = useCallback(
    (networkId: string) => {
      setSearchParams({ network: networkId });
      clearResults();
    },
    [setSearchParams, clearResults],
  );

  // Auto-test when network selection changes (endpoints and testAll derive from it)
  // biome-ignore lint/correctness/useExhaustiveDependencies: only re-run on network change
  useEffect(() => {
    if (endpoints.length > 0) {
      const urls = endpoints.map((e) => e.url);
      testAll(urls, networkType);
    }
  }, [selectedNetworkId]);

  // Handle test all
  const handleTestAll = useCallback(() => {
    const urls = endpoints.map((e) => e.url);
    testAll(urls, networkType);
  }, [endpoints, testAll, networkType]);

  const getSortIndicator = (field: SortField): string => {
    if (sortField !== field) return "";
    return sortDirection === "asc" ? " \u25B2" : " \u25BC";
  };

  return (
    <div className="container-wide page-container-padded">
      <div className="page-card rpcs-container">
        <h1 className="page-title-small">{t("pageTitle")}</h1>
        <p className="rpcs-description">{t("description")}</p>

        {/* Network selector and actions */}
        <div className="rpcs-toolbar">
          <div className="rpcs-network-selector">
            <span className="rpcs-selector-label">{t("networkSelector.label")}</span>
            <NetworkDropdown
              networks={enabledNetworks}
              selectedId={selectedNetworkId}
              onSelect={handleNetworkChange}
            />
          </div>

          <div className="rpcs-actions-bar">
            {/* Legend */}
            <div className="rpcs-legend">
              <span className="settings-rpc-tag rpc-opensource">{t("legend.opensource")}</span>
              <span className="settings-rpc-tag rpc-private">{t("legend.private")}</span>
              <span className="settings-rpc-tag rpc-tracking">{t("legend.tracking")}</span>
            </div>

            <button
              type="button"
              className="rpcs-test-all-button"
              onClick={handleTestAll}
              disabled={isTesting || endpoints.length === 0}
            >
              {isTesting ? t("actions.testing") : t("actions.testAll")}
            </button>
          </div>
        </div>

        {/* Results table */}
        {endpoints.length === 0 ? (
          <div className="rpcs-empty">{t("empty.noEndpoints")}</div>
        ) : (
          <div className="rpcs-table">
            {/* Table header - desktop only */}
            <div className="rpcs-header">
              <button
                type="button"
                className="rpcs-header-cell rpcs-header-provider"
                onClick={() => handleSort("provider")}
              >
                {t("table.provider")}
                {getSortIndicator("provider")}
              </button>
              <button
                type="button"
                className="rpcs-header-cell rpcs-header-latency"
                onClick={() => handleSort("latency")}
              >
                {t("table.latency")}
                {getSortIndicator("latency")}
              </button>
              <button
                type="button"
                className="rpcs-header-cell rpcs-header-status"
                onClick={() => handleSort("status")}
              >
                {t("table.status")}
                {getSortIndicator("status")}
              </button>
              <div className="rpcs-header-cell rpcs-header-block">{t("table.block")}</div>
              <div className="rpcs-header-cell rpcs-header-tracking">{t("table.tracking")}</div>
              <div className="rpcs-header-cell rpcs-header-actions">{t("table.actions")}</div>
            </div>

            {/* Rows */}
            {sortedEndpoints.map((entry) => (
              <RpcTestRow
                key={entry.url}
                url={entry.url}
                metadata={entry.metadata}
                result={results.get(entry.url)}
                isActive={activeUrls.has(entry.url)}
                onRetest={(url) => testSingle(url, networkType)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RPCs;
