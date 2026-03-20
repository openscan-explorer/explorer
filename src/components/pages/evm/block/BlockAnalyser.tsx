import type React from "react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useBeaconBlobs } from "../../../../hooks/useBeaconBlobs";
import type { Block, BlockArbitrum } from "../../../../types";
import BlobDataDisplay from "../../../common/BlobDataDisplay";

type BlockAnalyserTab = "moreDetails" | "transactions" | "withdrawals" | "blobData";

interface BlockAnalyserProps {
  block: Block | BlockArbitrum;
  networkId?: string;
  isSuperUser: boolean;
}

const BlockAnalyser: React.FC<BlockAnalyserProps> = ({ block, networkId, isSuperUser }) => {
  const { t } = useTranslation("block");

  const hasTxs = block.transactions && block.transactions.length > 0;
  const hasWithdrawals = block.withdrawals && block.withdrawals.length > 0;
  const hasBlobGas = block.blobGasUsed && Number(block.blobGasUsed) > 0;

  const caip2NetworkId = networkId ? `eip155:${networkId}` : undefined;

  const [activeTab, setActiveTab] = useState<BlockAnalyserTab | null>(null);
  const [collapsed, setCollapsed] = useState(true);

  const {
    blobs: blobSidecars,
    loading: blobsLoading,
    isPruned: blobsPruned,
    isAvailable: beaconAvailable,
  } = useBeaconBlobs(
    isSuperUser && hasBlobGas ? caip2NetworkId : undefined,
    isSuperUser && hasBlobGas && activeTab === "blobData" ? Number(block.timestamp) : undefined,
  );

  const showBlobTab = isSuperUser && hasBlobGas && beaconAvailable;
  const blockNumber = Number(block.number);

  const handleTabClick = useCallback(
    (tab: BlockAnalyserTab) => {
      if (tab === activeTab && !collapsed) {
        setCollapsed(true);
      } else {
        setActiveTab(tab);
        setCollapsed(false);
      }
    },
    [activeTab, collapsed],
  );

  return (
    <div className="detail-panel">
      {/* Tab bar */}
      <div className="detail-panel-tabs">
        <button
          type="button"
          className={`detail-panel-tab${activeTab === "moreDetails" ? " detail-panel-tab--active-base" : ""}`}
          onClick={() => handleTabClick("moreDetails")}
        >
          {t("analyser.moreDetails")}
        </button>
        {hasTxs && (
          <button
            type="button"
            className={`detail-panel-tab${activeTab === "transactions" ? " detail-panel-tab--active-base" : ""}`}
            onClick={() => handleTabClick("transactions")}
          >
            {t("analyser.transactions")} ({block.transactions.length})
          </button>
        )}
        {hasWithdrawals && (
          <button
            type="button"
            className={`detail-panel-tab${activeTab === "withdrawals" ? " detail-panel-tab--active-base" : ""}`}
            onClick={() => handleTabClick("withdrawals")}
          >
            {t("analyser.withdrawals")} ({block.withdrawals.length})
          </button>
        )}
        {showBlobTab && (
          <button
            type="button"
            className={`detail-panel-tab${activeTab === "blobData" ? " detail-panel-tab--active" : ""}`}
            onClick={() => handleTabClick("blobData")}
          >
            {t("analyser.blobData")} ({Math.floor(Number(block.blobGasUsed) / 131072)})
          </button>
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
          {activeTab === "moreDetails" && (
            <div className="detail-panel-tab-content">
              <div className="detail-row">
                <span className="detail-label">{t("analyser.parentHash")}</span>
                <span className="detail-value tx-mono">
                  {networkId &&
                  block.parentHash !==
                    "0x0000000000000000000000000000000000000000000000000000000000000000" ? (
                    <Link to={`/${networkId}/block/${blockNumber - 1}`} className="link-accent">
                      {block.parentHash}
                    </Link>
                  ) : (
                    block.parentHash
                  )}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{t("analyser.stateRoot")}</span>
                <span className="detail-value tx-mono">{block.stateRoot}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{t("analyser.transactionsRoot")}</span>
                <span className="detail-value tx-mono">{block.transactionsRoot}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{t("analyser.receiptsRoot")}</span>
                <span className="detail-value tx-mono">{block.receiptsRoot}</span>
              </div>
              {block.withdrawalsRoot && (
                <div className="detail-row">
                  <span className="detail-label">{t("analyser.withdrawalsRoot")}</span>
                  <span className="detail-value tx-mono">{block.withdrawalsRoot}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">{t("analyser.logsBloom")}</span>
                <div className="detail-value">
                  <code className="logs-bloom">{block.logsBloom}</code>
                </div>
              </div>
              <div className="detail-row">
                <span className="detail-label">{t("analyser.nonce")}</span>
                <span className="detail-value">{block.nonce}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{t("analyser.mixHash")}</span>
                <span className="detail-value tx-mono">{block.mixHash}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{t("analyser.sha3Uncles")}</span>
                <span className="detail-value tx-mono">{block.sha3Uncles}</span>
              </div>
            </div>
          )}

          {activeTab === "transactions" && hasTxs && (
            <div className="tx-list">
              {block.transactions.map((txHash, index) => (
                <div key={txHash} className="tx-list-item">
                  <span className="tx-list-index">{index}</span>
                  <span className="tx-list-hash tx-mono">
                    {networkId ? (
                      <Link to={`/${networkId}/tx/${txHash}`} className="link-accent">
                        {txHash}
                      </Link>
                    ) : (
                      txHash
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "withdrawals" && hasWithdrawals && (
            <div className="withdrawal-list">
              {block.withdrawals.map((withdrawal, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: withdrawal index is stable
                <div key={index} className="withdrawal-row">
                  <div className="withdrawal-index">{index}</div>
                  <div className="withdrawal-field">
                    <span className="withdrawal-field-label">{t("index")}</span>
                    <span>{Number(withdrawal.index).toLocaleString()}</span>
                  </div>
                  <div className="withdrawal-field">
                    <span className="withdrawal-field-label">{t("validator")}</span>
                    <span>{Number(withdrawal.validatorIndex).toLocaleString()}</span>
                  </div>
                  <div className="withdrawal-field withdrawal-address tx-mono">
                    {networkId ? (
                      <Link
                        to={`/${networkId}/address/${withdrawal.address}`}
                        className="link-accent"
                      >
                        {withdrawal.address}
                      </Link>
                    ) : (
                      withdrawal.address
                    )}
                  </div>
                  <div className="withdrawal-amount tx-value-highlight">
                    {(Number(withdrawal.amount) / 1e9).toFixed(9)} ETH
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "blobData" && showBlobTab && (
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

export default BlockAnalyser;
