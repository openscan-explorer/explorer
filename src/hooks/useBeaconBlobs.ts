import { useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "../context/SettingsContext";
import { getBeaconUrl, computeSlotFromTimestamp } from "../config/beaconConfig";
import { BeaconService, matchBlobsToTransaction } from "../services/BeaconService";
import type { BlobSidecar } from "../types";
import { logger } from "../utils/logger";

interface UseBeaconBlobsResult {
  blobs: BlobSidecar[] | null;
  loading: boolean;
  error: string | null;
  isAvailable: boolean;
  isPruned: boolean;
}

/**
 * Hook to fetch blob sidecars for a block.
 * Optionally filters to blobs belonging to a specific transaction.
 */
export function useBeaconBlobs(
  networkId: string | undefined,
  blockTimestamp: number | undefined,
  blobVersionedHashes?: string[],
): UseBeaconBlobsResult {
  const { settings } = useSettings();
  const [blobs, setBlobs] = useState<BlobSidecar[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPruned, setIsPruned] = useState(false);

  const beaconUrl = useMemo(
    () => (networkId ? getBeaconUrl(networkId, settings.beaconUrls) : null),
    [networkId, settings.beaconUrls],
  );

  const isAvailable = beaconUrl !== null;

  const beaconService = useMemo(
    () => (beaconUrl ? new BeaconService(beaconUrl) : null),
    [beaconUrl],
  );

  // Stable reference for blobVersionedHashes to avoid re-fetching
  const hashesRef = useRef(blobVersionedHashes);
  hashesRef.current = blobVersionedHashes;

  useEffect(() => {
    if (!beaconService || !networkId || !blockTimestamp) {
      setBlobs(null);
      setLoading(false);
      return;
    }

    const slot = computeSlotFromTimestamp(networkId, blockTimestamp);
    if (slot === null) {
      setError("Cannot compute beacon slot for this network");
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setIsPruned(false);

    (async () => {
      try {
        const sidecars = await beaconService.getBlobSidecars(slot, controller.signal);

        if (controller.signal.aborted) return;

        if (sidecars === null) {
          setIsPruned(true);
          setBlobs(null);
        } else if (hashesRef.current && hashesRef.current.length > 0) {
          const matched = await matchBlobsToTransaction(sidecars, hashesRef.current);
          if (!controller.signal.aborted) setBlobs(matched);
        } else {
          setBlobs(sidecars);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        logger.error("Error fetching beacon blobs:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch blob data");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [beaconService, networkId, blockTimestamp]);

  return { blobs, loading, error, isAvailable, isPruned };
}
