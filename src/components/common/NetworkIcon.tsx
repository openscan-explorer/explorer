import type React from "react";
import { useState } from "react";
import { getNetworkLogoUrl } from "../../services/MetadataService";
import type { NetworkConfig } from "../../types";

interface NetworkIconProps {
  network: NetworkConfig;
  size?: number;
}

// Fallback Ethereum SVG icon (used when logo fails to load)
const EthereumIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: <TODO>
  <svg width={size} height={size} viewBox="0 0 256 417" xmlns="http://www.w3.org/2000/svg">
    <path fill={color} d="m127.961 0-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" />
    <path fill={`${color}99`} d="M127.962 0 0 212.32l127.962 75.639V154.158z" />
    <path fill={color} d="m127.961 312.187-1.575 1.92v98.199l1.575 4.6L256 236.587z" />
    <path fill={`${color}99`} d="M127.962 416.905v-104.72L0 236.585z" />
  </svg>
);

export const NetworkIcon: React.FC<NetworkIconProps> = ({ network, size = 32 }) => {
  const [imageError, setImageError] = useState(false);

  // If logo failed to load, show fallback
  if (imageError || !network.logo) {
    return <EthereumIcon color={network.color ?? "#627EEA"} size={size} />;
  }

  const logoUrl = getNetworkLogoUrl(network.logo);

  return (
    <img
      src={logoUrl}
      alt={network.name}
      width={size}
      height={size}
      onError={() => setImageError(true)}
      className="object-contain"
    />
  );
};

export default NetworkIcon;
