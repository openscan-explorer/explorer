import type React from "react";

type Props = {
  size?: number;
};

const OpenScanCubeLoader: React.FC<Props> = ({ size = 120 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 36 36"
    xmlns="http://www.w3.org/2000/svg"
    overflow="visible"
    aria-label="OpenScan Cube Loader"
  >
    <title>OpenScan Cube Loader</title>

    {/* Right face - Dark green */}
    <g className="cube-breathe-right">
      <polygon
        className="cube-rotate-cw"
        points="20,22 34,14 34,28 20,36"
        fill="#065743"
        strokeLinejoin="round"
      />
    </g>

    {/* Left face - Hardhat yellow */}
    <g className="cube-breathe-left">
      <polygon
        className="cube-rotate-ccw"
        points="6,14 20,22 20,36 6,28"
        fill="#FFF100"
        strokeLinejoin="round"
      />
    </g>

    {/* Top face - Ethereum blue */}
    <g className="cube-breathe-top">
      <polygon
        className="cube-rotate-cw"
        points="20,6 34,14 20,22 6,14"
        fill="#627EEA"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

export default OpenScanCubeLoader;
