// src/services/ENS/ENSService.ts
import { AbiCoder, concat, keccak256, toUtf8Bytes } from "ethers";

// ENS Contract addresses on Ethereum Mainnet
const ENS_REGISTRY_ADDRESS = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const _PUBLIC_RESOLVER_ADDRESS = "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401";

// Function selectors
const SELECTORS = {
  resolver: "0x0178b8bf", // resolver(bytes32 node)
  addr: "0x3b3b57de", // addr(bytes32 node)
  addrWithCoinType: "0xf1cb7e06", // addr(bytes32 node, uint256 coinType)
  name: "0x691f3431", // name(bytes32 node)
  text: "0x59d1d43c", // text(bytes32 node, string key)
  contenthash: "0xbc1c58d1", // contenthash(bytes32 node)
};

// Common text record keys
export const TEXT_RECORD_KEYS = [
  "avatar",
  "email",
  "url",
  "description",
  "com.twitter",
  "com.github",
  "com.discord",
  "org.telegram",
  "notice",
  "keywords",
  "location",
];

export interface ENSRecords {
  name?: string;
  address?: string;
  contenthash?: string;
  textRecords: Record<string, string>;
}

export interface ENSResolveResult {
  address: string;
  ensName: string;
  records?: ENSRecords;
}

export interface ENSReverseResult {
  ensName: string | null;
  verified: boolean; // true if forward resolution matches
}

export class ENSService {
  private rpcUrls: string[];
  private abiCoder: AbiCoder;

  constructor(rpcUrl: string | string[]) {
    this.rpcUrls = Array.isArray(rpcUrl) ? rpcUrl : [rpcUrl];
    this.abiCoder = new AbiCoder();
  }

  /**
   * Normalize an ENS name according to UTS-46
   * Converts to lowercase and handles special characters
   */
  private normalize(name: string): string {
    // Basic normalization: lowercase and trim
    // For full UTS-46 compliance, use a library like @adraffy/ens-normalize
    return name.toLowerCase().trim();
  }

  /**
   * Compute the namehash of an ENS name
   * Follows ENS namehashing algorithm: recursively hash from right to left
   */
  namehash(name: string): string {
    if (!name || name === "") {
      return `0x${"0".repeat(64)}`;
    }

    const normalized = this.normalize(name);
    const labels = normalized.split(".");

    let node = "0x0000000000000000000000000000000000000000000000000000000000000000";

    for (let i = labels.length - 1; i >= 0; i--) {
      const label = labels[i];
      if (!label) continue;

      const labelHash = keccak256(toUtf8Bytes(label));
      // Concatenate node and labelHash as bytes, then hash
      node = keccak256(concat([node, labelHash]));
    }

    return node;
  }

  /**
   * Make an eth_call to the RPC endpoint with fallback support
   */
  private async ethCall(to: string, data: string): Promise<string> {
    const errors: Error[] = [];

    for (const rpcUrl of this.rpcUrls) {
      try {
        const response = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_call",
            params: [{ to, data }, "latest"],
          }),
        });

        const result = await response.json();

        if (result.error) {
          errors.push(new Error(result.error.message || "RPC error"));
          continue; // Try next RPC
        }

        if (result.result === undefined || result.result === null) {
          errors.push(new Error("no response"));
          continue; // Try next RPC
        }

        return result.result;
      } catch (err) {
        errors.push(err instanceof Error ? err : new Error(String(err)));
      }
    }

    // All RPCs failed
    throw errors[0] || new Error("All RPC endpoints failed");
  }

  /**
   * Get the resolver address for an ENS name
   */
  async getResolver(name: string): Promise<string | null> {
    const node = this.namehash(name);
    const data = SELECTORS.resolver + node.slice(2);

    try {
      const result = await this.ethCall(ENS_REGISTRY_ADDRESS, data);

      // Extract address from result (last 20 bytes of 32-byte response)
      if (
        result === "0x" ||
        result === "0x0000000000000000000000000000000000000000000000000000000000000000"
      ) {
        return null;
      }

      const resolverAddress = `0x${result.slice(-40)}`;
      return resolverAddress;
    } catch {
      return null;
    }
  }

  /**
   * Forward resolution: ENS name -> Ethereum address
   */
  async resolve(name: string): Promise<string | null> {
    // First get the resolver for this name
    const resolverAddress = await this.getResolver(name);
    if (!resolverAddress) {
      return null;
    }

    const node = this.namehash(name);
    const data = SELECTORS.addr + node.slice(2);

    try {
      const result = await this.ethCall(resolverAddress, data);

      if (
        result === "0x" ||
        result === "0x0000000000000000000000000000000000000000000000000000000000000000"
      ) {
        return null;
      }

      // Extract address from result
      const address = `0x${result.slice(-40)}`;
      return address;
    } catch {
      return null;
    }
  }

  /**
   * Reverse resolution: Ethereum address -> ENS name
   * Uses the .addr.reverse domain
   */
  async reverseResolve(address: string): Promise<ENSReverseResult> {
    // Create the reverse lookup name: <address>.addr.reverse
    const reverseAddress = address.toLowerCase().slice(2); // Remove 0x prefix
    const reverseName = `${reverseAddress}.addr.reverse`;

    // Get the resolver for the reverse name
    const resolverAddress = await this.getResolver(reverseName);
    if (!resolverAddress) {
      return { ensName: null, verified: false };
    }

    // Call name() on the resolver
    const node = this.namehash(reverseName);
    const data = SELECTORS.name + node.slice(2);

    try {
      const result = await this.ethCall(resolverAddress, data);

      if (result === "0x" || result.length <= 2) {
        return { ensName: null, verified: false };
      }

      // Decode the string result
      const ensName = this.decodeString(result);

      if (!ensName) {
        return { ensName: null, verified: false };
      }

      // Verify the forward resolution matches
      const forwardAddress = await this.resolve(ensName);
      const verified = forwardAddress?.toLowerCase() === address.toLowerCase();

      return { ensName, verified };
    } catch {
      return { ensName: null, verified: false };
    }
  }

  /**
   * Get a text record for an ENS name
   */
  async getText(name: string, key: string): Promise<string | null> {
    const resolverAddress = await this.getResolver(name);
    if (!resolverAddress) {
      return null;
    }

    const node = this.namehash(name);

    // Encode the text() call: selector + node + encoded string key
    const encodedKey = this.abiCoder.encode(["string"], [key]);
    // The data format is: selector + node + offset (0x40) + string data
    // For text(bytes32,string), ABI encoding requires:
    // - bytes32 node (32 bytes)
    // - offset to string (32 bytes pointing to 0x40 = 64)
    // - string length (32 bytes)
    // - string data (padded to 32 bytes)

    const data =
      SELECTORS.text +
      node.slice(2) +
      "0000000000000000000000000000000000000000000000000000000000000040" +
      encodedKey.slice(66); // Skip the 0x and first 32 bytes (offset)

    try {
      const result = await this.ethCall(resolverAddress, data);

      if (result === "0x" || result.length <= 2) {
        return null;
      }

      return this.decodeString(result);
    } catch {
      return null;
    }
  }

  /**
   * Get all common text records for an ENS name
   */
  async getAllTextRecords(name: string): Promise<Record<string, string>> {
    const records: Record<string, string> = {};

    // Fetch all records in parallel
    const results = await Promise.all(
      TEXT_RECORD_KEYS.map(async (key) => {
        const value = await this.getText(name, key);
        return { key, value };
      }),
    );

    for (const { key, value } of results) {
      if (value) {
        records[key] = value;
      }
    }

    return records;
  }

  /**
   * Get the contenthash for an ENS name
   */
  async getContenthash(name: string): Promise<string | null> {
    const resolverAddress = await this.getResolver(name);
    if (!resolverAddress) {
      return null;
    }

    const node = this.namehash(name);
    const data = SELECTORS.contenthash + node.slice(2);

    try {
      const result = await this.ethCall(resolverAddress, data);

      if (result === "0x" || result.length <= 2) {
        return null;
      }

      // The contenthash is returned as dynamic bytes
      // Decode it and return as hex
      const decoded = this.decodeBytes(result);
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Get all ENS records for a name
   */
  async getRecords(name: string): Promise<ENSRecords> {
    const [address, contenthash, textRecords] = await Promise.all([
      this.resolve(name),
      this.getContenthash(name),
      this.getAllTextRecords(name),
    ]);

    return {
      name,
      address: address || undefined,
      contenthash: contenthash || undefined,
      textRecords,
    };
  }

  /**
   * Decode an ABI-encoded string from RPC result
   */
  private decodeString(data: string): string | null {
    try {
      // ABI-encoded string format:
      // First 32 bytes: offset to string data
      // At offset: 32 bytes length + string data (padded to 32 bytes)
      if (data.length < 66) return null;

      // Parse the offset
      const offset = parseInt(data.slice(2, 66), 16) * 2 + 2;

      // Parse the length
      const lengthHex = data.slice(offset, offset + 64);
      const length = parseInt(lengthHex, 16);

      if (length === 0) return null;

      // Extract the string bytes
      const stringHex = data.slice(offset + 64, offset + 64 + length * 2);

      // Convert hex to string
      let result = "";
      for (let i = 0; i < stringHex.length; i += 2) {
        result += String.fromCharCode(parseInt(stringHex.slice(i, i + 2), 16));
      }

      return result;
    } catch {
      return null;
    }
  }

  /**
   * Decode ABI-encoded bytes from RPC result
   */
  private decodeBytes(data: string): string | null {
    try {
      if (data.length < 66) return null;

      // Parse the offset
      const offset = parseInt(data.slice(2, 66), 16) * 2 + 2;

      // Parse the length
      const lengthHex = data.slice(offset, offset + 64);
      const length = parseInt(lengthHex, 16);

      if (length === 0) return null;

      // Extract the bytes
      const bytesHex = data.slice(offset + 64, offset + 64 + length * 2);

      return `0x${bytesHex}`;
    } catch {
      return null;
    }
  }

  /**
   * Decode contenthash to human-readable format
   * Supports IPFS, IPNS, Swarm, Onion, and Skylink
   */
  decodeContenthash(contenthash: string): { type: string; url: string } | null {
    if (!contenthash || contenthash === "0x") return null;

    try {
      // Remove 0x prefix
      const hex = contenthash.slice(2);

      // Check the codec prefix
      // IPFS: e3 01 01 (ipfs-ns, dag-pb, sha2-256)
      // IPNS: e5 01 01
      // Swarm: e4 01 01
      // Onion: bc (onion)
      // Onion3: bd
      // Skylink: 90b2c605

      if (hex.startsWith("e3010120")) {
        // IPFS CIDv0 (starts with Qm)
        const cid = this.hexToBase58(hex.slice(8));
        return { type: "ipfs", url: `ipfs://${cid}` };
      } else if (hex.startsWith("e5010120")) {
        // IPNS
        const cid = this.hexToBase58(hex.slice(8));
        return { type: "ipns", url: `ipns://${cid}` };
      } else if (hex.startsWith("e40101")) {
        // Swarm
        const hash = hex.slice(6);
        return { type: "swarm", url: `bzz://${hash}` };
      } else if (hex.startsWith("bc")) {
        // Onion v2
        const onion = this.hexToBase32(hex.slice(2));
        return { type: "onion", url: `http://${onion}.onion` };
      } else if (hex.startsWith("bd")) {
        // Onion v3
        const onion = this.hexToBase32(hex.slice(2));
        return { type: "onion", url: `http://${onion}.onion` };
      }

      return { type: "unknown", url: contenthash };
    } catch {
      return null;
    }
  }

  /**
   * Convert hex to base58 (for IPFS CIDs)
   * Simplified version - for full support use a proper base58 library
   */
  private hexToBase58(hex: string): string {
    // This is a simplified conversion
    // For production, use a proper base58 library
    const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

    let num = BigInt(`0x${hex}`);
    let result = "";

    const fifty8 = BigInt(58);
    const zero = BigInt(0);

    while (num > zero) {
      const remainder = Number(num % fifty8);
      result = ALPHABET[remainder] + result;
      num = num / fifty8;
    }

    // Add leading zeros
    for (let i = 0; i < hex.length; i += 2) {
      if (hex.slice(i, i + 2) === "00") {
        result = `1${result}`;
      } else {
        break;
      }
    }

    return result;
  }

  /**
   * Convert hex to base32 (for onion addresses)
   */
  private hexToBase32(hex: string): string {
    const ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";
    const bytes: number[] = [];

    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.slice(i, i + 2), 16));
    }

    let bits = "";
    for (const byte of bytes) {
      bits += byte.toString(2).padStart(8, "0");
    }

    let result = "";
    for (let i = 0; i < bits.length; i += 5) {
      const chunk = bits.slice(i, i + 5).padEnd(5, "0");
      result += ALPHABET[parseInt(chunk, 2)];
    }

    return result;
  }

  /**
   * Check if a string looks like an ENS name
   */
  static isENSName(name: string): boolean {
    if (!name || typeof name !== "string") return false;

    // Must contain at least one dot
    if (!name.includes(".")) return false;

    // Common ENS patterns
    const ensPatterns = [/\.eth$/i, /\.xyz$/i, /\.luxe$/i, /\.kred$/i, /\.art$/i, /\.club$/i];

    return ensPatterns.some((pattern) => pattern.test(name));
  }
}

export default ENSService;
