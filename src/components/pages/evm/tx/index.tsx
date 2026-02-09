import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useDataService } from "../../../../hooks/useDataService";
import { useProviderSelection } from "../../../../hooks/useProviderSelection";
import { useSelectedData } from "../../../../hooks/useSelectedData";
import type { DataWithMetadata, Transaction } from "../../../../types";
import { logger } from "../../../../utils/logger";
import Loader from "../../../common/Loader";
import TransactionDisplay from "./TransactionDisplay";

export default function Tx() {
  const { t } = useTranslation("transaction");
  const { networkId, filter } = useParams<{
    networkId?: string;
    filter?: string;
  }>();

  const txHash = filter;
  const numericNetworkId = Number(networkId) || 1;

  const dataService = useDataService(numericNetworkId);
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
      })
      .catch((err) => {
        logger.error("Error fetching transaction:", err);
        setError(err.message || "Failed to fetch transaction");
      })
      .finally(() => setLoading(false));
  }, [dataService, txHash, numericNetworkId]);

  if (loading) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="block-display-header">
            <span className="block-label">{t("transaction")}</span>
            <span className="tx-mono header-subtitle">{txHash}</span>
          </div>
          <div className="card-content-loading">
            <Loader text={t("loadingTransaction")} />
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

  return (
    <div className="container-wide">
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
