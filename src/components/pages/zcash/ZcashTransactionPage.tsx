import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getNetworkBySlug } from "../../../config/networks";
import { useDataService } from "../../../hooks/useDataService";
import { usePersistentCache } from "../../../hooks/usePersistentCache";
import type { ZcashTransaction } from "../../../types";
import { truncateHash } from "../../../utils/zcashFormatters";
import { countPreviousTransactions } from "../../../utils/zcashUtils";
import Breadcrumb from "../../common/Breadcrumb";
import LoaderWithTimeout from "../../common/LoaderWithTimeout";
import ZcashTransactionDisplay, { type InputResolution } from "./ZcashTransactionDisplay";

const HASH_PATTERN = /^[0-9a-f]{64}$/i;

export default function ZcashTransactionPage() {
  const { t } = useTranslation("zcash");
  const { filter: txid } = useParams<{ filter?: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // Extract network slug from path (e.g., "/tzec/tx/..." → "tzec")
  const networkSlug = location.pathname.split("/")[1] || "zec";
  const dataService = useDataService(networkSlug);
  const network = getNetworkBySlug(networkSlug);
  const networkLabel = network?.shortName || networkSlug.toUpperCase();
  const cacheNetworkId = network?.networkId ?? networkSlug;
  const { getCached, setCached } = usePersistentCache();

  const [transaction, setTransaction] = useState<ZcashTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<InputResolution>({ status: "idle" });

  useEffect(() => {
    if (!dataService || !dataService.isZcash() || !txid) return;

    let cancelled = false;
    const adapter = dataService.getZcashAdapter();

    const fetchTransaction = async () => {
      setLoading(true);
      setError(null);
      setResolution({ status: "idle" });

      try {
        const cached = getCached<ZcashTransaction>(cacheNetworkId, "transaction", txid);
        if (cached) {
          if (!cancelled) setTransaction(cached);
          return;
        }

        const { data } = await adapter.getTransaction(txid);
        if (cancelled) return;
        setTransaction(data);
        if (data.confirmations) setCached(cacheNetworkId, "transaction", txid, data);
      } catch (err) {
        // Search sends every 64-character hash here, and Zcash block hashes look like txids,
        // so a hash that matches no transaction may still be a block
        const block = HASH_PATTERN.test(txid)
          ? await adapter.getBlock(txid).catch(() => null)
          : null;
        if (cancelled) return;
        if (block) {
          navigate(`/${networkSlug}/block/${block.data.block.hash}`, { replace: true });
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTransaction();
    return () => {
      cancelled = true;
    };
  }, [dataService, txid, getCached, setCached, cacheNetworkId, navigate, networkSlug]);

  // Zebra omits transparent input values, so the fee is only resolved when the user asks
  const resolveInputs = useCallback(async () => {
    if (!dataService?.isZcash() || !transaction) return;

    const adapter = dataService.getZcashAdapter();
    setResolution({
      status: "resolving",
      resolved: 0,
      total: countPreviousTransactions(transaction),
    });

    try {
      const result = await adapter.resolveTransparentInputs(transaction, {
        onProgress: (resolved, total) => setResolution({ status: "resolving", resolved, total }),
      });
      setTransaction(result.transaction);
      setResolution({ status: "done", resolved: result.resolved, total: result.total });
      if (result.transaction.confirmations && txid) {
        setCached(cacheNetworkId, "transaction", txid, result.transaction);
      }
    } catch (err) {
      setResolution({ status: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }, [dataService, transaction, txid, setCached, cacheNetworkId]);

  if (loading) {
    return (
      <div className="container-wide page-container-padded">
        <div className="page-card">
          <div className="block-display-header">
            <span className="block-label">{t("tx.title")}</span>
          </div>
          <div className="card-content-loading">
            <LoaderWithTimeout text={t("tx.loading")} onRetry={() => window.location.reload()} />
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
            <p className="text-error margin-0">{t("tx.loadError", { message: error })}</p>
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
          { label: t("breadcrumb.transactions"), to: `/${networkSlug}/txs` },
          { label: t("breadcrumb.transaction", { txid: truncateHash(txid ?? "", "short") }) },
        ]}
      />
      {transaction ? (
        <ZcashTransactionDisplay
          transaction={transaction}
          networkId={networkSlug}
          currency={network?.currency ?? "ZEC"}
          resolution={resolution}
          onResolveInputs={resolveInputs}
        />
      ) : (
        <div className="page-card">
          <div className="card-content">
            <p className="text-muted margin-0">{t("tx.notFound")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
