import { useEffect, useState } from "react";
import { fetchAddress } from "../services/MetadataService";
import { type KlerosTag, fetchKlerosTag, isKlerosGraphEnabled } from "../services/KlerosService";

export function useKlerosTag(
  address: string | null | undefined,
  chainId: number,
): KlerosTag | null {
  const [tag, setTag] = useState<KlerosTag | null>(null);

  useEffect(() => {
    if (!address || chainId !== 1) {
      setTag(null);
      return;
    }

    setTag(null);

    if (isKlerosGraphEnabled()) {
      fetchKlerosTag(address)
        .then(setTag)
        .catch(() => {
          // Fallback to metadata service on Graph error
          fetchAddress(chainId, address).then((meta) => {
            if (meta?.source?.[0] === "kleros" && meta.label) {
              setTag({ itemID: "", publicNameTag: meta.label });
            }
          });
        });
    } else {
      fetchAddress(chainId, address).then((meta) => {
        if (meta?.source?.[0] === "kleros" && meta.label) {
          setTag({ itemID: "", publicNameTag: meta.label });
        }
      });
    }
  }, [address, chainId]);

  return tag;
}
