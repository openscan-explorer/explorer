import { ZCASH_MAINNET } from "@openscan/network-connectors";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NetworkConfig } from "../types";
import { ZcashAdapter } from "./adapters/ZcashAdapter/ZcashAdapter";
import { DataService } from "./DataService";

const ZCASH: NetworkConfig = {
  type: "zcash",
  networkId: ZCASH_MAINNET,
  slug: "zec",
  name: "Zcash",
  shortName: "ZEC",
  currency: "ZEC",
};

const BITCOIN: NetworkConfig = {
  type: "bitcoin",
  networkId: "bip122:000000000019d6689c085ae165831e93",
  slug: "btc",
  name: "Bitcoin",
  shortName: "BTC",
  currency: "BTC",
};

const T_ADDRESS = "t1KAuVfS2r2hc7RwSh6GTuyfqCGMFEpwkZ2";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DataService for Zcash networks", () => {
  it("builds a ZcashAdapter for type zcash, even though Zcash shares the bip122 namespace", () => {
    const service = new DataService(ZCASH, { [ZCASH_MAINNET]: ["https://zebra.test"] });

    expect(service.isZcash()).toBe(true);
    expect(service.isBitcoin()).toBe(false);
    expect(service.getZcashAdapter()).toBeInstanceOf(ZcashAdapter);
    expect(service.getZcashAdapter().getNetworkId()).toBe(ZCASH_MAINNET);
  });

  it("refuses a Zcash adapter on other networks", () => {
    const service = new DataService(BITCOIN, { [BITCOIN.networkId]: ["https://btc.test"] });

    expect(() => service.getZcashAdapter()).toThrow("Cannot get Zcash adapter");
  });

  it("stops probing a method the endpoints rejected, across page instances", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        error: { code: -32601, message: "Method not found" },
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const rpcUrls = { [ZCASH_MAINNET]: ["https://zebra.test/unsupported-memo"] };

    const first = await new DataService(ZCASH, rpcUrls).getZcashAdapter().getAddress(T_ADDRESS);
    const callsAfterFirst = fetchMock.mock.calls.length;
    const second = await new DataService(ZCASH, rpcUrls).getZcashAdapter().getAddress(T_ADDRESS);

    expect(first.balance).toEqual({ availability: "unsupported" });
    expect(callsAfterFirst).toBe(1);
    expect(second.balance).toEqual({ availability: "unsupported" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
