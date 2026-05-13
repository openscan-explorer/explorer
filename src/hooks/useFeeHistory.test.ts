import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FeeHistory } from "../types";

const mockGetFeeHistory = vi.fn();
const mockUseDataService = vi.fn();

vi.mock("./useDataService", () => ({
  useDataService: (...args: unknown[]) => mockUseDataService(...args),
}));

const sampleFeeHistory: FeeHistory = {
  oldestBlock: 1000,
  baseFeePerGas: [1_000_000_000n, 1_100_000_000n, 1_200_000_000n],
  gasUsedRatio: [0.5, 0.6, 0.7],
};

const buildDataService = (isEvm: boolean) => ({
  isEVM: () => isEvm,
  getEVMAdapter: () => ({ getFeeHistory: mockGetFeeHistory }),
});

describe("useFeeHistory", () => {
  beforeEach(() => {
    mockGetFeeHistory.mockReset();
    mockUseDataService.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when network is not EVM", async () => {
    mockUseDataService.mockReturnValue(buildDataService(false));

    const { useFeeHistory } = await import("./useFeeHistory");
    const { result } = renderHook(() => useFeeHistory(1));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.feeHistory).toBeNull();
    expect(mockGetFeeHistory).not.toHaveBeenCalled();
  });

  it("returns null when dataService is null (loading state)", async () => {
    mockUseDataService.mockReturnValue(null);

    const { useFeeHistory } = await import("./useFeeHistory");
    const { result } = renderHook(() => useFeeHistory(1));

    expect(result.current.feeHistory).toBeNull();
    expect(mockGetFeeHistory).not.toHaveBeenCalled();
  });

  it("fetches fee history for EVM networks", async () => {
    mockUseDataService.mockReturnValue(buildDataService(true));
    mockGetFeeHistory.mockResolvedValue({ data: sampleFeeHistory });

    const { useFeeHistory } = await import("./useFeeHistory");
    const { result } = renderHook(() => useFeeHistory(1, 50));

    await waitFor(() => {
      expect(result.current.feeHistory).toEqual(sampleFeeHistory);
    });
    expect(mockGetFeeHistory).toHaveBeenCalledWith(50);
  });

  it("registers an interval for refreshes and clears it on unmount", async () => {
    const setIntervalSpy = vi.spyOn(global, "setInterval");
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");

    mockUseDataService.mockReturnValue(buildDataService(true));
    mockGetFeeHistory.mockResolvedValue({ data: sampleFeeHistory });

    const { useFeeHistory } = await import("./useFeeHistory");
    const { unmount } = renderHook(() => useFeeHistory(1, 50));

    await waitFor(() => {
      expect(mockGetFeeHistory).toHaveBeenCalledTimes(1);
    });

    const intervalCall = setIntervalSpy.mock.calls.find(([, ms]) => ms === 10_000);
    expect(intervalCall).toBeDefined();

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("captures errors without throwing", async () => {
    mockUseDataService.mockReturnValue(buildDataService(true));
    mockGetFeeHistory.mockRejectedValue(new Error("RPC down"));

    const { useFeeHistory } = await import("./useFeeHistory");
    const { result } = renderHook(() => useFeeHistory(1, 50));

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });
    expect(result.current.error?.message).toBe("RPC down");
    expect(result.current.feeHistory).toBeNull();
  });
});
