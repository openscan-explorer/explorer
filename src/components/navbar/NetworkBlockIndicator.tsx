import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { getRPCUrls } from "../../config/rpcConfig";
import { AppContext, useNetworks } from "../../context/AppContext";
import { RpcClient } from "explorer-network-connectors";
import { NetworkIcon } from "../common/NetworkIcon";

interface NetworkBlockIndicatorProps {
  className?: string;
}

export function NetworkBlockIndicator({ className }: NetworkBlockIndicatorProps) {
  const location = useLocation();
  const { rpcUrls } = useContext(AppContext);
  const { getNetwork } = useNetworks();
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Extract networkId from the pathname (e.g., /1/blocks -> 1)
  const networkId = useMemo(() => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    return pathSegments[0] && !Number.isNaN(Number(pathSegments[0]))
      ? Number(pathSegments[0])
      : null;
  }, [location.pathname]);

  const network = networkId ? getNetwork(networkId) : undefined;

  useEffect(() => {
    if (!networkId) {
      setBlockNumber(null);
      return;
    }

    let isMounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    const fetchBlockNumber = async () => {
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
    };

    setIsLoading(true);
    fetchBlockNumber();

    // Poll for new blocks every 12 seconds (Ethereum average block time)
    intervalId = setInterval(fetchBlockNumber, 12000);

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [networkId, rpcUrls]);

  if (!networkId || !network) return null;

  return (
    <div
      className={`network-block-indicator ${className || ""}`}
      style={{ "--network-color": network.color } as React.CSSProperties}
      title={network.name}
    >
      <div className="network-block-pulse" />
      <div className="network-block-logo">
        <NetworkIcon network={network} size={20} />
      </div>
      <span className="network-block-number">
        {isLoading ? "..." : blockNumber !== null ? `#${blockNumber.toLocaleString()}` : "---"}
      </span>
    </div>
  );
}

export default NetworkBlockIndicator;
