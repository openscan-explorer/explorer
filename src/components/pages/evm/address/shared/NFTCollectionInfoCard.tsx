import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

interface NFTCollectionInfoCardProps {
  collectionName?: string;
  collectionSymbol?: string;
  collectionLogo?: string;
  tokenStandard: "ERC-721" | "ERC-1155";
  totalSupply?: string;
  metadataUri?: string;
  networkId: string;
  addressHash: string;
}

const NFTCollectionInfoCard: React.FC<NFTCollectionInfoCardProps> = ({
  collectionName,
  collectionSymbol,
  collectionLogo,
  tokenStandard,
  totalSupply,
  metadataUri,
  networkId,
  addressHash,
}) => {
  const { t } = useTranslation("address");
  const [tokenIdInput, setTokenIdInput] = useState("");

  const standardClass =
    tokenStandard === "ERC-721" ? "token-standard-erc721" : "token-standard-erc1155";

  return (
    <div className="nft-collection-info-card">
      <div className="account-card-title">
        {tokenStandard === "ERC-721" ? "NFT Collection" : "Multi-Token Collection"}
      </div>

      {/* Collection with Logo */}
      <div className="account-card-row">
        <span className="account-card-label">{t("collection")}:</span>
        <span className="account-card-value">
          <span className="nft-collection-display">
            {collectionLogo && (
              <img
                src={collectionLogo}
                alt={collectionSymbol || "Collection"}
                className="nft-collection-logo"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <span className="nft-collection-name-symbol">
              {collectionName && <span className="nft-collection-name">{collectionName}</span>}
              {collectionSymbol && (
                <span className="nft-collection-symbol">({collectionSymbol})</span>
              )}
            </span>
          </span>
        </span>
      </div>

      {/* Token Standard */}
      <div className="account-card-row">
        <span className="account-card-label">{t("tokenStandard")}:</span>
        <span className="account-card-value">
          <span className={`token-standard-badge ${standardClass}`}>{tokenStandard}</span>
        </span>
      </div>

      {/* Total Supply (ERC721 only) */}
      {totalSupply && (
        <div className="account-card-row">
          <span className="account-card-label">{t("totalMinted")}:</span>
          <span className="account-card-value">{Number(totalSupply).toLocaleString()} NFTs</span>
        </div>
      )}

      {/* Metadata URI (ERC1155 only) */}
      {metadataUri && (
        <div className="account-card-row">
          <span className="account-card-label">{t("metadataURI")}:</span>
          <span className="account-card-value account-card-mono">
            {metadataUri.length > 50 ? `${metadataUri.slice(0, 50)}...` : metadataUri}
          </span>
        </div>
      )}

      {/* Token ID Lookup */}
      <div className="nft-token-lookup-section">
        <div className="account-card-row">
          <span className="account-card-label">
            {t("view")} {tokenStandard === "ERC-721" ? "NFT" : "Token"}:
          </span>
          <span className="account-card-value">
            <div className="nft-token-lookup-row">
              <input
                type="text"
                placeholder="Enter Token ID"
                value={tokenIdInput}
                onChange={(e) => setTokenIdInput(e.target.value)}
                className="nft-token-input"
              />
              <Link
                to={tokenIdInput ? `/${networkId}/address/${addressHash}/${tokenIdInput}` : "#"}
                className={`nft-view-button ${!tokenIdInput ? "disabled" : ""}`}
                onClick={(e) => {
                  if (!tokenIdInput) {
                    e.preventDefault();
                  }
                }}
              >
                {t("view")}
              </Link>
            </div>
          </span>
        </div>
      </div>
    </div>
  );
};

export default NFTCollectionInfoCard;
