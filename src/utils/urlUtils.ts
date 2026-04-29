const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

/**
 * Rewrite an `ipfs://` URL to the public HTTPS gateway. Leaves other inputs
 * unchanged.
 */
export function rewriteIpfsUrl(url: string): string {
  return url.startsWith("ipfs://") ? url.replace("ipfs://", IPFS_GATEWAY) : url;
}

/**
 * Return `url` as a safe href (http:, https:, or a rewritten ipfs://) or null
 * for anything else. Rejects javascript:, data:, vbscript:, file:, relative
 * paths, and malformed input.
 *
 * Use for third-party URLs — NFT metadata, AI responses, IPFS documents —
 * where the protocol is attacker-controllable.
 */
export function toSafeExternalHref(url: unknown): string | null {
  if (typeof url !== "string" || url.length === 0) return null;
  const resolved = rewriteIpfsUrl(url);
  try {
    const parsed = new URL(resolved);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? resolved : null;
  } catch {
    return null;
  }
}

const SENSITIVE_PARAM_REGEX = /key|token|secret|auth|signature|apikey|api_key|access_token/i;

/**
 * Mask API keys and other high-entropy credentials embedded in a URL — both in
 * query parameters (e.g. `?apiKey=...`) and in path segments (e.g. Alchemy's
 * `/v2/<KEY>` or Infura's `/v3/<KEY>`).
 *
 * Returns the input unchanged if it does not parse as a URL.
 */
export function redactSensitiveUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);

    for (const [key] of parsed.searchParams.entries()) {
      if (SENSITIVE_PARAM_REGEX.test(key)) {
        parsed.searchParams.set(key, "***");
      }
    }

    const segments = parsed.pathname.split("/").map((segment) => {
      if (!segment) return segment;
      const looksLikeToken = segment.length >= 24 && /[A-Za-z]/.test(segment) && /\d/.test(segment);
      return looksLikeToken ? "***" : segment;
    });
    parsed.pathname = segments.join("/");

    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

const URL_IN_TEXT_REGEX = /https?:\/\/[^\s"'<>`]+/g;

/**
 * Redact every http(s) URL substring inside a free-form text value (log
 * message, error message, stack frame).
 */
export function redactSensitiveUrlsInText(text: string): string {
  return text.replace(URL_IN_TEXT_REGEX, (match) => redactSensitiveUrl(match));
}
