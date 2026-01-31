import React, { useState } from "react";
import { Link } from "react-router-dom";
import type { BitcoinBlock } from "../../../types";

interface BitcoinBlockDisplayProps {
  block: BitcoinBlock;
  networkId?: string;
}

function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(new Date(timestamp * 1000));
}

function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp * 1000;
  const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);

  if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} minutes ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} hours ago`;
  return `${Math.floor(diffSeconds / 86400)} days ago`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatBTC(value: number): string {
  return `${value.toFixed(8)} BTC`;
}

function formatDifficulty(difficulty: number): string {
  if (difficulty >= 1e15) return `${(difficulty / 1e15).toFixed(2)} P`;
  if (difficulty >= 1e12) return `${(difficulty / 1e12).toFixed(2)} T`;
  if (difficulty >= 1e9) return `${(difficulty / 1e9).toFixed(2)} G`;
  if (difficulty >= 1e6) return `${(difficulty / 1e6).toFixed(2)} M`;
  return difficulty.toLocaleString();
}

function truncateHash(hash: string, start = 12, end = 8): string {
  if (hash.length <= start + end) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

const BitcoinBlockDisplay: React.FC<BitcoinBlockDisplayProps> = React.memo(
  ({ block, networkId }) => {
    const [showMoreDetails, setShowMoreDetails] = useState(false);
    const [showTransactions, setShowTransactions] = useState(false);

    return (
      <div className="block-display-card">
        <div className="block-display-header">
          <div className="block-header-main">
            {networkId && block.height > 0 && (
              <Link
                to={`/${networkId}/block/${block.height - 1}`}
                className="block-nav-btn"
                title="Previous block"
              >
                ←
              </Link>
            )}
            <div className="block-header-info">
              <span className="block-label">Block</span>
              <span className="block-number">#{block.height.toLocaleString()}</span>
            </div>
            {networkId && block.nextBlockHash && (
              <Link
                to={`/${networkId}/block/${block.height + 1}`}
                className="block-nav-btn"
                title="Next block"
              >
                →
              </Link>
            )}
            <span className="block-header-divider">•</span>
            <span className="block-header-timestamp">
              <span className="block-timestamp-age">{formatTimeAgo(block.time)}</span>
              <span className="block-timestamp-full">({formatTimestamp(block.time)})</span>
            </span>
          </div>
          {block.confirmations !== undefined && (
            <span className="block-status-badge block-status-finalized">
              {block.confirmations.toLocaleString()} Confirmations
            </span>
          )}
        </div>

        <div className="tx-details">
          {/* Block Hash */}
          <div className="tx-row">
            <span className="tx-label">Block Hash:</span>
            <span className="tx-value tx-mono">{block.hash}</span>
          </div>

          {/* Miner */}
          {block.miner && (
            <div className="tx-row">
              <span className="tx-label">Mined by:</span>
              <span className="tx-value">
                <span className="btc-miner-badge">{block.miner}</span>
              </span>
            </div>
          )}

          {/* Block Reward */}
          {block.blockReward !== undefined && (
            <div className="tx-row">
              <span className="tx-label">Block Reward:</span>
              <span className="tx-value tx-value-highlight">{formatBTC(block.blockReward)}</span>
            </div>
          )}

          {/* Total Fees */}
          {block.totalFees !== undefined && (
            <div className="tx-row">
              <span className="tx-label">Total Fees:</span>
              <span className="tx-value">{formatBTC(block.totalFees)}</span>
            </div>
          )}

          {/* Fee Rate Stats */}
          {block.feeRateAvg !== undefined && block.feeRateMedian !== undefined && (
            <div className="tx-row">
              <span className="tx-label">Fee Rate:</span>
              <span className="tx-value">
                Avg: {block.feeRateAvg.toFixed(2)} sat/vB | Median: {block.feeRateMedian.toFixed(2)}{" "}
                sat/vB
              </span>
            </div>
          )}

          {/* Transactions */}
          <div className="tx-row">
            <span className="tx-label">Transactions:</span>
            <span className="tx-value">
              <span className="tx-value-highlight">{block.nTx.toLocaleString()}</span> transactions
              {block.inputCount !== undefined && block.outputCount !== undefined && (
                <span className="btc-io-counts">
                  {" "}
                  ({block.inputCount.toLocaleString()} inputs, {block.outputCount.toLocaleString()}{" "}
                  outputs)
                </span>
              )}
            </span>
          </div>

          {/* Total Output Value */}
          {block.totalOutputValue !== undefined && (
            <div className="tx-row">
              <span className="tx-label">Total Output:</span>
              <span className="tx-value">{formatBTC(block.totalOutputValue)}</span>
            </div>
          )}

          {/* Difficulty */}
          {block.difficulty !== undefined && (
            <div className="tx-row">
              <span className="tx-label">Difficulty:</span>
              <span className="tx-value">{formatDifficulty(block.difficulty)}</span>
            </div>
          )}

          {/* Size */}
          <div className="tx-row">
            <span className="tx-label">Size:</span>
            <span className="tx-value">{formatSize(block.size)}</span>
          </div>

          {/* Weight */}
          <div className="tx-row">
            <span className="tx-label">Weight:</span>
            <span className="tx-value">{block.weight.toLocaleString()} WU</span>
          </div>

          {/* Previous Block */}
          {block.previousBlockHash && (
            <div className="tx-row">
              <span className="tx-label">Previous Block:</span>
              <span className="tx-value tx-mono">
                {networkId ? (
                  <Link to={`/${networkId}/block/${block.height - 1}`} className="link-accent">
                    {truncateHash(block.previousBlockHash)}
                  </Link>
                ) : (
                  truncateHash(block.previousBlockHash)
                )}
              </span>
            </div>
          )}

          {/* Next Block */}
          {block.nextBlockHash && (
            <div className="tx-row">
              <span className="tx-label">Next Block:</span>
              <span className="tx-value tx-mono">
                {networkId ? (
                  <Link to={`/${networkId}/block/${block.height + 1}`} className="link-accent">
                    {truncateHash(block.nextBlockHash)}
                  </Link>
                ) : (
                  truncateHash(block.nextBlockHash)
                )}
              </span>
            </div>
          )}

          {/* Coinbase Message */}
          {block.coinbaseMessage && (
            <div className="tx-row">
              <span className="tx-label">Coinbase Message:</span>
              <span className="tx-value">
                <span className="btc-coinbase-message">{block.coinbaseMessage}</span>
              </span>
            </div>
          )}

          {/* More Details Toggle */}
          <div className="tx-row tx-row-vertical">
            <button
              type="button"
              className="more-details-toggle"
              onClick={() => setShowMoreDetails(!showMoreDetails)}
            >
              {showMoreDetails ? "− Hide" : "+ Show"} More Details
            </button>

            {showMoreDetails && (
              <div className="more-details-content">
                <div className="detail-row">
                  <span className="detail-label">Merkle Root:</span>
                  <span className="detail-value tx-mono">{block.merkleRoot}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Version:</span>
                  <span className="detail-value">0x{block.version.toString(16)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Bits:</span>
                  <span className="detail-value tx-mono">{block.bits}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Nonce:</span>
                  <span className="detail-value">{block.nonce.toLocaleString()}</span>
                </div>
                {block.coinbaseHex && (
                  <div className="detail-row">
                    <span className="detail-label">Coinbase (hex):</span>
                    <span className="detail-value tx-mono btc-coinbase-hex">
                      {block.coinbaseHex}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Transactions List */}
          {block.txids && block.txids.length > 0 && (
            <div className="tx-row tx-row-vertical">
              <button
                type="button"
                className="more-details-toggle"
                onClick={() => setShowTransactions(!showTransactions)}
              >
                {showTransactions ? "− Hide" : "+ Show"} Transactions ({block.txids.length})
              </button>

              {showTransactions && (
                <div className="more-details-content">
                  <div className="btc-block-txs">
                    {block.txids.map((txid, index) => (
                      <div key={txid} className="btc-block-tx-item">
                        <span className="btc-block-tx-index">{index}</span>
                        <span className="btc-block-tx-hash tx-mono">
                          {networkId ? (
                            <Link to={`/${networkId}/tx/${txid}`} className="link-accent">
                              {txid}
                            </Link>
                          ) : (
                            txid
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);

BitcoinBlockDisplay.displayName = "BitcoinBlockDisplay";
export default BitcoinBlockDisplay;
