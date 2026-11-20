import { ZCASH_MAINNET, ZCASH_TESTNET } from "@openscan/network-connectors";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAllRpcs } from "./MetadataService";

const BITCOIN_MAINNET = "bip122:000000000019d6689c085ae165831e93";

function jsonResponse(body: unknown) {
  return { ok: true, statusText: "OK", json: async () => body };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchAllRpcs", () => {
  it("maps Zcash genesis hashes to rpcs/zec before the Bitcoin mapping", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/rpcs/all.json")) {
        return jsonResponse({
          networks: [
            { networkId: ZCASH_MAINNET, endpointCount: 1 },
            { networkId: ZCASH_TESTNET, endpointCount: 1 },
            { networkId: BITCOIN_MAINNET, endpointCount: 1 },
          ],
        });
      }
      return jsonResponse({ endpoints: [{ url: `https://rpc.test/${url.split("/rpcs/")[1]}` }] });
    });
    vi.stubGlobal("fetch", fetchMock);

    const rpcs = await fetchAllRpcs();

    const fetched = fetchMock.mock.calls.map(([url]) => url.split("/dist/")[1]);
    expect(fetched).toEqual(
      expect.arrayContaining([
        "rpcs/zec/mainnet.json",
        "rpcs/zec/testnet.json",
        "rpcs/btc/mainnet.json",
      ]),
    );
    expect(rpcs[ZCASH_MAINNET]?.[0]?.url).toBe("https://rpc.test/zec/mainnet.json");
    expect(rpcs[ZCASH_TESTNET]?.[0]?.url).toBe("https://rpc.test/zec/testnet.json");
  });
});
