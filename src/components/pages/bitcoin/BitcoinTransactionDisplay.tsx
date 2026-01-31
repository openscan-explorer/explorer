import React from "react";
import { Link } from "react-router-dom";
import type { BitcoinTransaction } from "../../../types";

interface BitcoinTransactionDisplayProps {
  transaction: BitcoinTransaction;
  networkId?: string;
  btcPrice?: number | null;
}

function formatBTC(value: number): string {
  return `${value.toFixed(8)} BTC`;
}

function formatUSD(btcValue: number, btcPrice: number | null | undefined): string | null {
  if (!btcPrice) return null;
  const usdValue = btcValue * btcPrice;
  if (usdValue >= 1000) {
    return `$${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (usdValue >= 0.01) {
    return `$${usdValue.toFixed(2)}`;
  }
  return `$${usdValue.toFixed(4)}`;
}

function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(timestamp * 1000));
}

function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp * 1000;
  const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);

  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) {
    const mins = Math.floor(diffSeconds / 60);
    const secs = diffSeconds % 60;
    return `${mins}m ${secs}s ago`;
  }
  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    const mins = Math.floor((diffSeconds % 3600) / 60);
    return `${hours}h ${mins}m ago`;
  }
  const days = Math.floor(diffSeconds / 86400);
  const hours = Math.floor((diffSeconds % 86400) / 3600);
  return `${days}d ${hours}h ago`;
}

function truncateHash(hash: string, start = 12, end = 8): string {
  if (hash.length <= start + end) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

// RBF is enabled if any input has sequence < 0xfffffffe
function isRBFEnabled(vin: { sequence: number }[]): boolean {
  return vin.some((input) => input.sequence < 0xfffffffe);
}

// Has witness data if hash differs from txid or any input has txinwitness
function hasWitness(tx: BitcoinTransaction): boolean {
  if (tx.hash !== tx.txid) return true;
  return tx.vin.some((input) => input.txinwitness && input.txinwitness.length > 0);
}

const BitcoinTransactionDisplay: React.FC<BitcoinTransactionDisplayProps> = React.memo(
  ({ transaction, networkId, btcPrice }) => {
    // Calculate totals
    const totalInput = transaction.vin.reduce((sum, input) => {
      return sum + (input.prevout?.value || 0);
    }, 0);
    const totalOutput = transaction.vout.reduce((sum, output) => {
      return sum + output.value;
    }, 0);
    const fee = transaction.fee ?? (totalInput > 0 ? totalInput - totalOutput : 0);

    const firstInput = transaction.vin[0];
    const isCoinbase = transaction.vin.length === 1 && firstInput && !firstInput.txid;

    // Calculate fee rates (in satoshis)
    const feeSats = fee * 100000000;
    const feePerByte = transaction.size > 0 ? feeSats / transaction.size : 0;
    const feePerVByte = transaction.vsize > 0 ? feeSats / transaction.vsize : 0;
    const feePerWU = transaction.weight > 0 ? feeSats / transaction.weight : 0;

    // Check for RBF and witness
    const rbfEnabled = isRBFEnabled(transaction.vin);
    const witnessEnabled = hasWitness(transaction);

    // Check if transaction is unconfirmed (in mempool)
    const isUnconfirmed = !transaction.blockhash || transaction.confirmations === 0;

    return (
      <div className="block-display-card">
        <div className="block-display-header">
          <span className="block-label">Transaction</span>
          {isUnconfirmed ? (
            <span className="block-status-badge block-status-pending">
              In Mempool (Unconfirmed)
            </span>
          ) : (
            transaction.confirmations !== undefined &&
            transaction.confirmations > 0 && (
              <span className="block-status-badge block-status-finalized">
                {transaction.confirmations.toLocaleString()} Confirmations
              </span>
            )
          )}
        </div>

        {/* Full-width rows for long values */}
        <div className="tx-details">
          <div className="tx-row">
            <span className="tx-label">Transaction ID:</span>
            <span className="tx-value tx-mono">{transaction.txid}</span>
          </div>

          {transaction.hash !== transaction.txid && (
            <div className="tx-row">
              <span className="tx-label">Witness Hash:</span>
              <span className="tx-value tx-mono">{transaction.hash}</span>
            </div>
          )}

          {transaction.blockhash && (
            <div className="tx-row">
              <span className="tx-label">Block:</span>
              <span className="tx-value tx-mono">
                {networkId ? (
                  <Link to={`/${networkId}/block/${transaction.blockhash}`} className="link-accent">
                    {truncateHash(transaction.blockhash)}
                  </Link>
                ) : (
                  truncateHash(transaction.blockhash)
                )}
              </span>
            </div>
          )}
        </div>

        {/* Two-column layout for transaction details */}
        <div className="btc-tx-details-grid">
          {/* Left Column */}
          <div className="btc-tx-details-column">
            {isUnconfirmed ? (
              <div className="tx-row">
                <span className="tx-label">Status:</span>
                <span className="tx-value">
                  <span className="btc-mempool-status">Waiting for confirmation in mempool</span>
                </span>
              </div>
            ) : (
              transaction.blocktime && (
                <>
                  <div className="tx-row">
                    <span className="tx-label">Time:</span>
                    <span className="tx-value">{formatTimestamp(transaction.blocktime)}</span>
                  </div>
                  <div className="tx-row">
                    <span className="tx-label">Age:</span>
                    <span className="tx-value">{formatTimeAgo(transaction.blocktime)}</span>
                  </div>
                </>
              )
            )}

            <div className="tx-row">
              <span className="tx-label">Inputs:</span>
              <span className="tx-value">
                {transaction.vin.length}
                {totalInput > 0 && (
                  <>
                    <span className="btc-value-inline"> ({formatBTC(totalInput)})</span>
                    {formatUSD(totalInput, btcPrice) && (
                      <span className="btc-usd-value">{formatUSD(totalInput, btcPrice)}</span>
                    )}
                  </>
                )}
              </span>
            </div>
            <div className="tx-row">
              <span className="tx-label">Outputs:</span>
              <span className="tx-value">
                {transaction.vout.length}
                <span className="btc-value-inline"> ({formatBTC(totalOutput)})</span>
                {formatUSD(totalOutput, btcPrice) && (
                  <span className="btc-usd-value">{formatUSD(totalOutput, btcPrice)}</span>
                )}
              </span>
            </div>

            {!isCoinbase && fee > 0 && (
              <>
                <div className="tx-row">
                  <span className="tx-label">Fee:</span>
                  <span className="tx-value tx-value-highlight">
                    {formatBTC(fee)}
                    {formatUSD(fee, btcPrice) && (
                      <span className="btc-usd-value">{formatUSD(fee, btcPrice)}</span>
                    )}
                  </span>
                </div>
                <div className="tx-row">
                  <span className="tx-label">Fee/B:</span>
                  <span className="tx-value">{feePerByte.toFixed(3)} sat/B</span>
                </div>
                <div className="tx-row">
                  <span className="tx-label">Fee/vB:</span>
                  <span className="tx-value">{feePerVByte.toFixed(3)} sat/vB</span>
                </div>
                <div className="tx-row">
                  <span className="tx-label">Fee/WU:</span>
                  <span className="tx-value">{feePerWU.toFixed(3)} sat/WU</span>
                </div>
              </>
            )}
          </div>

          {/* Right Column */}
          <div className="btc-tx-details-column">
            <div className="tx-row">
              <span className="tx-label">Size:</span>
              <span className="tx-value">{transaction.size.toLocaleString()} bytes</span>
            </div>
            {transaction.vsize !== transaction.size && (
              <div className="tx-row">
                <span className="tx-label">Virtual Size:</span>
                <span className="tx-value">{transaction.vsize.toLocaleString()} vB</span>
              </div>
            )}
            <div className="tx-row">
              <span className="tx-label">Weight:</span>
              <span className="tx-value">{transaction.weight.toLocaleString()} WU</span>
            </div>

            <div className="tx-row">
              <span className="tx-label">Coinbase:</span>
              <span className="tx-value">
                {isCoinbase ? (
                  <span className="btc-flag-yes">Yes</span>
                ) : (
                  <span className="btc-flag-no">No</span>
                )}
              </span>
            </div>
            <div className="tx-row">
              <span className="tx-label">Witness:</span>
              <span className="tx-value">
                {witnessEnabled ? (
                  <span className="btc-flag-yes">Yes</span>
                ) : (
                  <span className="btc-flag-no">No</span>
                )}
              </span>
            </div>
            <div className="tx-row">
              <span className="tx-label">RBF:</span>
              <span className="tx-value">
                {rbfEnabled ? (
                  <span className="btc-flag-yes">Yes</span>
                ) : (
                  <span className="btc-flag-no">No</span>
                )}
              </span>
            </div>

            <div className="tx-row">
              <span className="tx-label">Version:</span>
              <span className="tx-value">{transaction.version}</span>
            </div>
            <div className="tx-row">
              <span className="tx-label">Locktime:</span>
              <span className="tx-value">{transaction.locktime.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Inputs and Outputs - Two Column Layout */}
        <div className="btc-io-columns">
          {/* Inputs Column */}
          <div className="btc-io-column">
            <div className="btc-io-column-header">
              <span className="btc-io-column-title">Inputs ({transaction.vin.length})</span>
              {totalInput > 0 && (
                <div className="btc-io-column-totals">
                  <span className="btc-io-column-total">{formatBTC(totalInput)}</span>
                  {formatUSD(totalInput, btcPrice) && (
                    <span className="btc-io-column-usd">{formatUSD(totalInput, btcPrice)}</span>
                  )}
                </div>
              )}
            </div>
            <div className="btc-io-column-content">
              {transaction.vin.map((input, index) => (
                <div key={`${input.txid}-${input.vout}-${index}`} className="btc-io-item">
                  <div className="btc-io-index">{index}</div>
                  <div className="btc-io-content">
                    {isCoinbase && index === 0 ? (
                      <div className="btc-io-coinbase">Newly Generated Coins</div>
                    ) : (
                      <>
                        <div className="btc-io-address">
                          {input.prevout?.scriptPubKey.address ? (
                            networkId ? (
                              <Link
                                to={`/${networkId}/address/${input.prevout.scriptPubKey.address}`}
                                className="link-accent tx-mono"
                              >
                                {input.prevout.scriptPubKey.address}
                              </Link>
                            ) : (
                              <span className="tx-mono">{input.prevout.scriptPubKey.address}</span>
                            )
                          ) : (
                            <span className="tx-mono text-muted">Unknown</span>
                          )}
                        </div>
                        <div className="btc-io-details">
                          <div className="btc-io-value-group">
                            <span className="btc-io-value">
                              {input.prevout?.value !== undefined
                                ? formatBTC(input.prevout.value)
                                : "Unknown"}
                            </span>
                            {input.prevout?.value !== undefined &&
                              formatUSD(input.prevout.value, btcPrice) && (
                                <span className="btc-io-usd">
                                  {formatUSD(input.prevout.value, btcPrice)}
                                </span>
                              )}
                          </div>
                          <span className="btc-io-txref">
                            from{" "}
                            {networkId && input.txid ? (
                              <Link to={`/${networkId}/tx/${input.txid}`} className="link-accent">
                                {truncateHash(input.txid, 8, 6)}:{input.vout}
                              </Link>
                            ) : (
                              `${truncateHash(input.txid || "", 8, 6)}:${input.vout}`
                            )}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Arrow between columns */}
          <div className="btc-io-arrow">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <title>Flow arrow</title>
              <path
                d="M5 12h14M13 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Outputs Column */}
          <div className="btc-io-column">
            <div className="btc-io-column-header">
              <span className="btc-io-column-title">Outputs ({transaction.vout.length})</span>
              <div className="btc-io-column-totals">
                <span className="btc-io-column-total">{formatBTC(totalOutput)}</span>
                {formatUSD(totalOutput, btcPrice) && (
                  <span className="btc-io-column-usd">{formatUSD(totalOutput, btcPrice)}</span>
                )}
              </div>
            </div>
            <div className="btc-io-column-content">
              {transaction.vout.map((output) => (
                <div key={`${output.n}`} className="btc-io-item">
                  <div className="btc-io-index">{output.n}</div>
                  <div className="btc-io-content">
                    <div className="btc-io-address">
                      {output.scriptPubKey.address ? (
                        networkId ? (
                          <Link
                            to={`/${networkId}/address/${output.scriptPubKey.address}`}
                            className="link-accent tx-mono"
                          >
                            {output.scriptPubKey.address}
                          </Link>
                        ) : (
                          <span className="tx-mono">{output.scriptPubKey.address}</span>
                        )
                      ) : (
                        <span className="tx-mono text-muted">
                          {output.scriptPubKey.type === "nulldata"
                            ? "OP_RETURN (Data)"
                            : output.scriptPubKey.type}
                        </span>
                      )}
                    </div>
                    <div className="btc-io-details">
                      <div className="btc-io-value-group">
                        <span className="btc-io-value tx-value-highlight">
                          {formatBTC(output.value)}
                        </span>
                        {formatUSD(output.value, btcPrice) && (
                          <span className="btc-io-usd">{formatUSD(output.value, btcPrice)}</span>
                        )}
                      </div>
                      <span className="btc-io-type">{output.scriptPubKey.type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

BitcoinTransactionDisplay.displayName = "BitcoinTransactionDisplay";
export default BitcoinTransactionDisplay;
