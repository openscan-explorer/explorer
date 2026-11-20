import type { EthereumClient } from "@openscan/network-connectors";
import { describe, expect, it, vi } from "vitest";
import { EVMAdapter } from "./EVMAdapter/EVMAdapter";

const SEPOLIA = 11155111;

const buildAdapter = (feeHistory: ReturnType<typeof vi.fn>) =>
  new EVMAdapter(SEPOLIA, { feeHistory } as unknown as EthereumClient);

describe("NetworkAdapter.getFeeHistory", () => {
  it("requests the latest N blocks with a hex block count", async () => {
    const feeHistory = vi.fn().mockResolvedValue({
      data: { oldestBlock: "0x1", baseFeePerGas: ["0x1", "0x1"], gasUsedRatio: [0.5] },
    });

    await buildAdapter(feeHistory).getFeeHistory(50);

    expect(feeHistory).toHaveBeenCalledWith("0x32", "latest");
  });

  it("parses hex fields into a decimal oldestBlock and bigint base fees", async () => {
    // eth_feeHistory returns one more base fee than gas-used ratio: the last entry
    // is the projected base fee of the next (not yet mined) block.
    const feeHistory = vi.fn().mockResolvedValue({
      data: {
        oldestBlock: "0x3e8",
        baseFeePerGas: ["0x3b9aca00", "0x4190ab00", "0x47868c00"],
        gasUsedRatio: [0.5, 0.75],
      },
      metadata: undefined,
    });

    const { data } = await buildAdapter(feeHistory).getFeeHistory(2);

    expect(data).toEqual({
      oldestBlock: 1000,
      baseFeePerGas: [1_000_000_000n, 1_100_000_000n, 1_200_000_000n],
      gasUsedRatio: [0.5, 0.75],
    });
  });

  it("throws when the RPC returns no fee history", async () => {
    const feeHistory = vi.fn().mockResolvedValue({ data: undefined });

    await expect(buildAdapter(feeHistory).getFeeHistory(50)).rejects.toThrow(
      "Fee history not available",
    );
  });

  it("throws when the response is missing base fees", async () => {
    const feeHistory = vi.fn().mockResolvedValue({
      data: { oldestBlock: "0x1", gasUsedRatio: [0.5] },
    });

    await expect(buildAdapter(feeHistory).getFeeHistory(50)).rejects.toThrow(
      "Fee history not available",
    );
  });
});
