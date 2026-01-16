import type { RPCMetadata, RPCProviderResponse } from "../../../types";

/**
 * Merges multiple RPCMetadata objects from sequential calls
 * For parallel strategy: Takes the intersection of providers (only providers that succeeded in ALL calls)
 * For fallback strategy: Returns the last metadata (merging doesn't apply)
 */
export function mergeMetadata<T>(
  metadataList: Array<RPCMetadata | undefined>,
): RPCMetadata | undefined {
  // Filter out undefined metadata
  const validMetadata = metadataList.filter((m) => m !== undefined) as RPCMetadata[];

  if (validMetadata.length === 0) {
    return undefined;
  }

  // Check if all metadata is fallback strategy
  const allFallback = validMetadata.every((m) => m.strategy === "fallback");

  if (allFallback) {
    // For fallback, return the last metadata since merging doesn't apply
    // The last call's attempt history is most relevant
    return validMetadata[validMetadata.length - 1];
  }

  // If only one metadata object, return it with transformed data
  if (validMetadata.length === 1) {
    const metadata = validMetadata[0];
    if (!metadata) return undefined;

    return {
      ...metadata,
      responses: metadata.responses.map((response) => ({
        ...response,
        data: response.status === "success" && response.data ? [response.data] : undefined,
      })),
    };
  }

  // Get all provider URLs from first metadata
  const firstMetadata = validMetadata[0];
  if (!firstMetadata) return undefined;

  const providerUrls = firstMetadata.responses.map((r) => r.url);

  // Create merged responses - only include providers that succeeded in ALL calls
  const mergedResponses: RPCProviderResponse[] = providerUrls
    .map((url) => {
      const providerResponses = validMetadata.map((metadata) =>
        metadata.responses.find((r) => r.url === url),
      );

      // If provider failed in any call, mark as error
      const hasError = providerResponses.some((r) => !r || r.status === "error" || !r.data);

      if (hasError) {
        const firstError = providerResponses.find((r) => r?.status === "error");
        return {
          url,
          status: "error" as const,
          responseTime: 0,
          error: firstError?.error || "Failed in one or more calls",
        };
      }

      // Collect all successful data
      const dataList = providerResponses
        .filter((r) => r && r.status === "success" && r.data)
        .map((r) => r?.data as T);

      // Calculate average response time
      const totalResponseTime = providerResponses.reduce(
        (sum, r) => sum + (r?.responseTime || 0),
        0,
      );
      const avgResponseTime = totalResponseTime / providerResponses.length;

      return {
        url,
        status: "success" as const,
        responseTime: avgResponseTime,
        data: dataList,
      };
    })
    .filter((r) => r.status === "success"); // Only keep successful providers

  // Check for inconsistencies across all metadata
  const hasInconsistencies = validMetadata.some((m) => m.hasInconsistencies);

  return {
    strategy: "parallel",
    timestamp: Date.now(),
    responses: mergedResponses,
    hasInconsistencies,
  };
}
