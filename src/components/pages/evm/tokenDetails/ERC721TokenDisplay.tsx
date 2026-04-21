import type React from "react";
import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { AppContext } from "../../../../context";
import {
  type CollectionInfo,
  type ERC721TokenMetadata,
  fetchCollectionInfo,
  fetchERC721MetadataWithUri,
  fetchTokenApproval,
  fetchTokenOwner,
  getImageUrl,
} from "../../../../utils/erc721Metadata";
import { logger } from "../../../../utils/logger";
import FieldLabel from "../../../common/FieldLabel";
import LoaderWithTimeout from "../../../common/LoaderWithTimeout";

const ERC721TokenDisplay: React.FC = () => {
  const {
    networkId,
    address: contractAddress,
    tokenId,
  } = useParams<{
    networkId?: string;
    address?: string;
    tokenId?: string;
  }>();

  const { rpcUrls } = useContext(AppContext);
  const [metadata, setMetadata] = useState<ERC721TokenMetadata | null>(null);
  const [collectionInfo, setCollectionInfo] = useState<CollectionInfo | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [approval, setApproval] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenUri, setTokenUri] = useState<string | null>(null);

  const { t } = useTranslation("tokenDetails");
  const numericNetworkId = Number(networkId) || 1;

  // Get RPC URL
  const rpcNetworkId = `eip155:${numericNetworkId}`;
  const rpcUrlsForChain = rpcUrls[rpcNetworkId];
  const rpcUrl = Array.isArray(rpcUrlsForChain) ? rpcUrlsForChain[0] : rpcUrlsForChain;

  // Fetch token metadata and ownership info
  useEffect(() => {
    if (!contractAddress || !tokenId || !rpcUrl) {
      setLoading(false);
      setError(t("missingValues"));
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      fetchERC721MetadataWithUri(contractAddress, tokenId, rpcUrl),
      fetchTokenOwner(contractAddress, tokenId, rpcUrl),
      fetchTokenApproval(contractAddress, tokenId, rpcUrl),
      fetchCollectionInfo(contractAddress, rpcUrl),
    ])
      .then(([metadataResult, ownerResult, approvalResult, collectionResult]) => {
        if (metadataResult.metadata) {
          setMetadata(metadataResult.metadata);
        }
        setTokenUri(metadataResult.tokenUri);
        setOwner(ownerResult);
        setApproval(approvalResult);
        setCollectionInfo(collectionResult);

        // Only show error if we couldn't get metadata AND owner
        if (!metadataResult.metadata && !ownerResult) {
          setError(t("tokenFetchFail"));
        }
      })
      .catch((err) => {
        logger.error("Error fetching token data:", err);
        setError(err.message || t("tokenDataFetchFail")); // "Failed to fetch token data"
      })
      .finally(() => setLoading(false));
  }, [contractAddress, tokenId, rpcUrl, t]);

  if (loading) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="block-display-header">
            <span className="block-label">ERC-721 NFT</span>
            <span className="tx-mono header-subtitle">: {tokenId}</span>
          </div>
          <div className="card-content-loading">
            <LoaderWithTimeout
              text="Loading NFT metadata..."
              onRetry={() => window.location.reload()}
            />
          </div>
        </div>
      </div>
    );
  }

  if (error && !owner) {
    return (
      <div className="container-wide">
        <div className="block-display-card">
          <div className="block-display-header">
            <span className="block-label">ERC-721 NFT</span>
            <span className="tx-mono header-subtitle">
              {t("tokenID")}: {tokenId}
            </span>
          </div>
          <div className="card-content">
            <p className="text-error margin-0">
              {t("errors.error")}: {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const imageUrl = metadata ? getImageUrl(metadata) : null;
  // Token name from metadata, collection name from contract
  const tokenName = metadata?.name;
  const collectionName = collectionInfo?.name;
  const collectionSymbol = collectionInfo?.symbol;

  // BigInt for uint256 safety; totalSupply may be absent on non-enumerable contracts.
  let prevTokenId: string | null = null;
  let nextTokenId: string | null = null;
  try {
    const current = tokenId != null ? BigInt(tokenId) : null;
    if (current !== null) {
      if (current > 0n) prevTokenId = (current - 1n).toString();
      const totalSupplyBig = collectionInfo?.totalSupply
        ? BigInt(collectionInfo.totalSupply)
        : null;
      if (totalSupplyBig === null || current + 1n < totalSupplyBig) {
        nextTokenId = (current + 1n).toString();
      }
    }
  } catch {}

  return (
    <div className="container-wide">
      <div className="block-display-card">
        {/* Header Section */}
        <div className="block-display-header">
          <div className="erc721-header">
            {/* Token name */}
            {tokenName && <span className="erc721-token-name">{tokenName}</span>}
            {/* Collection name with symbol and Token ID on same line */}
            <div className="erc721-header-title">
              {collectionName && (
                <Link
                  to={`/${networkId}/address/${contractAddress}`}
                  className="nft-collection-link"
                >
                  {collectionName}
                  {collectionSymbol && (
                    <span className="nft-collection-symbol">({collectionSymbol})</span>
                  )}
                </Link>
              )}
              <span className="erc721-token-nav">
                {prevTokenId !== null && networkId && contractAddress ? (
                  <Link
                    to={`/${networkId}/address/${contractAddress}/${prevTokenId}`}
                    className="block-nav-btn"
                    title={t("previousToken")}
                    aria-label={t("previousToken")}
                  >
                    ←
                  </Link>
                ) : (
                  <span className="block-nav-btn block-nav-btn-disabled" aria-hidden="true">
                    ←
                  </span>
                )}
                <span className="tx-mono header-subtitle">
                  {t("tokenID")}: {tokenId}
                </span>
                {nextTokenId !== null && networkId && contractAddress ? (
                  <Link
                    to={`/${networkId}/address/${contractAddress}/${nextTokenId}`}
                    className="block-nav-btn"
                    title={t("nextToken")}
                    aria-label={t("nextToken")}
                  >
                    →
                  </Link>
                ) : (
                  <span className="block-nav-btn block-nav-btn-disabled" aria-hidden="true">
                    →
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="erc721-detail-content">
          {/* Token Image and Basic Info */}
          <div className="erc721-main-section">
            {imageUrl && (
              <div className="erc721-image-container">
                <img
                  src={imageUrl}
                  alt={tokenName || `NFT #${tokenId}`}
                  className="erc721-token-image"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}

            <div className="tx-details">
              <div className="tx-section">
                <span className="tx-section-title">{t("NFTDetails")}</span>
              </div>

              {/* Collection */}
              {collectionName && (
                <div className="tx-row">
                  <span className="tx-label">{t("NFTCollection")}</span>
                  <span className="tx-value">
                    <Link to={`/${networkId}/address/${contractAddress}`} className="address-link">
                      {collectionName}
                      {collectionSymbol && ` (${collectionSymbol})`}
                    </Link>
                  </span>
                </div>
              )}

              {/* Contract Address */}
              <div className="tx-row">
                <span className="tx-label">{t("contract")}</span>
                <span className="tx-value">
                  <Link to={`/${networkId}/address/${contractAddress}`} className="address-link">
                    {contractAddress}
                  </Link>
                </span>
              </div>

              {/* Token ID */}
              <div className="tx-row">
                <FieldLabel
                  label={`${t("tokenID")}:`}
                  tooltipKey="token.tokenId"
                  visibleFor={["beginner"]}
                />
                <span className="tx-value tx-mono">{tokenId}</span>
              </div>

              {/* Token Standard */}
              <div className="tx-row">
                <FieldLabel
                  label={`${t("tokenStandard")}:`}
                  tooltipKey="token.tokenStandard"
                  visibleFor={["beginner", "intermediate"]}
                />
                <span className="tx-value">
                  <span className="token-standard-badge token-standard-erc721">ERC-721</span>
                </span>
              </div>

              {/* Total Supply */}
              {collectionInfo?.totalSupply && (
                <div className="tx-row">
                  <FieldLabel
                    label={t("size")}
                    tooltipKey="token.totalSupply"
                    visibleFor={["beginner", "intermediate"]}
                  />
                  <span className="tx-value">
                    {Number(collectionInfo.totalSupply).toLocaleString()} NFTs
                  </span>
                </div>
              )}

              {/* Owner */}
              {owner && (
                <div className="tx-row">
                  <FieldLabel
                    label={t("owner")}
                    tooltipKey="token.owner"
                    visibleFor={["beginner"]}
                  />
                  <span className="tx-value">
                    <Link to={`/${networkId}/address/${owner}`} className="address-link">
                      {owner}
                    </Link>
                  </span>
                </div>
              )}

              {/* Approved Address */}
              {approval && (
                <div className="tx-row">
                  <FieldLabel
                    label={`${t("approved")}:`}
                    tooltipKey="token.approved"
                    visibleFor={["beginner", "intermediate"]}
                  />
                  <span className="tx-value">
                    <Link to={`/${networkId}/address/${approval}`} className="address-link">
                      {approval}
                    </Link>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Description Section */}
          {metadata?.description && (
            <div className="tx-details">
              <div className="tx-section">
                <span className="tx-section-title">{t("description")}</span>
              </div>
              <div className="nft-description">{metadata.description}</div>
            </div>
          )}

          {/* Properties/Attributes Section */}
          {metadata?.attributes && metadata.attributes.length > 0 && (
            <div className="tx-details">
              <div className="tx-section">
                <span className="tx-section-title">{t("properties")}</span>
                <span className="tx-section-count">{metadata.attributes.length}</span>
              </div>
              <div className="erc721-attributes-grid">
                {metadata.attributes.map((attr, index) => (
                  <div key={`${attr.trait_type}-${index}`} className="erc721-attribute-card">
                    <span className="erc721-attribute-type">{attr.trait_type}</span>
                    <span className="erc721-attribute-value">{String(attr.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Details */}
          {(metadata?.external_url || metadata?.animation_url) && (
            <div className="tx-details">
              <div className="tx-section">
                <span className="tx-section-title">{t("links")}</span>
              </div>
              <div className="nft-links">
                {metadata?.external_url && (
                  <a
                    href={metadata.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nft-link-button"
                  >
                    {t("externalURL")} ↗
                  </a>
                )}
                {metadata?.animation_url && (
                  <a
                    href={
                      metadata.animation_url.startsWith("ipfs://")
                        ? metadata.animation_url.replace("ipfs://", "https://ipfs.io/ipfs/")
                        : metadata.animation_url
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nft-link-button"
                  >
                    {t("viewAnimation")} ↗
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Token URI Section */}
          {tokenUri && (
            <div className="tx-details">
              <div className="tx-section">
                <span className="tx-section-title">T{t("tokenURI")}</span>
              </div>
              <div className="nft-token-uri">
                <code className="nft-token-uri-code">{tokenUri}</code>
                {!tokenUri.startsWith("data:") && (
                  <a
                    href={
                      tokenUri.startsWith("ipfs://")
                        ? tokenUri.replace("ipfs://", "https://ipfs.io/ipfs/")
                        : tokenUri
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nft-link-button nft-token-uri-link"
                  >
                    {t("openURI")} ↗
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Raw Metadata Section */}
          {metadata && (
            <div className="tx-details">
              <button
                type="button"
                className="tx-section btn-toggle-section"
                onClick={() => {
                  const elem = document.getElementById("raw-metadata-content");
                  const icon = document.getElementById("raw-metadata-icon");
                  if (elem && icon) {
                    const isHidden = elem.style.display === "none";
                    elem.style.display = isHidden ? "block" : "none";
                    icon.textContent = isHidden ? "▼" : "▶";
                  }
                }}
              >
                <span className="tx-section-title">{t("rawMetadata")}</span>
                <span id="raw-metadata-icon" className="contract-section-toggle">
                  ▶
                </span>
              </button>
              <div id="raw-metadata-content" className="tx-input-data hidden">
                <code>{JSON.stringify(metadata, null, 2)}</code>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ERC721TokenDisplay;
