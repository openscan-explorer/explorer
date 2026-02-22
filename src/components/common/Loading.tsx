import React from "react";
import OpenScanCubeLoader from "../LoadingLogo";

const Loading = React.memo(() => (
  <div className="loading-container">
    <OpenScanCubeLoader size={80} />
  </div>
));

Loading.displayName = "Loading";

export default Loading;
