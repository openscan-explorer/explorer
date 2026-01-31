import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getRPCUrls } from "../../config/rpcConfig";
import { AppContext, useNetworks } from "../../context/AppContext";
import { RpcClient } from "@openscan/network-connectors";
import { useDataService } from "../../hooks/useDataService";
import { formatGasPrice } from "../../utils/formatUtils";
import { resolveNetwork, getNetworkRpcKey } from "../../utils/networkResolver";

interface NetworkBlockIndicatorProps {
  className?: string;
}

export function NetworkBlockIndicator({ className }: NetworkBlockIndicatorProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { rpcUrls } = useContext(AppContext);
  const { networks } = useNetworks();
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [gasPrice, setGasPrice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Extract network slug from the pathname (e.g., /1/blocks -> "1", /btc/block/123 -> "btc")
  const networkSlug = useMemo(() => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    return pathSegments[0] || null;
  }, [location.pathname]);

  // Resolve network using slug (works for both "1", "btc", etc.)
  const network = useMemo(() => {
    if (!networkSlug) return undefined;
    return resolveNetwork(networkSlug, networks);
  }, [networkSlug, networks]);

  const dataService = useDataService(network || 1);

  useEffect(() => {
    if (!network) {
      setBlockNumber(null);
      setGasPrice(null);
      return;
    }

    let isMounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    const fetchData = async () => {
      const networkRpcKey = getNetworkRpcKey(network);
      try {
        if (network.type === "bitcoin" && dataService?.isBitcoin()) {
          // Fetch Bitcoin block height
          const adapter = dataService.getBitcoinAdapter();
          const height = await adapter.getLatestBlockNumber();
          if (isMounted) {
            setBlockNumber(height);
            setGasPrice(null); // Bitcoin doesn't have gas
            setIsLoading(false);
          }
        } else if (network.type === "evm") {
          // Fetch EVM block number
          const urls = getRPCUrls(networkRpcKey, rpcUrls);
          const client = new RpcClient(urls[0] || "");
          const result = await client.call<string>("eth_blockNumber", []);
          if (isMounted) {
            setBlockNumber(parseInt(result, 16));
            setIsLoading(false);
          }

          // Fetch gas price (only for EVM networks)
          if (dataService?.isEVM() && rpcUrls[networkRpcKey]) {
            try {
              const gasPricesResult = await dataService.networkAdapter.getGasPrices();
              if (isMounted && gasPricesResult.data) {
                setGasPrice(gasPricesResult.data.average);
              }
            } catch (error) {
              console.error("Failed to fetch gas price:", error);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch block number:", error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    setIsLoading(true);
    fetchData();

    // Poll every 12 seconds for EVM, 60 seconds for Bitcoin
    const pollInterval = network.type === "bitcoin" ? 60000 : 12000;
    intervalId = setInterval(fetchData, pollInterval);

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [network, rpcUrls, dataService]);

  if (!network) return null;

  return (
    <div
      className={`network-block-indicator ${className || ""}`}
      style={{ "--network-color": network.color } as React.CSSProperties}
      title={network.name}
    >
      <div className="network-block-pulse"></div>
      <span className="network-block-number">
        {isLoading ? "..." : blockNumber !== null ? `#${blockNumber.toLocaleString()}` : "---"}
      </span>
      {/* Only show gas tracker for EVM networks */}
      {network.type === "evm" && (
        // biome-ignore lint/a11y/useSemanticElements: using div for styling consistency
        <div
          className="network-block-number network-gas-tracker"
          id="gas-tracker"
          title={
            gasPrice
              ? `${formatGasPrice(gasPrice).value} ${formatGasPrice(gasPrice).unit}`
              : "Gas Tracker"
          }
          role="button"
          tabIndex={0}
          onClick={() => navigate(`/${networkSlug}/gastracker`)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate(`/${networkSlug}/gastracker`);
            }
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M3 22V6a2 2 0 012-2h8a2 2 0 012 2v16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M3 22h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path
              d="M13 10h2a2 2 0 012 2v3a2 2 0 002 2h0a2 2 0 002-2V9l-3-3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7 10h4v4H7z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{gasPrice ? formatGasPrice(gasPrice).value : "..."}</span>
        </div>
      )}
    </div>
  );
}

export default NetworkBlockIndicator;
