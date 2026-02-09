import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { RPCIndicator } from "../../../common/RPCIndicator";
import { useDataService } from "../../../../hooks/useDataService";
import { useProviderSelection } from "../../../../hooks/useProviderSelection";
import type { Block, DataWithMetadata } from "../../../../types";
import { logger } from "../../../../utils/logger";
import Loader from "../../../common/Loader";

const BLOCKS_PER_PAGE = 10;

export default function Blocks() {
  const { t } = useTranslation("block");
  const { networkId } = useParams<{ networkId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const numericNetworkId = Number(networkId) || 1;
  const dataService = useDataService(numericNetworkId);
  const [blocksResult, setBlocksResult] = useState<DataWithMetadata<Block>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestBlockNumber, setLatestBlockNumber] = useState<number | null>(null);

  // Provider selection state
  const [selectedProvider, setSelectedProvider] = useProviderSelection(
    `blocks_${numericNetworkId}`,
  );

  // Extract actual blocks data based on selected provider
  const blocks = useMemo(() => {
    return blocksResult.map((result) => {
      if (!result) return null;

      // No metadata = fallback mode, return data as-is
      if (!result.metadata) {
        return result.data;
      }

      // No provider selected = use default (first successful)
      if (!selectedProvider) {
        return result.data;
      }

      // Find selected provider's response
      const providerResponse = result.metadata.responses.find(
        (r) => r.url === selectedProvider && r.status === "success",
      );

      if (!providerResponse || !providerResponse.data) {
        // Fallback to default if selected provider not found
        return result.data;
      }

      // Return the selected provider's data
      return providerResponse.data;
    });
  }, [blocksResult, selectedProvider]);

  // Get fromBlock from URL params, default to null (latest)
  const fromBlockParam = searchParams.get("fromBlock");
  const fromBlock = fromBlockParam ? Number(fromBlockParam) : null;

  useEffect(() => {
    if (!dataService || !dataService.isEVM()) {
      setLoading(false);
      return;
    }

    const fetchBlocks = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get the latest block number first
        const latestBlock = await dataService.networkAdapter.getLatestBlockNumber();
        setLatestBlockNumber(latestBlock);

        // Determine starting block
        const startBlock = fromBlock !== null ? fromBlock : latestBlock;

        // Calculate block numbers to fetch (going backwards from startBlock)
        const blockNumbers = Array.from(
          { length: BLOCKS_PER_PAGE },
          (_, i) => startBlock - i,
        ).filter((num) => num >= 0);

        // Fetch blocks in parallel
        const blockResults = await Promise.all(
          blockNumbers.map((num) => dataService.networkAdapter.getBlock(num)),
        );

        logger.debug("Fetched blocks:", blockResults);
        // Store complete results with metadata
        setBlocksResult(blockResults);
        // biome-ignore lint/suspicious/noExplicitAny: <TODO>
      } catch (err: any) {
        logger.error("Error fetching blocks:", err);
        setError(err.message || t("errors.failedToFetchBlocks"));
      } finally {
        setLoading(false);
      }
    };

    fetchBlocks();
  }, [dataService, fromBlock, t]);

  const truncate = (str: string, start = 10, end = 8) => {
    if (!str) return "";
    if (str.length <= start + end) return str;
    return `${str.slice(0, start)}...${str.slice(-end)}`;
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(Number(timestamp) * 1000);
      return date.toLocaleString();
    } catch (_e) {
      return timestamp;
    }
  };

  // Navigation handlers
  const goToNewerBlocks = () => {
    if (blocks.length === 0 || latestBlockNumber === null || !blocks[0]) return;
    const newestBlockInPage = Number(blocks[0].number);
    const newFromBlock = Math.min(newestBlockInPage + BLOCKS_PER_PAGE, latestBlockNumber);

    if (newFromBlock >= latestBlockNumber) {
      // Go to latest (remove fromBlock param)
      navigate(`/${networkId}/blocks`);
    } else {
      navigate(`/${networkId}/blocks?fromBlock=${newFromBlock}`);
    }
  };

  const goToOlderBlocks = () => {
    if (blocks.length === 0) return;
    const lastBlock = blocks[blocks.length - 1];
    if (!lastBlock) return;
    const oldestBlockInPage = Number(lastBlock.number);
    const newFromBlock = oldestBlockInPage - 1;

    if (newFromBlock >= 0) {
      navigate(`/${networkId}/blocks?fromBlock=${newFromBlock}`);
    }
  };

  const goToLatest = () => {
    navigate(`/${networkId}/blocks`);
  };

  // Determine if we can navigate
  const lastBlock = blocks[blocks.length - 1];
  const canGoNewer =
    fromBlock !== null && latestBlockNumber !== null && fromBlock < latestBlockNumber;
  const canGoOlder = blocks.length > 0 && lastBlock && Number(lastBlock.number) > 0;
  const isAtLatest =
    fromBlock === null || (latestBlockNumber !== null && fromBlock >= latestBlockNumber);

  if (loading) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="blocks-header">
            <span className="block-label">{t("latestBlocks")}</span>
          </div>
          <div className="card-content-loading">
            <Loader text={t("loadingBlocks")} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="blocks-header">
            <span className="block-label">{t("latestBlocks")}</span>
          </div>
          <div className="card-content">
            <p className="text-error margin-0">{t("errorPrefix", { error })}</p>
          </div>
        </div>
      </div>
    );
  }

  // Get metadata from first block result if available
  const metadata = blocksResult[0]?.metadata;

  return (
    <div className="container-wide">
      <div className="block-display-card">
        <div className="blocks-header">
          <div className="blocks-header-main">
            <span className="block-label">{t("latestBlocks")}</span>
            <span className="block-header-divider">•</span>
            <span className="blocks-header-info">
              {isAtLatest
                ? t("showingRecent", { count: blocks.length })
                : t("showingRange", {
                    oldest: Number(blocks[blocks.length - 1]?.number || 0).toLocaleString(),
                    newest: Number(blocks[0]?.number || 0).toLocaleString(),
                  })}
            </span>
          </div>
          {metadata && selectedProvider !== undefined && (
            <RPCIndicator
              metadata={metadata}
              selectedProvider={selectedProvider}
              onProviderSelect={setSelectedProvider}
            />
          )}
        </div>

        <div className="table-wrapper">
          <table className="dash-table">
            <thead>
              <tr>
                <th>{t("tableBlock")}</th>
                <th>{t("tableTimestamp")}</th>
                <th>{t("tableTxns")}</th>
                <th className="hide-mobile">{t("tableMiner")}</th>
                <th>{t("tableGasUsed")}</th>
                <th className="hide-mobile">{t("tableGasLimit")}</th>
                <th className="hide-mobile">{t("tableSize")}</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((block) => (
                <tr key={block.number}>
                  <td>
                    <Link
                      to={`/${networkId}/block/${Number(block.number).toString()}`}
                      className="table-cell-number"
                    >
                      {Number(block.number).toLocaleString()}
                    </Link>
                  </td>
                  <td className="table-cell-text">{formatTime(block.timestamp)}</td>
                  <td className="table-cell-value">
                    {block.transactions ? block.transactions.length : 0}
                  </td>
                  <td className="table-cell-mono hide-mobile" title={block.miner}>
                    <Link
                      to={`/${networkId}/address/${block.miner}`}
                      className="table-cell-address"
                    >
                      {truncate(block.miner)}
                    </Link>
                  </td>
                  <td className="table-cell-text">{Number(block.gasUsed).toLocaleString()}</td>
                  <td className="table-cell-muted hide-mobile">
                    {Number(block.gasLimit).toLocaleString()}
                  </td>
                  <td className="table-cell-muted hide-mobile">
                    {Number(block.size).toLocaleString()} {t("bytes")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination-container">
          {/** biome-ignore lint/a11y/useButtonType: <TODO> */}
          <button
            onClick={goToLatest}
            disabled={isAtLatest}
            className="pagination-btn"
            title="Go to latest blocks"
          >
            {t("paginationLatest")}
          </button>
          {/** biome-ignore lint/a11y/useButtonType: <TODO> */}
          <button
            onClick={goToNewerBlocks}
            disabled={!canGoNewer}
            className="pagination-btn"
            title={t("paginationNewer")}
          >
            ← {t("paginationNewer")}
          </button>
          {/** biome-ignore lint/a11y/useButtonType: <TODO> */}
          <button
            onClick={goToOlderBlocks}
            disabled={!canGoOlder}
            className="pagination-btn"
            title={t("paginationOlder")}
          >
            {t("paginationOlder")} →
          </button>
        </div>
      </div>
    </div>
  );
}
