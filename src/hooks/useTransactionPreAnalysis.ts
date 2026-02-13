import { ClearSigner } from "@erc7730/sdk";
import type { DecodedTransaction } from "@erc7730/sdk";
import { useEffect, useMemo, useState } from "react";
import type { Transaction } from "../types";
import { logger } from "../utils/logger";

interface UseTransactionPreAnalysisReturn {
  preAnalysis: DecodedTransaction | null;
  preAnalysisLoading: boolean;
}

/**
 * Hook that uses @erc7730/sdk's ClearSigner to decode transaction calldata
 * into human-readable format (intent, formatted fields, security warnings).
 * Returns null for simple ETH transfers or when decoding fails.
 */
export function useTransactionPreAnalysis(
  transaction: Transaction | null,
  chainId: number,
): UseTransactionPreAnalysisReturn {
  const [preAnalysis, setPreAnalysis] = useState<DecodedTransaction | null>(null);
  const [preAnalysisLoading, setPreAnalysisLoading] = useState(false);

  const signer = useMemo(() => {
    return new ClearSigner({ chainId, useSourcifyFallback: true });
  }, [chainId]);

  const hasCalldata = transaction?.data && transaction.data !== "0x";

  useEffect(() => {
    if (!transaction || !hasCalldata || !transaction.to) {
      setPreAnalysis(null);
      return;
    }

    let cancelled = false;
    setPreAnalysisLoading(true);

    signer
      .decode({
        to: transaction.to,
        data: transaction.data,
        value: transaction.value,
        chainId,
        from: transaction.from,
      })
      .then((result) => {
        if (!cancelled) {
          setPreAnalysis(result);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          logger.warn("ERC-7730 pre-analysis failed (non-blocking):", err);
          setPreAnalysis(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPreAnalysisLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [signer, transaction, hasCalldata, chainId]);

  return { preAnalysis, preAnalysisLoading };
}
