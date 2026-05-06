import type React from "react";
import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AppContext } from "../../../../../context";
import { fetchTokenByIndex, fetchTokenOwner } from "../../../../../utils/erc721Metadata";

interface CollectionTokenListProps {
  networkId: string;
  addressHash: string;
  totalSupply?: string;
}

const TOKENS_PER_PAGE = 10;

const truncateAddress = (hash: string, chars = 4): string => {
  if (hash.length <= chars * 2 + 3) return hash;
  const prefix = hash.startsWith("0x") ? `0x${hash.slice(2, 2 + chars)}` : hash.slice(0, chars);
  return `${prefix}...${hash.slice(-chars)}`;
};

const CollectionTokenList: React.FC<CollectionTokenListProps> = ({
  networkId,
  addressHash,
  totalSupply,
}) => {
  const { t } = useTranslation("address");
  const { rpcUrls } = useContext(AppContext);
  const [tokens, setTokens] = useState<Array<{ tokenId: string; owner: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [enumerable, setEnumerable] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setTokens([]);
      setEnumerable(true);

      if (!totalSupply) {
        setLoading(false);
        return;
      }

      const total = BigInt(totalSupply);
      if (total === 0n) {
        setLoading(false);
        return;
      }

      const rpcNetworkId = `eip155:${Number(networkId)}`;
      const rpcUrlsForChain = rpcUrls[rpcNetworkId];
      const rpcUrl = Array.isArray(rpcUrlsForChain) ? rpcUrlsForChain[0] : rpcUrlsForChain;
      if (!rpcUrl) {
        setLoading(false);
        return;
      }

      const count = total < BigInt(TOKENS_PER_PAGE) ? Number(total) : TOKENS_PER_PAGE;
      const indices: string[] = [];
      for (let i = 0; i < count; i++) {
        indices.push((total - 1n - BigInt(i)).toString());
      }

      const tokenIds = await Promise.all(
        indices.map((idx) => fetchTokenByIndex(addressHash, idx, rpcUrl)),
      );

      if (tokenIds[0] === null) {
        setEnumerable(false);
        setLoading(false);
        return;
      }

      const resolved = tokenIds.filter((id): id is string => id !== null);
      const owners = await Promise.all(
        resolved.map((id) => fetchTokenOwner(addressHash, id, rpcUrl)),
      );

      setTokens(resolved.map((tokenId, i) => ({ tokenId, owner: owners[i] ?? null })));
      setLoading(false);
    };

    run();
  }, [networkId, addressHash, totalSupply, rpcUrls]);

  if (!totalSupply || !enumerable) return null;

  return (
    <div className="collection-token-list-card">
      <div className="account-card-title">{t("recentTokens")}</div>
      <div className="table-wrapper">
        <table className="dash-table">
          <thead>
            <tr>
              <th>{t("tableTokenId")}</th>
              <th>{t("tableOwner")}</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: TOKENS_PER_PAGE }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
                  <tr key={i}>
                    <td>
                      <span className="skeleton-pulse" style={{ width: "60px", height: 18 }} />
                    </td>
                    <td>
                      <span className="skeleton-pulse" style={{ width: "140px", height: 18 }} />
                    </td>
                  </tr>
                ))
              : tokens.map(({ tokenId, owner }) => (
                  <tr key={tokenId}>
                    <td>
                      <Link
                        to={`/${networkId}/address/${addressHash}/${tokenId}`}
                        className="tx-mono"
                      >
                        #{tokenId}
                      </Link>
                    </td>
                    <td>
                      {owner ? (
                        <Link to={`/${networkId}/address/${owner}`} className="tx-mono">
                          {truncateAddress(owner)}
                        </Link>
                      ) : (
                        <span className="text-secondary">—</span>
                      )}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CollectionTokenList;
