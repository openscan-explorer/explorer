import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getRPCUrls } from "../../config/rpcConfig";
import { AppContext, useNetworks } from "../../context/AppContext";
import { RpcClient } from "@openscan/network-connectors";
import { useDataService } from "../../hooks/useDataService";
import { formatGasPrice } from "../../utils/formatUtils";

interface NetworkBlockIndicatorProps {
  className?: string;
}

export function NetworkBlockIndicator({ className }: NetworkBlockIndicatorProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { rpcUrls } = useContext(AppContext);
  const { getNetwork } = useNetworks();
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [gasPrice, setGasPrice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Extract networkId from the pathname (e.g., /1/blocks -> 1)
  const networkId = useMemo(() => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    return pathSegments[0] && !Number.isNaN(Number(pathSegments[0]))
      ? Number(pathSegments[0])
      : null;
  }, [location.pathname]);

  const network = networkId ? getNetwork(networkId) : undefined;
  const dataService = useDataService(networkId || 1);

  useEffect(() => {
    if (!networkId) {
      setBlockNumber(null);
      setGasPrice(null);
      return;
    }

    let isMounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    const fetchData = async () => {
      try {
        const urls = getRPCUrls(networkId, rpcUrls);
        const client = new RpcClient(urls[0] || "");
        const result = await client.call<string>("eth_blockNumber", []);
        if (isMounted) {
          setBlockNumber(parseInt(result, 16));
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to fetch block number:", error);
        if (isMounted) {
          setIsLoading(false);
        }
      }

      // Fetch gas price
      if (dataService && rpcUrls[networkId]) {
        try {
          const gasPricesResult = await dataService.networkAdapter.getGasPrices();
          if (isMounted && gasPricesResult.data) {
            setGasPrice(gasPricesResult.data.average);
          }
        } catch (error) {
          console.error("Failed to fetch gas price:", error);
        }
      }
    };

    setIsLoading(true);
    fetchData();

    // Poll every 12 seconds
    intervalId = setInterval(fetchData, 12000);

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [networkId, rpcUrls, dataService]);

  if (!networkId || !network) return null;

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
      {/* biome-ignore lint/a11y/useSemanticElements: using div for styling consistency */}
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
        onClick={() => navigate(`/${networkId}/gastracker`)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate(`/${networkId}/gastracker`);
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
    </div>
  );
}

export default NetworkBlockIndicator;
