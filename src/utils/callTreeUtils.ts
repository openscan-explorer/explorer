import type { CallNode } from "../services/adapters/NetworkAdapter";

/**
 * Normalize a Geth callTracer response to CallNode.
 * The callTracer already returns a nested tree — we just map field names.
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic callTracer response
export function normalizeGethCallTrace(raw: any): CallNode {
  return {
    type: (raw.type || "CALL").toUpperCase(),
    from: raw.from ?? "",
    to: raw.to,
    value: raw.value,
    gas: raw.gas,
    gasUsed: raw.gasUsed,
    input: raw.input,
    output: raw.output,
    error: raw.error,
    revertReason: raw.revertReason,
    // biome-ignore lint/suspicious/noExplicitAny: Generic callTracer response
    calls: raw.calls?.map((c: any) => normalizeGethCallTrace(c)),
  };
}

interface ParityTraceAction {
  callType?: string;
  from?: string;
  to?: string;
  value?: string;
  gas?: string;
  input?: string;
}

interface ParityTraceResult {
  gasUsed?: string;
  output?: string;
  address?: string;
}

interface ParityTrace {
  type: string;
  action: ParityTraceAction;
  result?: ParityTraceResult;
  error?: string;
  traceAddress: number[];
  subtraces: number;
}

/**
 * Normalize a flat Parity/arbtrace_transaction response to a CallNode tree.
 * The traceAddress array encodes position in the call hierarchy.
 */
export function normalizeParityCallTrace(traces: ParityTrace[]): CallNode | null {
  if (!traces || traces.length === 0) return null;

  const root = traces.find((t) => t.traceAddress.length === 0);
  if (!root) return null;

  function buildNode(trace: ParityTrace): CallNode {
    const action = trace.action;
    const result = trace.result;

    const children = traces
      .filter((t) => {
        if (t.traceAddress.length !== trace.traceAddress.length + 1) return false;
        return trace.traceAddress.every((v, i) => t.traceAddress[i] === v);
      })
      .map(buildNode);

    return {
      type: (action.callType || trace.type || "CALL").toUpperCase(),
      from: action.from ?? "",
      to: action.to ?? result?.address,
      value: action.value,
      gas: action.gas,
      gasUsed: result?.gasUsed,
      input: action.input,
      output: result?.output,
      error: trace.error,
      calls: children.length > 0 ? children : undefined,
    };
  }

  return buildNode(root);
}

/** Count total calls in a tree */
export function countCalls(node: CallNode): number {
  return 1 + (node.calls?.reduce((sum, c) => sum + countCalls(c), 0) ?? 0);
}

/** Count reverted calls in a tree */
export function countReverts(node: CallNode): number {
  const selfReverted = node.error ? 1 : 0;
  return selfReverted + (node.calls?.reduce((sum, c) => sum + countReverts(c), 0) ?? 0);
}

/** Count calls by type (CALL, STATICCALL, DELEGATECALL, CREATE, etc.) */
export function countByType(node: CallNode): Record<string, number> {
  const counts: Record<string, number> = {};
  function traverse(n: CallNode) {
    const type = n.type.toUpperCase();
    counts[type] = (counts[type] ?? 0) + 1;
    n.calls?.forEach(traverse);
  }
  traverse(node);
  return counts;
}

/** Collect all unique `to` addresses from a call tree (lowercased) */
export function collectAddresses(node: CallNode): string[] {
  const addrs = new Set<string>();
  function traverse(n: CallNode) {
    if (n.to) addrs.add(n.to.toLowerCase());
    n.calls?.forEach(traverse);
  }
  traverse(node);
  return Array.from(addrs);
}

/** Parse hex gas value to number */
export function hexToGas(hex: string | undefined): number | undefined {
  if (!hex) return undefined;
  return Number.parseInt(hex.startsWith("0x") ? hex : `0x${hex}`, 16);
}
