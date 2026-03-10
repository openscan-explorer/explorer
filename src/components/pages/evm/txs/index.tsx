import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { RPCIndicator } from "../../../../components/common/RPCIndicator";
import Breadcrumb from "../../../../components/common/Breadcrumb";
import { getNetworkById } from "../../../../config/networks";
import { useDataService } from "../../../../hooks/useDataService";
import { useProviderSelection } from "../../../../hooks/useProviderSelection";
import type { Block, DataWithMetadata, Transaction } from "../../../../types";
import { logger } from "../../../../utils/logger";

export default function Txs() {
  const { networkId } = useParams<{ networkId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const numericNetworkId = Number(networkId) || 1;
  const dataService = useDataService(numericNetworkId);
  const networkConfig = getNetworkById(networkId ?? numericNetworkId);
  const networkName = networkConfig?.name ?? String(networkId);
  const networkLabel = networkConfig?.shortName || networkConfig?.name || `Chain ${networkId}`;
  const [blockResult, setBlockResult] = useState<DataWithMetadata<Block> | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestBlockNumber, setLatestBlockNumber] = useState<number | null>(null);
  const [currentBlock, setCurrentBlock] = useState<number | null>(null);

  // Provider selection state
  const [selectedProvider, setSelectedProvider] = useProviderSelection(`txs_${numericNetworkId}`);

  const { t } = useTranslation("transaction");

  // Get block from URL params, default to null (latest)
  const blockParam = searchParams.get("block");
  const requestedBlock = blockParam ? Number(blockParam) : null;

  useEffect(() => {
    if (!dataService) {
      setLoading(false);
      return;
    }

    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get the latest block number first
        const latestBlock = await dataService.networkAdapter.getLatestBlockNumber();
        setLatestBlockNumber(latestBlock);

        // Determine which block to fetch
        const blockNum = requestedBlock !== null ? requestedBlock : latestBlock;
        setCurrentBlock(blockNum);

        // Fetch block with transactions
        const blockWithTxs = await dataService.networkAdapter.getBlockWithTransactions(blockNum);
        logger.debug("Fetched block with transactions:", blockWithTxs);

        // Get block metadata separately
        const blockData = await dataService.networkAdapter.getBlock(blockNum);
        setBlockResult(blockData);

        setTransactions(blockWithTxs.transactionDetails);
        // biome-ignore lint/suspicious/noExplicitAny: <TODO>
      } catch (err: any) {
        logger.error("Error fetching transactions:", err);
        setError(err.message || t("txs.failedToFetch"));
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [dataService, requestedBlock, t]);

  const truncate = (str: string, start = 10, end = 8) => {
    if (!str) return "";
    if (str.length <= start + end) return str;
    return `${str.slice(0, start)}...${str.slice(-end)}`;
  };

  const formatValue = (value: string) => {
    try {
      const eth = Number(value) / 1e18;
      return `${eth.toFixed(6)} ETH`;
    } catch (_e) {
      return value;
    }
  };

  const formatGasPrice = (gasPrice: string) => {
    try {
      const gwei = Number(gasPrice) / 1e9;
      return `${gwei.toFixed(2)} Gwei`;
    } catch (_e) {
      return gasPrice;
    }
  };

  // Navigation handlers
  const goToNewerBlock = () => {
    if (currentBlock === null || latestBlockNumber === null) return;
    const newBlock = currentBlock + 1;

    if (newBlock >= latestBlockNumber) {
      navigate(`/${networkId}/txs`);
    } else {
      navigate(`/${networkId}/txs?block=${newBlock}`);
    }
  };

  const goToOlderBlock = () => {
    if (currentBlock === null) return;
    const newBlock = currentBlock - 1;

    if (newBlock >= 0) {
      navigate(`/${networkId}/txs?block=${newBlock}`);
    }
  };

  const goToLatest = () => {
    navigate(`/${networkId}/txs`);
  };

  // Determine if we can navigate
  const canGoNewer =
    currentBlock !== null && latestBlockNumber !== null && currentBlock < latestBlockNumber;
  const canGoOlder = currentBlock !== null && currentBlock > 0;
  const isAtLatest = requestedBlock === null;

  const Pagination = () => {
    return (
      <div className="pagination-container no-margin-top">
        {/** biome-ignore lint/a11y/useButtonType: <TODO> */}
        <button
          onClick={goToLatest}
          disabled={isAtLatest || loading}
          className="pagination-btn"
          title={t("txs.pagination.latestTitle")}
          aria-label={t("txs.pagination.latestTitle")}
        >
          {t("txs.pagination.latest")}
        </button>

        {/** biome-ignore lint/a11y/useButtonType: <TODO> */}
        <button
          onClick={goToNewerBlock}
          disabled={!canGoNewer || loading}
          className="pagination-btn"
          title={t("txs.pagination.newerTitle")}
          aria-label={t("txs.pagination.newerTitle")}
        >
          {t("txs.pagination.newer")}
        </button>

        {/** biome-ignore lint/a11y/useButtonType: <TODO> */}
        <button
          onClick={goToOlderBlock}
          disabled={!canGoOlder || loading}
          className="pagination-btn"
          title={t("txs.pagination.olderTitle")}
          aria-label={t("txs.pagination.olderTitle")}
        >
          {t("txs.pagination.older")}
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container-wide">
        <Breadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: networkLabel, to: `/${networkId}` },
            { label: "Transactions" },
          ]}
        />
        <div className="block-display-card">
          <div className="blocks-header">
            <span className="block-label">{t("txs.latests", { network: networkName })}</span>
          </div>
          <Pagination />
          <div className="table-wrapper">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Tx Hash</th>
                  <th>{t("txs.block")}</th>
                  <th>{t("txs.from")}</th>
                  <th>{t("txs.to")}</th>
                  <th>{t("txs.value")}</th>
                  <th className="hide-mobile">{t("txs.gasPrice")}</th>
                  <th className="hide-mobile">{t("txs.gas")}</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 20 }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
                  <tr key={i}>
                    <td>
                      <span className="skeleton-pulse" style={{ width: "120px", height: 14 }} />
                    </td>
                    <td>
                      <span className="skeleton-pulse" style={{ width: "70px", height: 14 }} />
                    </td>
                    <td>
                      <span className="skeleton-pulse" style={{ width: "120px", height: 14 }} />
                    </td>
                    <td>
                      <span className="skeleton-pulse" style={{ width: "120px", height: 14 }} />
                    </td>
                    <td>
                      <span className="skeleton-pulse" style={{ width: "80px", height: 14 }} />
                    </td>
                    <td className="hide-mobile">
                      <span className="skeleton-pulse" style={{ width: "70px", height: 14 }} />
                    </td>
                    <td className="hide-mobile">
                      <span className="skeleton-pulse" style={{ width: "60px", height: 14 }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-wide">
        <Breadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: networkLabel, to: `/${networkId}` },
            { label: "Transactions" },
          ]}
        />
        <div className="block-display-card">
          <div className="blocks-header">
            <span className="block-label">{t("txs.latests", { network: networkName })}</span>
          </div>
          <div className="card-content">
            <p className="text-error margin-0">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Get metadata from block result if available
  const metadata = blockResult?.metadata;
  const formattedBlock = currentBlock !== null ? currentBlock.toLocaleString() : "";
  const message = isAtLatest
    ? t("txs.latest", {
        count: transactions.length,
        block: formattedBlock,
      })
    : t("txs.range", {
        count: transactions.length,
        block: formattedBlock,
      });

  return (
    <div className="container-wide">
      <Breadcrumb
        items={[
          { label: "Home", to: "/" },
          { label: networkLabel, to: `/${networkId}` },
          { label: "Transactions" },
        ]}
      />
      <div className="block-display-card">
        <div className="blocks-header">
          <div className="blocks-header-main">
            <span className="block-label">{t("txs.latests", { network: networkName })}</span>
            <span className="block-header-divider">•</span>
            <span className="blocks-header-info">{message}</span>
          </div>
          {metadata && selectedProvider !== undefined && (
            <RPCIndicator
              metadata={metadata}
              selectedProvider={selectedProvider}
              onProviderSelect={setSelectedProvider}
            />
          )}
        </div>

        <Pagination />

        {transactions.length === 0 ? (
          <p className="table-cell-muted">{t("txs.notFound")}</p>
        ) : (
          <div className="table-wrapper">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Tx Hash</th>
                  <th>{t("txs.block")}</th>
                  <th>{t("txs.from")}</th>
                  <th>{t("txs.to")}</th>
                  <th>{t("txs.value")}</th>
                  <th className="hide-mobile">{t("txs.gasPrice")}</th>
                  <th className="hide-mobile">{t("txs.gas")}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction: Transaction) => (
                  <tr key={transaction.hash}>
                    <td>
                      <Link
                        to={`/${networkId}/tx/${transaction.hash}`}
                        className="table-cell-hash"
                        title={transaction.hash}
                      >
                        {truncate(transaction.hash)}
                      </Link>
                    </td>
                    <td>
                      <Link to={`/${networkId}/block/${currentBlock}`} className="table-cell-value">
                        {formattedBlock}
                      </Link>
                    </td>
                    <td className="table-cell-mono" title={transaction.from}>
                      <Link
                        to={`/${networkId}/address/${transaction.from}`}
                        className="table-cell-address"
                      >
                        {truncate(transaction.from)}
                      </Link>
                    </td>
                    <td className="table-cell-mono" title={transaction.to}>
                      {transaction.to ? (
                        <Link
                          to={`/${networkId}/address/${transaction.to}`}
                          className="table-cell-address"
                        >
                          {truncate(transaction.to)}
                        </Link>
                      ) : (
                        <span className="table-cell-italic">{t("txs.contractCreation")}</span>
                      )}
                    </td>
                    <td className="table-cell-value">{formatValue(transaction.value)}</td>
                    <td className="table-cell-muted hide-mobile">
                      {formatGasPrice(transaction.gasPrice)}
                    </td>
                    <td className="table-cell-muted hide-mobile">
                      {Number(transaction.gas).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination />
      </div>
    </div>
  );
}
