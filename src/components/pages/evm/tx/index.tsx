import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { getNetworkById } from "../../../../config/networks";
import { useDataService } from "../../../../hooks/useDataService";
import { usePersistentCache } from "../../../../hooks/usePersistentCache";
import { useProviderSelection } from "../../../../hooks/useProviderSelection";
import { useSelectedData } from "../../../../hooks/useSelectedData";
import type { DataWithMetadata, Transaction } from "../../../../types";
import { logger } from "../../../../utils/logger";
import Breadcrumb from "../../../common/Breadcrumb";
import LoaderWithTimeout from "../../../common/LoaderWithTimeout";
import TransactionDisplay from "./TransactionDisplay";

export default function Tx() {
  const { t } = useTranslation("transaction");
  const { networkId, filter } = useParams<{
    networkId?: string;
    filter?: string;
  }>();

  const txHash = filter;
  const numericNetworkId = Number(networkId) || 1;
  const networkConfig = getNetworkById(networkId ?? numericNetworkId);
  const networkLabel = networkConfig?.shortName || networkConfig?.name || `Chain ${networkId}`;

  const dataService = useDataService(numericNetworkId);
  const { getCached, setCached } = usePersistentCache();
  const cacheNetworkId = `eip155:${numericNetworkId}`;

  const [transactionResult, setTransactionResult] = useState<DataWithMetadata<Transaction> | null>(
    null,
  );
  const [currentBlockNumber, setCurrentBlockNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Provider selection state
  const [selectedProvider, setSelectedProvider] = useProviderSelection(
    `tx_${numericNetworkId}_${txHash}`,
  );

  // Extract actual transaction data based on selected provider
  const transaction = useSelectedData(transactionResult, selectedProvider);

  useEffect(() => {
    if (!dataService || !txHash) {
      setLoading(false);
      return;
    }

    // Check persistent cache for the transaction
    const cached = getCached<Transaction>(cacheNetworkId, "transaction", txHash);
    if (cached) {
      setTransactionResult({ data: cached });
      // Still fetch latest block number for confirmation count
      dataService.networkAdapter
        .getLatestBlockNumber()
        .then((latestBlock) => setCurrentBlockNumber(latestBlock))
        .catch(() => {});
      setLoading(false);
      return;
    }

    logger.debug("Fetching transaction:", txHash, "for chain:", numericNetworkId);
    setLoading(true);
    setError(null);

    Promise.all([
      dataService.networkAdapter.getTransaction(txHash),
      dataService.networkAdapter.getLatestBlockNumber(),
    ])
      .then(([result, latestBlock]) => {
        logger.debug("Fetched transaction:", result);
        logger.debug("Latest block number:", latestBlock);
        setTransactionResult(result);
        setCurrentBlockNumber(latestBlock);
        // Only cache confirmed transactions (those with a receipt)
        if (result.data.receipt) {
          setCached(cacheNetworkId, "transaction", txHash, result.data);
        }
      })
      .catch((err) => {
        logger.error("Error fetching transaction:", err);
        setError(err.message || "Failed to fetch transaction");
      })
      .finally(() => setLoading(false));
  }, [dataService, txHash, numericNetworkId, getCached, setCached, cacheNetworkId]);

  if (loading) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="block-display-header">
            <span className="block-label">{t("transaction")}</span>
            <span className="tx-mono header-subtitle">{txHash}</span>
          </div>
          <div className="card-content-loading">
            <LoaderWithTimeout
              text={t("loadingTransaction")}
              onRetry={() => window.location.reload()}
            />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="block-display-header">
            <span className="block-label">{t("transaction")}</span>
            <span className="tx-mono header-subtitle">{txHash}</span>
          </div>
          <div className="card-content">
            <p className="error-text margin-0">{t("errorPrefix", { error })}</p>
          </div>
        </div>
      </div>
    );
  }

  const truncatedHash = filter ? `${filter.slice(0, 10)}...${filter.slice(-6)}` : "";

  return (
    <div className="container-wide">
      <Breadcrumb
        items={[
          { label: "Home", to: "/" },
          { label: networkLabel, to: `/${networkId}` },
          { label: "Transactions", to: `/${networkId}/txs` },
          { label: truncatedHash },
        ]}
      />
      {transaction ? (
        <TransactionDisplay
          transaction={transaction}
          networkId={networkId}
          currentBlockNumber={currentBlockNumber || undefined}
          dataService={dataService || undefined}
          metadata={transactionResult?.metadata}
          selectedProvider={selectedProvider}
          onProviderSelect={setSelectedProvider}
        />
      ) : (
        <div className="block-display-card">
          <div className="block-display-header">
            <span className="block-label">{t("transaction")}</span>
          </div>
          <div className="card-content">
            <p className="text-muted margin-0">{t("transactionNotFound")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
