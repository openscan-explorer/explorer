import { act, renderHook, waitFor } from "@testing-library/react";
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

const buildDataService = (isEvm: boolean, getFeeHistory = mockGetFeeHistory) => ({
  isEVM: () => isEvm,
  getEVMAdapter: () => ({ getFeeHistory }),
});

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

describe("useFeeHistory", () => {
  beforeEach(() => {
    mockGetFeeHistory.mockReset();
    mockUseDataService.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("keeps the last good data when a refresh fails", async () => {
    vi.useFakeTimers();
    mockUseDataService.mockReturnValue(buildDataService(true));
    mockGetFeeHistory
      .mockResolvedValueOnce({ data: sampleFeeHistory })
      .mockRejectedValueOnce(new Error("RPC down"));

    const { useFeeHistory } = await import("./useFeeHistory");
    const { result } = renderHook(() => useFeeHistory(1, 50));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.feeHistory).toEqual(sampleFeeHistory);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(mockGetFeeHistory).toHaveBeenCalledTimes(2);
    expect(result.current.error?.message).toBe("RPC down");
    expect(result.current.feeHistory).toEqual(sampleFeeHistory);
  });

  it("clears the previous network's data as soon as the network changes", async () => {
    const nextNetworkFetch = deferred<{ data: FeeHistory }>();
    mockUseDataService.mockReturnValue(buildDataService(true));
    mockGetFeeHistory.mockResolvedValue({ data: sampleFeeHistory });

    const { useFeeHistory } = await import("./useFeeHistory");
    const { result, rerender } = renderHook(({ network }) => useFeeHistory(network, 50), {
      initialProps: { network: 1 },
    });
    await waitFor(() => {
      expect(result.current.feeHistory).toEqual(sampleFeeHistory);
    });

    mockUseDataService.mockReturnValue(
      buildDataService(
        true,
        vi.fn(() => nextNetworkFetch.promise),
      ),
    );
    rerender({ network: 10 });

    expect(result.current.feeHistory).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it("fetches the new network even while the previous network's request is in flight", async () => {
    const previousNetworkFetch = deferred<{ data: FeeHistory }>();
    const nextHistory: FeeHistory = { ...sampleFeeHistory, oldestBlock: 2000 };
    const nextNetworkGetFeeHistory = vi.fn().mockResolvedValue({ data: nextHistory });

    mockUseDataService.mockReturnValue(
      buildDataService(
        true,
        vi.fn(() => previousNetworkFetch.promise),
      ),
    );

    const { useFeeHistory } = await import("./useFeeHistory");
    const { result, rerender } = renderHook(({ network }) => useFeeHistory(network, 50), {
      initialProps: { network: 1 },
    });

    mockUseDataService.mockReturnValue(buildDataService(true, nextNetworkGetFeeHistory));
    rerender({ network: 10 });

    await waitFor(() => {
      expect(result.current.feeHistory).toEqual(nextHistory);
    });
    expect(nextNetworkGetFeeHistory).toHaveBeenCalledTimes(1);

    // The previous network's response lands late and must not overwrite the new data.
    await act(async () => {
      previousNetworkFetch.resolve({ data: sampleFeeHistory });
    });
    expect(result.current.feeHistory).toEqual(nextHistory);
  });
});
