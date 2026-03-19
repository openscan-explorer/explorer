import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CallNode, PrestateTrace } from "../../../../services/adapters/NetworkAdapter";
import { useBeaconBlobs } from "../../../../hooks/useBeaconBlobs";
import { useCallTreeEnrichment } from "../../../../hooks/useCallTreeEnrichment";
import { type ContractInfo, fetchContractInfoBatch } from "../../../../utils/contractLookup";
import { useSettings } from "../../../../context/SettingsContext";
import { logger } from "../../../../utils/logger";
import BlobDataDisplay from "../../../common/BlobDataDisplay";
import type { AnalyserTab, TxAnalyserProps } from "./analyser/types";
import CallTreeTab from "./analyser/CallTreeTab";
import StateChangesTab from "./analyser/StateChangesTab";
import GasProfilerTab from "./analyser/GasProfilerTab";
import InputDataTab from "./analyser/InputDataTab";
import EventLogsTab from "./analyser/EventLogsTab";

const TxAnalyser: React.FC<TxAnalyserProps> = ({
  txHash,
  networkId,
  networkCurrency,
  dataService,
  logs,
  txToAddress,
  contractAbi,
  inputData,
  decodedInputData,
  isSuperUser,
  blobVersionedHashes,
  blockTimestamp,
}) => {
  const { t } = useTranslation("transaction");
  const hasEvents = logs && logs.length > 0;
  const hasInputData = inputData && inputData !== "0x";
  const hasBlobData = blobVersionedHashes && blobVersionedHashes.length > 0;
  const defaultTab: AnalyserTab = hasEvents ? "events" : hasInputData ? "inputData" : "callTree";
  const [activeTab, setActiveTab] = useState<AnalyserTab>(defaultTab);

  // Beacon blob data
  const caip2NetworkId = networkId ? `eip155:${networkId}` : undefined;
  const {
    blobs: blobSidecars,
    loading: blobsLoading,
    isPruned: blobsPruned,
    isAvailable: beaconAvailable,
  } = useBeaconBlobs(
    isSuperUser && hasBlobData ? caip2NetworkId : undefined,
    isSuperUser && hasBlobData && activeTab === "blobData" ? blockTimestamp : undefined,
    blobVersionedHashes,
  );

  // Reset to a base tab when leaving super user mode
  // biome-ignore lint/correctness/useExhaustiveDependencies: only react to isSuperUser changes
  useEffect(() => {
    if (isSuperUser) {
      setCollapsed(false);
    } else {
      const superTabs: AnalyserTab[] = ["callTree", "gasProfiler", "stateChanges", "blobData"];
      setActiveTab((prev) => (superTabs.includes(prev) ? defaultTab : prev));
    }
  }, [isSuperUser]);

  const [callTree, setCallTree] = useState<CallNode | null>(null);
  const [prestateTrace, setPrestateTrace] = useState<PrestateTrace | null>(null);
  const [loadingCallTree, setLoadingCallTree] = useState(false);
  const [loadingPrestate, setLoadingPrestate] = useState(false);
  const [callTreeError, setCallTreeError] = useState<string | null>(null);
  const [prestateError, setPrestateError] = useState<string | null>(null);

  // Contract name + ABI enrichment for the call tree
  const { contracts: treeContracts, enrichmentLoading } = useCallTreeEnrichment(
    callTree,
    networkId,
  );

  // Enrich log addresses independently (works for all users, not just super)
  const { settings } = useSettings();
  const [logContracts, setLogContracts] = useState<Record<string, ContractInfo>>({});
  const [logEnrichmentDone, setLogEnrichmentDone] = useState(false);
  const logAbortRef = useRef<AbortController | null>(null);

  // Stable key: sorted unique addresses from logs
  const logAddresses = logs
    ? Array.from(new Set(logs.map((l) => l.address?.toLowerCase()).filter(Boolean) as string[]))
    : [];
  const logAddressKey = logAddresses.join(",");

  useEffect(() => {
    if (!logAddressKey || !networkId) {
      setLogEnrichmentDone(true);
      return;
    }

    const addresses = logAddressKey.split(",");

    logAbortRef.current?.abort();
    const controller = new AbortController();
    logAbortRef.current = controller;

    setLogEnrichmentDone(false);

    const chainId = Number(networkId);
    fetchContractInfoBatch(addresses, chainId, controller.signal, settings.apiKeys?.etherscan)
      .then((map) => {
        if (!controller.signal.aborted) setLogContracts(map);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLogEnrichmentDone(true);
      });

    return () => controller.abort();
  }, [logAddressKey, networkId, settings.apiKeys?.etherscan]);

  // Merge tree + log contracts (tree contracts take priority since they include call tree addresses)
  const contracts = { ...logContracts, ...treeContracts };
  const logEnrichmentLoading = !!(logs && logs.length > 0) && !logEnrichmentDone;

  const isUnsupported = useCallback((msg: string) => {
    return /method not found|not supported|unsupported|does not exist/i.test(msg);
  }, []);

  // Load call tree on first render (super user only)
  useEffect(() => {
    if (!isSuperUser) return;
    if (callTree || callTreeError || loadingCallTree) return;
    setLoadingCallTree(true);
    dataService.networkAdapter
      .getAnalyserCallTrace(txHash)
      .then((data) => {
        if (data) {
          setCallTree(data);
        } else {
          setCallTreeError(t("analyser.notSupported"));
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn("TX Analyser call trace error:", msg);
        setCallTreeError(
          isUnsupported(msg) ? t("analyser.notSupported") : `${t("analyser.error")}: ${msg}`,
        );
      })
      .finally(() => setLoadingCallTree(false));
  }, [
    isSuperUser,
    txHash,
    dataService,
    callTree,
    callTreeError,
    loadingCallTree,
    t,
    isUnsupported,
  ]);

  // Load prestate when switching to that tab (super user only)
  useEffect(() => {
    if (!isSuperUser) return;
    if (activeTab !== "stateChanges") return;
    if (prestateTrace || prestateError || loadingPrestate) return;
    setLoadingPrestate(true);
    dataService.networkAdapter
      .getAnalyserPrestateTrace(txHash)
      .then((data) => {
        if (data) {
          setPrestateTrace(data);
        } else {
          setPrestateError(t("analyser.notSupported"));
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn("TX Analyser prestate trace error:", msg);
        setPrestateError(
          isUnsupported(msg) ? t("analyser.notSupported") : `${t("analyser.error")}: ${msg}`,
        );
      })
      .finally(() => setLoadingPrestate(false));
  }, [
    isSuperUser,
    activeTab,
    txHash,
    dataService,
    prestateTrace,
    prestateError,
    loadingPrestate,
    t,
    isUnsupported,
  ]);

  const [collapsed, setCollapsed] = useState(!isSuperUser);

  const handleTabClick = useCallback(
    (tab: AnalyserTab) => {
      if (tab === activeTab) {
        setCollapsed((c) => !c);
      } else {
        setActiveTab(tab);
        setCollapsed(false);
      }
    },
    [activeTab],
  );

  return (
    <div className="detail-panel">
      {/* Tab bar */}
      <div className="detail-panel-tabs">
        {hasEvents && (
          <button
            type="button"
            className={`detail-panel-tab${activeTab === "events" ? " detail-panel-tab--active-base" : ""}`}
            onClick={() => handleTabClick("events")}
          >
            {t("analyser.events")} ({logs.length})
          </button>
        )}
        {hasInputData && (
          <button
            type="button"
            className={`detail-panel-tab${activeTab === "inputData" ? " detail-panel-tab--active-base" : ""}`}
            onClick={() => handleTabClick("inputData")}
          >
            {t("analyser.inputDataTab")}
          </button>
        )}
        {isSuperUser && (
          <>
            <button
              type="button"
              className={`detail-panel-tab${activeTab === "callTree" ? " detail-panel-tab--active" : ""}`}
              onClick={() => handleTabClick("callTree")}
            >
              {t("analyser.callTree")}
            </button>
            <button
              type="button"
              className={`detail-panel-tab${activeTab === "gasProfiler" ? " detail-panel-tab--active" : ""}`}
              onClick={() => handleTabClick("gasProfiler")}
            >
              {t("analyser.gasProfiler")}
            </button>
            <button
              type="button"
              className={`detail-panel-tab${activeTab === "stateChanges" ? " detail-panel-tab--active" : ""}`}
              onClick={() => handleTabClick("stateChanges")}
            >
              {t("analyser.stateChanges")}
            </button>
            {hasBlobData && beaconAvailable && (
              <button
                type="button"
                className={`detail-panel-tab${activeTab === "blobData" ? " detail-panel-tab--active" : ""}`}
                onClick={() => handleTabClick("blobData")}
              >
                {t("blobData.title")} ({blobVersionedHashes.length})
              </button>
            )}
          </>
        )}
        <button
          type="button"
          className="detail-panel-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? t("analyser.expand") : t("analyser.collapse")}
        >
          {collapsed ? `▸ ${t("analyser.expand")}` : `▾ ${t("analyser.collapse")}`}
        </button>
      </div>

      {/* Tab content */}
      {!collapsed && (
        <div className="detail-panel-body">
          {activeTab === "callTree" && (
            <>
              {(loadingCallTree || enrichmentLoading) && (
                <div className="detail-panel-loading">
                  {loadingCallTree ? t("analyser.loading") : t("analyser.enriching")}
                </div>
              )}
              {callTreeError && (
                <div className="detail-panel-error">
                  <div>{callTreeError}</div>
                  {callTreeError === t("analyser.notSupported") && (
                    <div className="detail-panel-hint">{t("analyser.traceHint")}</div>
                  )}
                </div>
              )}
              {callTree && !enrichmentLoading && (
                <CallTreeTab
                  root={callTree}
                  networkId={networkId}
                  networkCurrency={networkCurrency}
                  contracts={contracts}
                  enrichmentLoading={false}
                />
              )}
            </>
          )}

          {activeTab === "gasProfiler" && (
            <>
              {(loadingCallTree || enrichmentLoading) && (
                <div className="detail-panel-loading">
                  {loadingCallTree ? t("analyser.loading") : t("analyser.enriching")}
                </div>
              )}
              {callTreeError && (
                <div className="detail-panel-error">
                  <div>{callTreeError}</div>
                  {callTreeError === t("analyser.notSupported") && (
                    <div className="detail-panel-hint">{t("analyser.traceHint")}</div>
                  )}
                </div>
              )}
              {callTree && !enrichmentLoading && (
                <GasProfilerTab root={callTree} networkId={networkId} contracts={contracts} />
              )}
            </>
          )}

          {activeTab === "stateChanges" && (
            <>
              {(loadingPrestate || enrichmentLoading) && (
                <div className="detail-panel-loading">
                  {loadingPrestate ? t("analyser.loading") : t("analyser.enriching")}
                </div>
              )}
              {prestateError && (
                <div className="detail-panel-error">
                  <div>{prestateError}</div>
                  {prestateError === t("analyser.notSupported") && (
                    <div className="detail-panel-hint">{t("analyser.traceHint")}</div>
                  )}
                </div>
              )}
              {prestateTrace && !enrichmentLoading && (
                <StateChangesTab
                  trace={prestateTrace}
                  networkId={networkId}
                  networkCurrency={networkCurrency}
                  contracts={contracts}
                />
              )}
            </>
          )}

          {activeTab === "events" && logs && logs.length > 0 && (
            <>
              {logEnrichmentLoading && (
                <div className="detail-panel-loading">{t("analyser.enriching")}</div>
              )}
              {!logEnrichmentLoading && (
                <EventLogsTab
                  logs={logs}
                  networkId={networkId}
                  txToAddress={txToAddress}
                  contractAbi={contractAbi}
                  contracts={contracts}
                />
              )}
            </>
          )}

          {activeTab === "inputData" && inputData && inputData !== "0x" && (
            <InputDataTab
              inputData={inputData}
              decodedInput={decodedInputData ?? null}
              networkId={networkId}
              contracts={contracts}
              txToAddress={txToAddress}
            />
          )}

          {activeTab === "blobData" && hasBlobData && (
            <div className="blob-section-list">
              {blobsLoading && <div className="detail-panel-loading">{t("blobData.loading")}</div>}
              {blobsPruned && <div className="detail-panel-error">{t("blobData.pruned")}</div>}
              {blobSidecars?.map((blob) => (
                <BlobDataDisplay key={blob.index} blob={blob} index={Number(blob.index)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TxAnalyser;
