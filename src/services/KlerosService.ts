export interface KlerosTag {
  itemID: string;
  publicNameTag: string;
  projectName?: string;
}

// Single source of truth — derive both forms from this
const ATQ_REGISTRY_CHECKSUM = "0x66260C69d03837016d88c9877e61e08Ef74C59F2";
const ATQ_REGISTRY = ATQ_REGISTRY_CHECKSUM.toLowerCase();

export const KLEROS_CURATE_REGISTRY_URL = `https://curate.kleros.io/tcr/100/${ATQ_REGISTRY_CHECKSUM}`;

export const getKlerosCurateItemUrl = (itemID: string) =>
  itemID ? `${KLEROS_CURATE_REGISTRY_URL}/${itemID}` : KLEROS_CURATE_REGISTRY_URL;

// In-memory cache: address (lowercase) → { tag, expires }
const cache = new Map<string, { tag: KlerosTag | null; expires: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Public key with authorized domains — safe to include in source
const THE_GRAPH_API_KEY = "90d378ffb102d0bcce31c59bc16057b6";

export function isKlerosGraphEnabled(): boolean {
  return true;
}

const GRAPH_URL = () =>
  `https://gateway-arbitrum.network.thegraph.com/api/${THE_GRAPH_API_KEY}/subgraphs/id/9hHo5MpjpC1JqfD3BsgFnojGurXRHTrHWcUcZPPCo6m8`;

async function graphQuery(query: string): Promise<unknown> {
  const response = await fetch(GRAPH_URL(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) throw new Error(`The Graph request failed: ${response.status}`);
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`The Graph returned invalid JSON: ${text.slice(0, 100)}`);
  }
}

export async function fetchKlerosTag(address: string): Promise<KlerosTag | null> {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return null;

  const key = address.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expires) return cached.tag;

  const query = `{ itemProps(where: { label: "Contract Address", value_contains_nocase: "${address}" }, first: 1) { item { item { itemID registryAddress status metadata { props { label value } } } } } }`;

  const json = (await graphQuery(query)) as {
    data?: {
      itemProps?: Array<{
        item?: {
          item?: {
            itemID: string;
            registryAddress: string;
            status: string;
            metadata?: { props: Array<{ label: string; value: string }> };
          };
        };
      }>;
    };
  };
  const litem = json.data?.itemProps?.[0]?.item?.item;

  let tag: KlerosTag | null = null;
  if (litem?.status === "Registered" && litem.registryAddress === ATQ_REGISTRY) {
    const props = litem.metadata?.props ?? [];
    const publicNameTag = props.find((p) => p.label === "Public Name Tag")?.value ?? "";
    const projectName = props.find((p) => p.label === "Project Name")?.value || undefined;
    if (publicNameTag) {
      tag = { itemID: litem.itemID, publicNameTag, projectName };
    }
  }

  cache.set(key, { tag, expires: Date.now() + CACHE_TTL });
  return tag;
}
