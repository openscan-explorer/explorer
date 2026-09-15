import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import { getNetworkBySlug } from "../../../config/networks";
import { useDataService } from "../../../hooks/useDataService";
import type { ZcashAddress } from "../../../types";
import { truncateHash } from "../../../utils/zcashFormatters";
import Breadcrumb from "../../common/Breadcrumb";
import LoaderWithTimeout from "../../common/LoaderWithTimeout";
import ZcashAddressDisplay from "./ZcashAddressDisplay";

export default function ZcashAddressPage() {
  const { t } = useTranslation("zcash");
  const { address } = useParams<{ address?: string }>();
  const location = useLocation();

  // Extract network slug from path (e.g., "/tzec/address/..." → "tzec")
  const networkSlug = location.pathname.split("/")[1] || "zec";
  const dataService = useDataService(networkSlug);
  const network = getNetworkBySlug(networkSlug);
  const networkLabel = network?.shortName || networkSlug.toUpperCase();

  const [result, setResult] = useState<ZcashAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Each section of the result carries its own availability, so a gateway that blocks the
  // address index still resolves; only unexpected failures reject
  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey re-runs the lookup on retry
  useEffect(() => {
    if (!dataService || !dataService.isZcash() || !address) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    dataService
      .getZcashAdapter()
      .getAddress(address)
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dataService, address, reloadKey]);

  if (loading) {
    return (
      <div className="container-wide page-container-padded">
        <div className="page-card">
          <div className="block-display-header">
            <span className="block-label">{t("address.title")}</span>
          </div>
          <div className="card-content-loading">
            <LoaderWithTimeout
              text={t("address.loading")}
              onRetry={() => window.location.reload()}
            />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-wide page-container-padded">
        <div className="page-card">
          <div className="card-content">
            <p className="text-error margin-0">{t("address.loadError", { message: error })}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-wide page-container-padded">
      <Breadcrumb
        items={[
          { label: t("breadcrumb.home"), to: "/" },
          { label: networkLabel, to: `/${networkSlug}` },
          { label: t("breadcrumb.address", { address: truncateHash(address ?? "", "short") }) },
        ]}
      />
      {result && (
        <ZcashAddressDisplay
          address={result}
          networkId={networkSlug}
          currency={network?.currency ?? "ZEC"}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      )}
    </div>
  );
}
