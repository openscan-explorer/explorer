import React, { useState } from "react";
import { Link } from "react-router-dom";
import type { BitcoinAddress } from "../../../types";

// Satoshi's Genesis address - the 50 BTC coinbase is unspendable
const GENESIS_ADDRESS = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
const GENESIS_COINBASE_BTC = 50;

interface BitcoinAddressDisplayProps {
  address: BitcoinAddress;
  networkId?: string;
}

function formatBTC(value: number): string {
  return `${value.toFixed(8)} BTC`;
}

function getAddressTypeLabel(type: string): string {
  switch (type) {
    case "legacy":
      return "Legacy (P2PKH)";
    case "p2sh":
      return "Script Hash (P2SH)";
    case "segwit":
      return "Native SegWit (P2WPKH)";
    case "taproot":
      return "Taproot (P2TR)";
    default:
      return "Unknown";
  }
}

function truncateHash(hash: string, start = 12, end = 8): string {
  if (hash.length <= start + end) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

const BitcoinAddressDisplay: React.FC<BitcoinAddressDisplayProps> = React.memo(
  ({ address, networkId }) => {
    const [showUTXOs, setShowUTXOs] = useState(false);
    const [showTransactions, setShowTransactions] = useState(false);

    const isGenesisAddress = address.address === GENESIS_ADDRESS;
    const totalBalance = isGenesisAddress
      ? address.balance + GENESIS_COINBASE_BTC
      : address.balance;

    return (
      <div className="block-display-card">
        <div className="block-display-header">
          <span className="block-label">Address</span>
          <span className="block-status-badge block-status-finalized">
            {getAddressTypeLabel(address.type)}
          </span>
        </div>

        {/* Genesis Address Notice */}
        {isGenesisAddress && (
          <div className="btc-genesis-notice">
            <strong>Satoshi Nakamoto's Genesis Address</strong>
            <p>
              This is the coinbase address from Bitcoin's Genesis block (Block 0). The original 50
              BTC block reward is unspendable due to a quirk in Bitcoin's original code - it was
              never added to the UTXO set. The balance shown includes{" "}
              {formatBTC(GENESIS_COINBASE_BTC)} unspendable + {formatBTC(address.balance)} in
              donations.
            </p>
          </div>
        )}

        <div className="tx-details">
          {/* Address */}
          <div className="tx-row">
            <span className="tx-label">Address:</span>
            <span className="tx-value tx-mono">{address.address}</span>
          </div>

          {/* Balance */}
          <div className="tx-row">
            <span className="tx-label">{isGenesisAddress ? "Total Balance:" : "Balance:"}</span>
            <span className="tx-value tx-value-highlight">{formatBTC(totalBalance)}</span>
          </div>

          {/* Spendable Balance for Genesis */}
          {isGenesisAddress && (
            <div className="tx-row">
              <span className="tx-label">Spendable:</span>
              <span className="tx-value">{formatBTC(address.balance)}</span>
            </div>
          )}

          {/* Total Received */}
          {address.totalReceived !== undefined && (
            <div className="tx-row">
              <span className="tx-label">Total Received:</span>
              <span className="tx-value">{formatBTC(address.totalReceived)}</span>
            </div>
          )}

          {/* UTXO Count */}
          <div className="tx-row">
            <span className="tx-label">UTXOs:</span>
            <span className="tx-value">{address.utxoCount.toLocaleString()} unspent outputs</span>
          </div>

          {/* Transaction Count */}
          {address.txCount !== undefined && (
            <div className="tx-row">
              <span className="tx-label">Transactions:</span>
              <span className="tx-value">{address.txCount.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* UTXOs Section */}
        {address.utxos.length > 0 && (
          <div className="btc-tx-section">
            <div className="btc-tx-section-header">
              <button
                type="button"
                className="btc-tx-section-toggle"
                onClick={() => setShowUTXOs(!showUTXOs)}
              >
                <span className="btc-tx-section-title">
                  Unspent Outputs ({address.utxos.length})
                </span>
                <span className="btc-tx-section-arrow">{showUTXOs ? "v" : ">"}</span>
              </button>
            </div>
            {showUTXOs && (
              <div className="btc-utxo-list">
                {address.utxos.map((utxo, index) => (
                  <div key={`${utxo.txid}-${utxo.vout}`} className="btc-utxo-item">
                    <span className="btc-utxo-index">{index}</span>
                    <div className="btc-utxo-content">
                      <span className="btc-utxo-hash tx-mono">
                        {networkId ? (
                          <Link to={`/${networkId}/tx/${utxo.txid}`} className="link-accent">
                            {truncateHash(utxo.txid)}:{utxo.vout}
                          </Link>
                        ) : (
                          `${truncateHash(utxo.txid)}:${utxo.vout}`
                        )}
                      </span>
                      <span className="btc-utxo-value tx-value-highlight">
                        {formatBTC(utxo.amount)}
                      </span>
                      <span className="btc-utxo-confirmations">
                        {utxo.confirmations.toLocaleString()} confirmations
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Transaction History (if txids available) */}
        {address.txids && address.txids.length > 0 && (
          <div className="btc-tx-section">
            <div className="btc-tx-section-header">
              <button
                type="button"
                className="btc-tx-section-toggle"
                onClick={() => setShowTransactions(!showTransactions)}
              >
                <span className="btc-tx-section-title">
                  Recent Transactions ({address.txids.length})
                </span>
                <span className="btc-tx-section-arrow">{showTransactions ? "v" : ">"}</span>
              </button>
            </div>
            {showTransactions && (
              <div className="btc-tx-list">
                {address.txids.slice(0, 20).map((txid, index) => (
                  <div key={txid} className="btc-tx-list-item">
                    <span className="btc-tx-index">{index}</span>
                    <span className="btc-tx-hash tx-mono">
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
                {address.txids.length > 20 && (
                  <div className="btc-tx-list-more">
                    ... and {address.txids.length - 20} more transactions
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Empty state for addresses without wallet data */}
        {address.utxos.length === 0 && !address.txids && (
          <div className="btc-tx-section">
            <div className="btc-empty-state">
              <p className="text-muted">
                UTXO and transaction data requires wallet functionality or an indexing service. The
                connected Bitcoin node may not have this data available.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  },
);

BitcoinAddressDisplay.displayName = "BitcoinAddressDisplay";
export default BitcoinAddressDisplay;
