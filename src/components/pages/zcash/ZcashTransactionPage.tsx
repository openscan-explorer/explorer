import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { CACHE_MIN_CONFIRMATIONS, LOADER_TIMEOUT_MS } from "../../../config/zcashConstants";
import { useDataService } from "../../../hooks/useDataService";
import { usePersistentCache } from "../../../hooks/usePersistentCache";
import { useZcashNetworkFromPath } from "../../../hooks/useZcashNetworkFromPath";
import { ZcashRpcError } from "../../../services/adapters/ZcashAdapter";
import type { ZcashTransaction } from "../../../types";
import { isHex64Hash } from "../../../utils/hashUtils";
import { truncateHash } from "../../../utils/zcashFormatters";
import { countPreviousTransactions } from "../../../utils/zcashUtils";
import Breadcrumb from "../../common/Breadcrumb";
import LoaderWithTimeout from "../../common/LoaderWithTimeout";
import ZcashTransactionDisplay, { type InputResolution } from "./ZcashTransactionDisplay";

export default function ZcashTransactionPage() {
  const { t } = useTranslation("zcash");
  const { filter: txid } = useParams<{ filter?: string }>();
  const navigate = useNavigate();
  const {
    slug: networkSlug,
    label: networkLabel,
    currency,
    cacheNetworkId,
  } = useZcashNetworkFromPath();
  const dataService = useDataService(networkSlug);
  const { getCached, setCached } = usePersistentCache();

  const [transaction, setTransaction] = useState<ZcashTransaction | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [resolution, setResolution] = useState<InputResolution>({ status: "idle" });
  // The input lookup belongs to one transaction: it's aborted when the page shows another
  const resolveControllerRef = useRef<AbortController | null>(null);

  const cacheIfFinal = useCallback(
    (tx: ZcashTransaction) => {
      if (txid && (tx.confirmations ?? 0) >= CACHE_MIN_CONFIRMATIONS) {
        setCached(cacheNetworkId, "transaction", txid, tx);
      }
    },
    [txid, setCached, cacheNetworkId],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt re-runs the fetch on retry
  useEffect(() => {
    if (!dataService || !dataService.isZcash() || !txid) return;

    const controller = new AbortController();
    const { signal } = controller;
    const adapter = dataService.getZcashAdapter();

    const fetchTransaction = async () => {
      setLoading(true);
      setError(null);
      setFromCache(false);
      setResolution({ status: "idle" });

      try {
        const cached = getCached<ZcashTransaction>(cacheNetworkId, "transaction", txid);
        if (cached) {
          setTransaction(cached);
          setFromCache(true);
          return;
        }

        const { data } = await adapter.getTransaction(txid, { signal });
        if (signal.aborted) return;
        setTransaction(data);
        cacheIfFinal(data);
      } catch (err) {
        if (signal.aborted) return;
        // Zcash block hashes look like txids, so a hash the node says matches no transaction
        // may be a block (from search, or a pasted /tx/<block hash> URL). Rate-limited or
        // unreachable endpoints said nothing about the hash, so don't spend a call on those.
        const notATransaction = err instanceof ZcashRpcError && err.answered;
        const result =
          notATransaction && isHex64Hash(txid)
            ? await adapter.getBlock(txid, { signal }).catch(() => null)
            : null;
        if (signal.aborted) return;
        if (result) {
          const { block } = result.data;
          if (block.nextBlockHash) {
            setCached(cacheNetworkId, "block", String(block.height), block);
          }
          // Hand the block over so its page doesn't fetch it again
          navigate(`/${networkSlug}/block/${block.height}`, { replace: true, state: { block } });
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    fetchTransaction();
    return () => {
      controller.abort();
      resolveControllerRef.current?.abort();
    };
  }, [
    dataService,
    txid,
    getCached,
    cacheNetworkId,
    cacheIfFinal,
    attempt,
    navigate,
    networkSlug,
    setCached,
  ]);

  // Zebra omits transparent input values, so the fee is only resolved when the user asks.
  // A failed run keeps what it resolved, so asking again resumes from there.
  const resolveInputs = useCallback(async () => {
    if (!dataService?.isZcash() || !transaction) return;

    resolveControllerRef.current?.abort();
    const controller = new AbortController();
    resolveControllerRef.current = controller;
    const { signal } = controller;
    const adapter = dataService.getZcashAdapter();

    setResolution({
      status: "resolving",
      resolved: 0,
      total: countPreviousTransactions(transaction),
    });

    try {
      const result = await adapter.resolveTransparentInputs(transaction, {
        signal,
        onProgress: (resolved, total) => {
          if (!signal.aborted) setResolution({ status: "resolving", resolved, total });
        },
      });
      if (signal.aborted) return;
      setTransaction(result.transaction);
      if (result.error) {
        setResolution({
          status: "error",
          resolved: result.resolved,
          total: result.total,
          message: result.error instanceof Error ? result.error.message : String(result.error),
        });
        return;
      }
      setResolution({ status: "done", resolved: result.resolved, total: result.total });
      cacheIfFinal(result.transaction);
    } catch (err) {
      if (signal.aborted) return;
      setResolution({
        status: "error",
        resolved: 0,
        total: countPreviousTransactions(transaction),
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [dataService, transaction, cacheIfFinal]);

  if (loading) {
    return (
      <div className="container-wide page-container-padded">
        <div className="page-card">
          <div className="block-display-header">
            <span className="block-label">{t("tx.title")}</span>
          </div>
          <div className="card-content-loading">
            <LoaderWithTimeout
              key={attempt}
              text={t("tx.loading")}
              timeoutMs={LOADER_TIMEOUT_MS}
              onRetry={() => setAttempt((count) => count + 1)}
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
          currency={currency}
          confirmationsAtLeast={fromCache}
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
