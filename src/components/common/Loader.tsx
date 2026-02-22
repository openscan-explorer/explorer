import React from "react";
import OpenScanCubeLoader from "../LoadingLogo";

interface LoaderProps {
  size?: number;
  text?: string;
}

const Loader: React.FC<LoaderProps> = React.memo(({ size = 60, text }) => {
  return (
    <div className="loader-container">
      <OpenScanCubeLoader size={size} />
      {text && <p className="loader-text">{text}</p>}
    </div>
  );
});

Loader.displayName = "Loader";

export default Loader;
