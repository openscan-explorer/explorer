import { logger } from "../utils/logger";
import type { BlobSidecar } from "../types";

export class BeaconService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  /**
   * Fetch blob sidecars for a given beacon slot.
   * Returns null if the data is unavailable (pruned, 404, etc.).
   */
  async getBlobSidecars(slot: number, signal?: AbortSignal): Promise<BlobSidecar[] | null> {
    try {
      const url = `${this.baseUrl}/eth/v1/beacon/blob_sidecars/${slot}`;
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal,
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        logger.warn(`Beacon API returned ${response.status} for slot ${slot}`);
        return null;
      }

      const json = await response.json();
      return (json?.data as BlobSidecar[]) ?? null;
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return null;
      logger.error("Failed to fetch blob sidecars:", error);
      return null;
    }
  }
}

/**
 * Compute the EIP-4844 versioned hash from a KZG commitment.
 * versionedHash = 0x01 + SHA256(kzg_commitment)[1:]
 */
export async function computeVersionedHash(kzgCommitment: string): Promise<string> {
  const hex = kzgCommitment.startsWith("0x") ? kzgCommitment.slice(2) : kzgCommitment;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = new Uint8Array(hashBuffer);
  hashArray[0] = 0x01;

  let result = "0x";
  for (const byte of hashArray) {
    result += byte.toString(16).padStart(2, "0");
  }
  return result;
}

/**
 * Match blob sidecars to a transaction's blobVersionedHashes.
 * Returns only the blobs that belong to the given transaction, in order.
 */
export async function matchBlobsToTransaction(
  blobs: BlobSidecar[],
  blobVersionedHashes: string[],
): Promise<BlobSidecar[]> {
  const blobHashPairs = await Promise.all(
    blobs.map(async (blob) => ({
      blob,
      versionedHash: await computeVersionedHash(blob.kzg_commitment),
    })),
  );

  const hashToBlob = new Map<string, BlobSidecar>();
  for (const { blob, versionedHash } of blobHashPairs) {
    hashToBlob.set(versionedHash.toLowerCase(), blob);
  }

  const matched: BlobSidecar[] = [];
  for (const hash of blobVersionedHashes) {
    const blob = hashToBlob.get(hash.toLowerCase());
    if (blob) {
      matched.push(blob);
    }
  }
  return matched;
}
