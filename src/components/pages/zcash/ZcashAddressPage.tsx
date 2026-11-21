import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { LOADER_TIMEOUT_MS } from "../../../config/zcashConstants";
import { useDataService } from "../../../hooks/useDataService";
import { useZcashNetworkFromPath } from "../../../hooks/useZcashNetworkFromPath";
import type { ZcashAddress } from "../../../types";
import { truncateHash } from "../../../utils/zcashFormatters";
import Breadcrumb from "../../common/Breadcrumb";
import LoaderWithTimeout from "../../common/LoaderWithTimeout";
import ZcashAddressDisplay from "./ZcashAddressDisplay";

export default function ZcashAddressPage() {
  const { t } = useTranslation("zcash");
  const { address } = useParams<{ address?: string }>();
  const { slug: networkSlug, label: networkLabel, currency } = useZcashNetworkFromPath();
  const dataService = useDataService(networkSlug);

  const [result, setResult] = useState<ZcashAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Each section of the result carries its own availability, so a gateway that blocks the
  // address index still resolves; only unexpected failures reject
  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey re-runs the lookup on retry
  useEffect(() => {
    if (!dataService || !dataService.isZcash() || !address) return;

    const controller = new AbortController();
    const { signal } = controller;
    setLoading(true);
    setError(null);

    dataService
      .getZcashAdapter()
      .getAddress(address, { signal })
      .then((data) => {
        if (!signal.aborted) setResult(data);
      })
      .catch((err) => {
        if (!signal.aborted) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!signal.aborted) setLoading(false);
      });

    return () => controller.abort();
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
              key={reloadKey}
              text={t("address.loading")}
              timeoutMs={LOADER_TIMEOUT_MS}
              onRetry={() => setReloadKey((key) => key + 1)}
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
          currency={currency}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      )}
    </div>
  );
}
