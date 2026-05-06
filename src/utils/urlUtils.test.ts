import { describe, expect, it } from "vitest";
import {
  redactSensitiveUrl,
  redactSensitiveUrlsInText,
  rewriteIpfsUrl,
  toSafeExternalHref,
} from "./urlUtils";

describe("rewriteIpfsUrl", () => {
  it("rewrites ipfs:// to the public HTTPS gateway", () => {
    expect(rewriteIpfsUrl("ipfs://QmHash/foo.png")).toBe("https://ipfs.io/ipfs/QmHash/foo.png");
  });

  it("leaves http(s) and other schemes unchanged", () => {
    expect(rewriteIpfsUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(rewriteIpfsUrl("http://example.com/a")).toBe("http://example.com/a");
    expect(rewriteIpfsUrl("javascript:alert(1)")).toBe("javascript:alert(1)");
  });
});

describe("toSafeExternalHref", () => {
  it("accepts http:// and https:// URLs", () => {
    expect(toSafeExternalHref("http://example.com")).toBe("http://example.com");
    expect(toSafeExternalHref("https://example.com/path?q=1")).toBe("https://example.com/path?q=1");
  });

  it("rewrites ipfs:// to the HTTPS gateway", () => {
    expect(toSafeExternalHref("ipfs://QmHash")).toBe("https://ipfs.io/ipfs/QmHash");
  });

  it("rejects dangerous schemes", () => {
    expect(toSafeExternalHref("javascript:alert(1)")).toBeNull();
    expect(toSafeExternalHref("JAVASCRIPT:alert(1)")).toBeNull();
    expect(toSafeExternalHref("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(toSafeExternalHref("vbscript:msgbox")).toBeNull();
    expect(toSafeExternalHref("file:///etc/passwd")).toBeNull();
  });

  it("rejects empty, non-string, and malformed input", () => {
    expect(toSafeExternalHref("")).toBeNull();
    expect(toSafeExternalHref(undefined)).toBeNull();
    expect(toSafeExternalHref(null)).toBeNull();
    expect(toSafeExternalHref(123)).toBeNull();
    expect(toSafeExternalHref("not a url")).toBeNull();
    expect(toSafeExternalHref("/relative/path")).toBeNull();
  });
});

describe("redactSensitiveUrl", () => {
  it("masks long token-like path segments (Alchemy, Infura style)", () => {
    expect(
      redactSensitiveUrl("https://eth-mainnet.g.alchemy.com/v2/AbCdEf1234567890abcdef1234"),
    ).toBe("https://eth-mainnet.g.alchemy.com/v2/***");
    expect(
      redactSensitiveUrl("https://mainnet.infura.io/v3/0123456789abcdef0123456789abcdef"),
    ).toBe("https://mainnet.infura.io/v3/***");
  });

  it("masks sensitive query params", () => {
    expect(redactSensitiveUrl("https://api.example.com/rpc?apiKey=super-secret")).toBe(
      "https://api.example.com/rpc?apiKey=***",
    );
    expect(redactSensitiveUrl("https://api.example.com/rpc?access_token=abc&foo=bar")).toBe(
      "https://api.example.com/rpc?access_token=***&foo=bar",
    );
  });

  it("leaves short path segments and non-URLs unchanged", () => {
    expect(redactSensitiveUrl("https://example.com/v2/short")).toBe("https://example.com/v2/short");
    expect(redactSensitiveUrl("not a url")).toBe("not a url");
  });
});

describe("redactSensitiveUrlsInText", () => {
  it("redacts URL substrings inside free-form text", () => {
    const input =
      "Fetch failed for https://eth-mainnet.g.alchemy.com/v2/AbCdEf1234567890abcdef1234 — retrying";
    expect(redactSensitiveUrlsInText(input)).toBe(
      "Fetch failed for https://eth-mainnet.g.alchemy.com/v2/*** — retrying",
    );
  });

  it("redacts multiple URLs in a single string", () => {
    const input =
      "https://mainnet.infura.io/v3/0123456789abcdef0123456789abcdef and https://api.example.com/rpc?apiKey=secret-value-here";
    expect(redactSensitiveUrlsInText(input)).toBe(
      "https://mainnet.infura.io/v3/*** and https://api.example.com/rpc?apiKey=***",
    );
  });

  it("returns the string unchanged when no URLs are present", () => {
    expect(redactSensitiveUrlsInText("just a message")).toBe("just a message");
  });
});
