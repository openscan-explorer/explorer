import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  CallNode,
  PrestateTrace,
  TraceResult,
} from "../../../../services/adapters/NetworkAdapter";
import { useCallTreeEnrichment } from "../../../../hooks/useCallTreeEnrichment";
import { type ContractInfo, fetchContractInfoBatch } from "../../../../utils/contractLookup";
import { useSettings } from "../../../../context/SettingsContext";
import HelperTooltip from "../../../common/HelperTooltip";
import { logger } from "../../../../utils/logger";
import type { AnalyserTab, TxAnalyserProps } from "./analyser/types";
import CallTreeTab from "./analyser/CallTreeTab";
import StateChangesTab from "./analyser/StateChangesTab";
import GasProfilerTab from "./analyser/GasProfilerTab";
import RawTraceTab from "./analyser/RawTraceTab";
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
}) => {
  const { t } = useTranslation("transaction");
  const { t: tTooltips } = useTranslation("tooltips");
  const hasEvents = logs && logs.length > 0;
  const hasInputData = inputData && inputData !== "0x";
  const defaultTab: AnalyserTab = hasEvents ? "events" : hasInputData ? "inputData" : "callTree";
  const [activeTab, setActiveTab] = useState<AnalyserTab>(defaultTab);

  // Reset to a base tab when leaving super user mode
  // biome-ignore lint/correctness/useExhaustiveDependencies: only react to isSuperUser changes
  useEffect(() => {
    if (isSuperUser) {
      setCollapsed(false);
    } else {
      const superTabs: AnalyserTab[] = ["callTree", "gasProfiler", "stateChanges", "rawTrace"];
      setActiveTab((prev) => (superTabs.includes(prev) ? defaultTab : prev));
    }
  }, [isSuperUser]);

  const [callTree, setCallTree] = useState<CallNode | null>(null);
  const [prestateTrace, setPrestateTrace] = useState<PrestateTrace | null>(null);
  const [rawTrace, setRawTrace] = useState<TraceResult | null>(null);
  const [loadingCallTree, setLoadingCallTree] = useState(false);
  const [loadingPrestate, setLoadingPrestate] = useState(false);
  const [loadingRawTrace, setLoadingRawTrace] = useState(false);
  const [callTreeError, setCallTreeError] = useState<string | null>(null);
  const [prestateError, setPrestateError] = useState<string | null>(null);
  const [rawTraceError, setRawTraceError] = useState<string | null>(null);

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

  // Load raw trace when switching to that tab (super user only)
  useEffect(() => {
    if (!isSuperUser) return;
    if (activeTab !== "rawTrace") return;
    if (rawTrace || rawTraceError || loadingRawTrace) return;
    setLoadingRawTrace(true);
    dataService.networkAdapter
      .getTransactionTrace(txHash)
      .then((data) => {
        if (data) {
          setRawTrace(data);
        } else {
          setRawTraceError(t("analyser.notSupported"));
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn("TX Analyser raw trace error:", msg);
        setRawTraceError(
          isUnsupported(msg) ? t("analyser.notSupported") : `${t("analyser.error")}: ${msg}`,
        );
      })
      .finally(() => setLoadingRawTrace(false));
  }, [
    isSuperUser,
    activeTab,
    txHash,
    dataService,
    rawTrace,
    rawTraceError,
    loadingRawTrace,
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

  // Hide entirely if there's nothing to show
  if (!isSuperUser && !hasEvents && !hasInputData) return null;

  return (
    <div className="tx-analyser">
      {/* Tab bar */}
      <div className="tx-analyser-tabs">
        {hasEvents && (
          <button
            type="button"
            className={`tx-analyser-tab${activeTab === "events" ? " tx-analyser-tab--active-base" : ""}`}
            onClick={() => handleTabClick("events")}
          >
            {t("analyser.events")} ({logs.length})
          </button>
        )}
        {hasInputData && (
          <button
            type="button"
            className={`tx-analyser-tab${activeTab === "inputData" ? " tx-analyser-tab--active-base" : ""}`}
            onClick={() => handleTabClick("inputData")}
          >
            {t("analyser.inputDataTab")}
            {settings.showHelperTooltips !== false && (
              <HelperTooltip content={tTooltips("transaction.decodedInput")} />
            )}
          </button>
        )}
        {isSuperUser && (
          <>
            <button
              type="button"
              className={`tx-analyser-tab${activeTab === "callTree" ? " tx-analyser-tab--active" : ""}`}
              onClick={() => handleTabClick("callTree")}
            >
              {t("analyser.callTree")}
              {settings.showHelperTooltips !== false && (
                <HelperTooltip content={tTooltips("transaction.callTree")} />
              )}
            </button>
            <button
              type="button"
              className={`tx-analyser-tab${activeTab === "gasProfiler" ? " tx-analyser-tab--active" : ""}`}
              onClick={() => handleTabClick("gasProfiler")}
            >
              {t("analyser.gasProfiler")}
              {settings.showHelperTooltips !== false && (
                <HelperTooltip content={tTooltips("transaction.gasProfiler")} />
              )}
            </button>
            <button
              type="button"
              className={`tx-analyser-tab${activeTab === "stateChanges" ? " tx-analyser-tab--active" : ""}`}
              onClick={() => handleTabClick("stateChanges")}
            >
              {t("analyser.stateChanges")}
              {settings.showHelperTooltips !== false && (
                <HelperTooltip content={tTooltips("transaction.stateChanges")} />
              )}
            </button>
            <button
              type="button"
              className={`tx-analyser-tab${activeTab === "rawTrace" ? " tx-analyser-tab--active" : ""}`}
              onClick={() => handleTabClick("rawTrace")}
            >
              {t("analyser.rawTrace")}
            </button>
          </>
        )}
        <button
          type="button"
          className="tx-analyser-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? t("analyser.expand") : t("analyser.collapse")}
        >
          {collapsed ? `▸ ${t("analyser.expand")}` : `▾ ${t("analyser.collapse")}`}
        </button>
      </div>

      {/* Tab content */}
      {!collapsed && (
        <div className="tx-analyser-body">
          {activeTab === "callTree" && (
            <>
              {(loadingCallTree || enrichmentLoading) && (
                <div className="analyser-loading">
                  {loadingCallTree ? t("analyser.loading") : t("analyser.enriching")}
                </div>
              )}
              {callTreeError && (
                <div className="analyser-error">
                  <div>{callTreeError}</div>
                  {callTreeError === t("analyser.notSupported") && (
                    <div className="analyser-hint">{t("analyser.traceHint")}</div>
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
                <div className="analyser-loading">
                  {loadingCallTree ? t("analyser.loading") : t("analyser.enriching")}
                </div>
              )}
              {callTreeError && (
                <div className="analyser-error">
                  <div>{callTreeError}</div>
                  {callTreeError === t("analyser.notSupported") && (
                    <div className="analyser-hint">{t("analyser.traceHint")}</div>
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
                <div className="analyser-loading">
                  {loadingPrestate ? t("analyser.loading") : t("analyser.enriching")}
                </div>
              )}
              {prestateError && (
                <div className="analyser-error">
                  <div>{prestateError}</div>
                  {prestateError === t("analyser.notSupported") && (
                    <div className="analyser-hint">{t("analyser.traceHint")}</div>
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

          {activeTab === "rawTrace" && (
            <>
              {loadingRawTrace && <div className="analyser-loading">{t("analyser.loading")}</div>}
              {rawTraceError && (
                <div className="analyser-error">
                  <div>{rawTraceError}</div>
                  {rawTraceError === t("analyser.notSupported") && (
                    <div className="analyser-hint">{t("analyser.traceHint")}</div>
                  )}
                </div>
              )}
              {rawTrace && <RawTraceTab trace={rawTrace} />}
            </>
          )}

          {activeTab === "events" && logs && logs.length > 0 && (
            <>
              {logEnrichmentLoading && (
                <div className="analyser-loading">{t("analyser.enriching")}</div>
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
        </div>
      )}
    </div>
  );
};

export default TxAnalyser;
