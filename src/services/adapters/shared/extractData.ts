/**
 * Extracts the actual data from a StrategyResult
 * Handles both fallback mode (data is T) and parallel mode (data is array of responses)
 *
 * In parallel mode, the current implementation of ParallelStrategy incorrectly returns
 * the array of provider responses as the data field. This helper extracts the first
 * successful response's data.
 */
// biome-ignore lint/suspicious/noExplicitAny: Need to handle both T and provider response arrays
export function extractData<T>(strategyResultData: T | any): T {
  // Check if this looks like an array of provider responses (parallel mode bug)
  if (Array.isArray(strategyResultData) && strategyResultData.length > 0) {
    const firstItem = strategyResultData[0];

    // Check if it has the RPCProviderResponse structure
    if (
      firstItem &&
      typeof firstItem === "object" &&
      "url" in firstItem &&
      "status" in firstItem &&
      "data" in firstItem
    ) {
      // Find the first successful response
      const successfulResponse = strategyResultData.find(
        // biome-ignore lint/suspicious/noExplicitAny: Provider response type is dynamic
        (r: any) => r.status === "success" && r.data !== undefined,
      );

      if (successfulResponse) {
        return successfulResponse.data;
      }

      // All providers failed - throw an error with details
      const errors = strategyResultData
        // biome-ignore lint/suspicious/noExplicitAny: Provider response type is dynamic
        .map((r: any) => `${r.url}: ${r.error || "Unknown error"}`)
        .join("; ");
      throw new Error(`All RPC providers failed: ${errors}`);
    }
  }

  // Fallback mode or already extracted data
  return strategyResultData as T;
}
