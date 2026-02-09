import React from "react";
import { useTranslation } from "react-i18next";
import type { NetworkStats, RPCMetadata } from "../../../../types";
import { logger } from "../../../../utils/logger";
import { RPCIndicator } from "../../../common/RPCIndicator";

interface NetworkStatsDisplayProps {
  networkStats: NetworkStats | null;
  loading?: boolean;
  error?: string | null;
  networkId?: number;
  metadata?: RPCMetadata;
  selectedProvider?: string | null;
  onProviderSelect?: (provider: string) => void;
}

const NetworkStatsDisplay: React.FC<NetworkStatsDisplayProps> = React.memo(
  ({
    networkStats,
    loading = false,
    error = null,
    networkId,
    metadata,
    selectedProvider,
    onProviderSelect,
  }) => {
    const { t } = useTranslation("network");

    if (loading) {
      return (
        <div className="container-wide network-stats-container">
          <div className="block-display-card">
            <div className="text-center network-stats-loading">{t("loadingNetworkStatistics")}</div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="container-wide network-stats-container">
          <div className="block-display-card">
            <div className="text-center network-stats-error">
              {t("errorLoadingNetworkStats", { error })}
            </div>
          </div>
        </div>
      );
    }

    if (!networkStats) {
      return null;
    }

    // Format gas price from Wei to Gwei
    const formatGasPrice = (weiPrice: string): string => {
      try {
        const gwei = Number(weiPrice) / 1e9;
        return `${gwei.toFixed(2)} Gwei`;
      } catch {
        return weiPrice;
      }
    };

    // Format block number with commas
    const formatBlockNumber = (blockNumber: string): string => {
      try {
        return Number(blockNumber).toLocaleString();
      } catch {
        return blockNumber;
      }
    };

    // Parse protocol version from metadata (localhost/Hardhat only)
    const getProtocolVersion = (): string | null => {
      if (networkId !== 31337 || !networkStats.metadata) {
        return null;
      }

      try {
        return networkStats.metadata.clientVersion || null;
      } catch (err) {
        logger.error("Failed to parse metadata:", err);
        return null;
      }
    };

    // Get forked network info (localhost/Hardhat only)
    const getForkedNetworkInfo = (): {
      networkId: number;
      blockNumber: number;
      blockHash: string;
    } | null => {
      if (networkId !== 31337 || !networkStats.metadata || !networkStats.metadata.forkedNetwork) {
        return null;
      }

      try {
        const forked = networkStats.metadata.forkedNetwork;
        return {
          networkId: forked.chainId,
          blockNumber: forked.forkBlockNumber,
          blockHash: forked.forkBlockHash,
        };
      } catch (err) {
        logger.error("Failed to parse forked network info:", err);
        return null;
      }
    };

    const protocolVersion = getProtocolVersion();
    const forkedNetwork = getForkedNetworkInfo();

    return (
      <div className="container-wide network-stats-container">
        <div className="block-display-card">
          <div className="flex justify-between items-center mb-medium">
            <h2 className="network-stats-title margin-0">{t("networkStatistics")}</h2>
            {metadata && selectedProvider !== undefined && onProviderSelect && (
              <RPCIndicator
                metadata={metadata}
                selectedProvider={selectedProvider}
                onProviderSelect={onProviderSelect}
              />
            )}
          </div>

          <div className="data-grid-3">
            <div className="block-detail-item">
              <span className="detail-label">{t("currentGasPrice")}</span>
              <span className="detail-value">{formatGasPrice(networkStats.currentGasPrice)}</span>
            </div>

            <div className="block-detail-item">
              <span className="detail-label">{t("currentBlockNumber")}</span>
              <span className="detail-value">
                {formatBlockNumber(networkStats.currentBlockNumber)}
              </span>
            </div>

            <div className="block-detail-item">
              <span className="detail-label">{t("syncStatus")}</span>
              <span className="detail-value">
                <span className="sync-status-indicator">
                  <span
                    className={`sync-dot ${networkStats.isSyncing ? "sync-dot-warning" : "sync-dot-success"}`}
                  />
                  {networkStats.isSyncing ? t("syncing") : t("synced")}
                </span>
              </span>
            </div>

            {networkStats.clientVersion && (
              <div className="block-detail-item">
                <span className="detail-label">{t("clientVersion")}</span>
                <span className="detail-value tx-mono">{networkStats.clientVersion}</span>
              </div>
            )}

            {protocolVersion && (
              <div className="block-detail-item">
                <span className="detail-label">{t("protocolVersion")}</span>
                <span className="detail-value">{protocolVersion}</span>
              </div>
            )}

            {forkedNetwork && (
              <>
                <div className="block-detail-item">
                  <span className="detail-label">{t("forkedNetwork")}</span>
                  <span className="detail-value">
                    {t("chainIdValue", { id: forkedNetwork.networkId })}
                  </span>
                </div>

                <div className="block-detail-item">
                  <span className="detail-label">{t("forkBlockNumber")}</span>
                  <span className="detail-value">
                    {formatBlockNumber(forkedNetwork.blockNumber.toString())}
                  </span>
                </div>

                <div className="block-detail-item network-stat-full-width">
                  <span className="detail-label">{t("forkBlockHash")}</span>
                  <span className="detail-value tx-mono fork-hash-value">
                    {forkedNetwork.blockHash}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  },
);

NetworkStatsDisplay.displayName = "NetworkStatsDisplay";

export default NetworkStatsDisplay;
