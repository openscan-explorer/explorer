import { afterEach, describe, expect, it, vi } from "vitest";
import type { NetworkConfig } from "../types";
import { autoSyncRpcs } from "./rpcAutoSync";

const testRpcEndpoint = vi.hoisted(() => vi.fn());
vi.mock("../components/pages/rpcs/useRpcLatencyTest", () => ({ testRpcEndpoint }));
vi.mock("./rpcStorage", () => ({ getMetadataEndpointMap: () => new Map() }));

const network = (type: NetworkConfig["type"], networkId: string): NetworkConfig => ({
  type,
  networkId,
  name: networkId,
  shortName: networkId,
  currency: "X",
});

const ZCASH = network("zcash", "bip122:00040fe8ec8471911baa1db1266ea15d");
const BITCOIN = network("bitcoin", "bip122:000000000019d6689c085ae165831e93");

afterEach(() => {
  testRpcEndpoint.mockReset();
});

describe("autoSyncRpcs", () => {
  it("sorts endpoints by latency", async () => {
    testRpcEndpoint.mockImplementation(async (url: string) => ({
      url,
      status: "online",
      latency: url.includes("slow") ? 500 : 50,
    }));

    const sorted = await autoSyncRpcs(
      { [BITCOIN.networkId]: ["https://slow.test", "https://fast.test"] },
      [BITCOIN],
    );

    expect(sorted[BITCOIN.networkId]).toEqual(["https://fast.test", "https://slow.test"]);
  });

  it("leaves rate-limited Zcash gateways alone instead of probing them", async () => {
    const zcashUrls = ["https://zcash-a.test", "https://zcash-b.test"];

    const sorted = await autoSyncRpcs({ [ZCASH.networkId]: zcashUrls }, [ZCASH]);

    expect(testRpcEndpoint).not.toHaveBeenCalled();
    expect(sorted[ZCASH.networkId]).toEqual(zcashUrls);
  });
});
