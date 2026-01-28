import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AppContext, useNetwork } from "../../../context/AppContext";
import { useDataService } from "../../../hooks/useDataService";
import { getNativeTokenPrice } from "../../../services/PriceService";
import type { GasPrices } from "../../../types";
import { formatGasPrice } from "../../../utils/formatUtils";
import Loader from "../../common/Loader";

const REFRESH_INTERVAL = 15000; // 15 seconds

// Common transaction gas estimates
const TX_GAS_ESTIMATES = [
  { name: "ETH Transfer", gas: 21000, description: "Native token transfer" },
  { name: "ERC20 Transfer", gas: 65000, description: "Token transfer" },
  { name: "ERC20 Approve", gas: 46000, description: "Token approval" },
  { name: "NFT Transfer", gas: 85000, description: "ERC721 transfer" },
  { name: "Swap", gas: 150000, description: "DEX swap" },
  { name: "NFT Mint", gas: 120000, description: "Mint an NFT" },
  { name: "Contract Deploy (Simple)", gas: 300000, description: "Deploy basic contract" },
];

interface GasTrackerData {
  gasPrices: GasPrices | null;
  price: number | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

function formatUsd(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  if (value < 0.01) return "<$0.01";
  return `$${value.toFixed(2)}`;
}

function calculateTxCost(
  gasPrice: string,
  gasLimit: number,
  ethPrice: number | null,
): { eth: string; usd: string } {
  try {
    const gasPriceWei = BigInt(gasPrice);
    const costWei = gasPriceWei * BigInt(gasLimit);
    const costEth = Number(costWei) / 1e18;

    // Format ETH with appropriate decimals, max 6 decimals
    let ethFormatted: string;
    if (costEth >= 0.01) {
      ethFormatted = costEth.toFixed(4);
    } else if (costEth >= 0.0001) {
      ethFormatted = costEth.toFixed(6);
    } else {
      ethFormatted = costEth.toFixed(8);
    }
    const usdValue = ethPrice ? costEth * ethPrice : null;

    return {
      eth: ethFormatted,
      usd: formatUsd(usdValue),
    };
  } catch {
    return { eth: "—", usd: "—" };
  }
}

export default function GasTracker() {
  const { networkId } = useParams<{ networkId?: string }>();
  const numericNetworkId = Number(networkId) || 1;
  const networkConfig = useNetwork(numericNetworkId);
  const { rpcUrls } = useContext(AppContext);
  const dataService = useDataService(numericNetworkId);
  const [data, setData] = useState<GasTrackerData>({
    gasPrices: null,
    price: null,
    loading: true,
    error: null,
    lastUpdated: null,
  });
  const isFetchingRef = useRef(false);

  const rpcUrl = rpcUrls[numericNetworkId]?.[0] || null;
  const mainnetRpcUrl = rpcUrls[1]?.[0] || null;
  const currency = networkConfig?.currency || "ETH";

  const fetchGasData = useCallback(async () => {
    if (!dataService || isFetchingRef.current) return;

    isFetchingRef.current = true;

    try {
      const [gasPricesResult, priceResult] = await Promise.all([
        dataService.networkAdapter.getGasPrices(),
        rpcUrl
          ? getNativeTokenPrice(numericNetworkId, rpcUrl, mainnetRpcUrl || undefined)
          : Promise.resolve(null),
      ]);

      setData({
        gasPrices: gasPricesResult.data,
        price: priceResult,
        loading: false,
        error: null,
        lastUpdated: Date.now(),
      });
    } catch (err) {
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to fetch gas data",
      }));
    } finally {
      isFetchingRef.current = false;
    }
  }, [dataService, numericNetworkId, rpcUrl, mainnetRpcUrl]);

  useEffect(() => {
    fetchGasData();
  }, [fetchGasData]);

  useEffect(() => {
    const intervalId = setInterval(fetchGasData, REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [fetchGasData]);

  const { gasPrices, price, loading, error } = data;

  return (
    <div className="container-wide">
      <div className="block-display-card">
        <div className="gas-tracker-header">
          <h1 className="page-title-small">Gas Tracker</h1>
        </div>

        {loading && !gasPrices && <Loader text="Loading gas prices..." />}

        {error && <p className="error-text-center">Error: {error}</p>}

        {gasPrices && (
          <>
            <section className="gas-tracker-section">
              <p className="gas-tracker-section-subtitle">
                Based on the last 20 blocks. Prices include base fee + priority fee.
              </p>

              {(() => {
                const lowPrice = formatGasPrice(gasPrices.low);
                const avgPrice = formatGasPrice(gasPrices.average);
                const highPrice = formatGasPrice(gasPrices.high);
                const baseFee = formatGasPrice(gasPrices.baseFee);

                return (
                  <>
                    <div className="gas-price-cards">
                      <div className="gas-price-card gas-price-low">
                        <div className="gas-price-tier-label">Low</div>
                        <div className="gas-price-tier-value">
                          {lowPrice.value} {lowPrice.unit}
                        </div>
                        <div className="gas-price-tier-time">~5+ min</div>
                      </div>

                      <div className="gas-price-card gas-price-avg">
                        <div className="gas-price-tier-label">Average</div>
                        <div className="gas-price-tier-value">
                          {avgPrice.value} {avgPrice.unit}
                        </div>
                        <div className="gas-price-tier-time">~1-3 min</div>
                      </div>

                      <div className="gas-price-card gas-price-high">
                        <div className="gas-price-tier-label">High</div>
                        <div className="gas-price-tier-value">
                          {highPrice.value} {highPrice.unit}
                        </div>
                        <div className="gas-price-tier-time">~30 sec</div>
                      </div>
                    </div>

                    <div className="gas-base-fee">
                      <span className="gas-base-fee-label">Base Fee:</span>
                      <span className="gas-base-fee-value">
                        {baseFee.value} {baseFee.unit}
                      </span>
                    </div>
                  </>
                );
              })()}
            </section>

            <section className="gas-tracker-section">
              <h2 className="gas-tracker-section-title">Transaction Cost Estimates</h2>
              <p className="gas-tracker-section-subtitle">
                Estimated costs at current gas prices
                {price && ` (${currency} @ $${price.toFixed(2)})`}
              </p>

              <div className="tx-cost-table">
                <div className="tx-cost-header">
                  <div className="tx-cost-col-name">Transaction Type</div>
                  <div className="tx-cost-col-gas">Gas</div>
                  <div className="tx-cost-col-low">Low</div>
                  <div className="tx-cost-col-avg">Avg</div>
                  <div className="tx-cost-col-high">High</div>
                </div>

                {TX_GAS_ESTIMATES.map((tx) => {
                  const lowCost = calculateTxCost(gasPrices.low, tx.gas, price);
                  const avgCost = calculateTxCost(gasPrices.average, tx.gas, price);
                  const highCost = calculateTxCost(gasPrices.high, tx.gas, price);

                  return (
                    <div key={tx.name} className="tx-cost-row">
                      <div className="tx-cost-col-name">
                        <span className="tx-cost-name">{tx.name}</span>
                        <span className="tx-cost-desc">{tx.description}</span>
                      </div>
                      <div className="tx-cost-col-gas">{tx.gas.toLocaleString()}</div>
                      <div className="tx-cost-col-low">
                        <span className="tx-cost-eth">
                          {lowCost.eth} {currency}
                        </span>
                        <span className="tx-cost-usd">{lowCost.usd}</span>
                      </div>
                      <div className="tx-cost-col-avg">
                        <span className="tx-cost-eth">
                          {avgCost.eth} {currency}
                        </span>
                        <span className="tx-cost-usd">{avgCost.usd}</span>
                      </div>
                      <div className="tx-cost-col-high">
                        <span className="tx-cost-eth">
                          {highCost.eth} {currency}
                        </span>
                        <span className="tx-cost-usd">{highCost.usd}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {data.lastUpdated && (
          <div className="gas-tracker-updated">
            Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}
