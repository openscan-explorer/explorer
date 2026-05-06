import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchERC721MetadataWithUri } from "./erc721Metadata";

// Encode an ABI string return value the same way the on-chain call would.
function encodeAbiString(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const hexBytes = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const padded = hexBytes.padEnd(Math.ceil(hexBytes.length / 64) * 64, "0");
  const offset = "0000000000000000000000000000000000000000000000000000000000000020";
  const length = bytes.length.toString(16).padStart(64, "0");
  return `0x${offset}${length}${padded}`;
}

const CONTRACT = "0x5af0d9827e0c53e4799bb226655a1de152a425a5";
const TOKEN_ID = "1";
const RPC_URL = "https://example-rpc.test";
const META_URL = "https://example-no-cors.test/json/1";
const META_BODY = { name: "Token #1", image: "ipfs://QmHash/img.png" };

describe("fetchERC721MetadataWithUri", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function rpcResponse(uri: string): Response {
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: encodeAbiString(uri) }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  it("returns metadata via direct fetch when CORS allows it", async () => {
    fetchSpy
      .mockResolvedValueOnce(rpcResponse(META_URL)) // tokenURI()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(META_BODY), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const result = await fetchERC721MetadataWithUri(CONTRACT, TOKEN_ID, RPC_URL);

    expect(result.tokenUri).toBe(META_URL);
    expect(result.metadata).toEqual(META_BODY);
    // Two fetches: RPC + direct metadata. No proxy retry needed.
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("falls back to the worker proxy when the direct fetch throws (CORS / network)", async () => {
    fetchSpy
      .mockResolvedValueOnce(rpcResponse(META_URL)) // tokenURI()
      .mockRejectedValueOnce(new TypeError("Failed to fetch")) // CORS / network
      .mockResolvedValueOnce(
        new Response(JSON.stringify(META_BODY), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const result = await fetchERC721MetadataWithUri(CONTRACT, TOKEN_ID, RPC_URL);

    expect(result.metadata).toEqual(META_BODY);
    expect(result.tokenUri).toBe(META_URL);
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    // Third call should hit the worker proxy with the encoded target URL
    const proxyCall = fetchSpy.mock.calls[2]?.[0];
    expect(typeof proxyCall).toBe("string");
    expect(proxyCall as string).toContain("/proxy/metadata?url=");
    expect(proxyCall as string).toContain(encodeURIComponent(META_URL));
  });

  it("falls back to the worker proxy when the direct fetch returns non-OK", async () => {
    fetchSpy
      .mockResolvedValueOnce(rpcResponse(META_URL)) // tokenURI()
      .mockResolvedValueOnce(new Response("nope", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(META_BODY), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const result = await fetchERC721MetadataWithUri(CONTRACT, TOKEN_ID, RPC_URL);

    expect(result.metadata).toEqual(META_BODY);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("returns metadata=null with the URI preserved when the proxy also fails", async () => {
    fetchSpy
      .mockResolvedValueOnce(rpcResponse(META_URL)) // tokenURI()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(new Response("upstream timeout", { status: 504 }));

    const result = await fetchERC721MetadataWithUri(CONTRACT, TOKEN_ID, RPC_URL);

    expect(result.metadata).toBeNull();
    expect(result.tokenUri).toBe(META_URL);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("does not call the proxy for data: URIs", async () => {
    const dataUri = "data:application/json,%7B%22name%22%3A%22inline%22%7D";
    fetchSpy.mockResolvedValueOnce(rpcResponse(dataUri));

    const result = await fetchERC721MetadataWithUri(CONTRACT, TOKEN_ID, RPC_URL);

    expect(result.metadata).toEqual({ name: "inline" });
    expect(result.tokenUri).toBe(dataUri);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
