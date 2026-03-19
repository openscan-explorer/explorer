import type {
  CallNode,
  PrestateAccountState,
  PrestateTrace,
  TraceLog,
  TraceResult,
} from "../services/adapters/NetworkAdapter";

/**
 * Call opcodes that create a new frame in the EVM execution stack.
 */
const CALL_OPS = new Set(["CALL", "STATICCALL", "DELEGATECALL", "CALLCODE", "CREATE", "CREATE2"]);

/**
 * Opcodes that terminate the current frame.
 */
const RETURN_OPS = new Set(["RETURN", "REVERT", "STOP", "SELFDESTRUCT", "INVALID"]);

/** Read a 256-bit stack word as a hex address (last 20 bytes). */
function stackAddr(word: string): string {
  const raw = word.replace(/^0x/, "").padStart(40, "0");
  return `0x${raw.slice(-40)}`;
}

/** Ensure a value has 0x prefix. */
function ensureHex(word: string): string {
  return word.startsWith("0x") ? word : `0x${word}`;
}

/** Convert a number to a hex string. */
function toHex(n: number): string {
  return `0x${n.toString(16)}`;
}

interface TxContext {
  from: string;
  to: string;
  value: string;
  gas: string;
  input: string;
}

interface FrameInfo {
  node: CallNode;
  startGas: number;
}

/**
 * Build a CallNode tree from EVM struct logs (opcode-level trace).
 *
 * This is used for Hardhat which only supports the default struct log tracer
 * and does not support Geth's `callTracer`.
 *
 * The algorithm tracks CALL/STATICCALL/DELEGATECALL/CREATE opcodes and their
 * corresponding RETURN/REVERT/STOP to reconstruct the call hierarchy.
 */
export function buildCallTreeFromStructLogs(trace: TraceResult, tx: TxContext): CallNode {
  const root: CallNode = {
    type: "CALL",
    from: tx.from,
    to: tx.to,
    value: tx.value,
    gas: tx.gas,
    gasUsed: toHex(trace.gas),
    input: tx.input,
    output: trace.returnValue ? ensureHex(trace.returnValue) : undefined,
    error: trace.failed ? "execution reverted" : undefined,
    calls: [],
  };

  const stack: FrameInfo[] = [{ node: root, startGas: Number.parseInt(tx.gas, 16) || 0 }];
  const logs = trace.structLogs;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i] as TraceLog;

    if (CALL_OPS.has(log.op) && log.stack) {
      const child = extractCallFromStack(log, stack);
      if (child) {
        const parent = stack[stack.length - 1] as FrameInfo;
        if (!parent.node.calls) parent.node.calls = [];
        parent.node.calls.push(child.node);
        stack.push(child);
      }
    } else if (RETURN_OPS.has(log.op)) {
      if (stack.length > 1) {
        const frame = stack.pop();
        if (frame) {
          if (log.op === "REVERT") {
            frame.node.error = "execution reverted";
          }
          frame.node.gasUsed = toHex(Math.max(0, frame.startGas - log.gas));
        }
      }
    }
  }

  cleanEmptyCalls(root);
  return root;
}

/**
 * Extract call information from the EVM stack at a CALL-type opcode.
 *
 * Stack layout (top to bottom) for each opcode:
 * CALL:         gas, to, value, inOffset, inSize, outOffset, outSize
 * CALLCODE:     gas, to, value, inOffset, inSize, outOffset, outSize
 * STATICCALL:   gas, to, inOffset, inSize, outOffset, outSize
 * DELEGATECALL: gas, to, inOffset, inSize, outOffset, outSize
 * CREATE:       value, offset, size
 * CREATE2:      value, offset, size, salt
 */
function extractCallFromStack(log: TraceLog, callStack: FrameInfo[]): FrameInfo | null {
  const s = log.stack;
  if (!s || s.length === 0) return null;

  const parent = callStack[callStack.length - 1] as FrameInfo;
  let type = log.op;
  let to: string | undefined;
  let value: string | undefined;
  let gas: string | undefined;

  // Stack is bottom-to-top in the array, so top of stack = last element
  const len = s.length;

  switch (log.op) {
    case "CALL":
    case "CALLCODE": {
      if (len < 7) return null;
      const gasWord = s[len - 1] as string;
      const toWord = s[len - 2] as string;
      const valWord = s[len - 3] as string;
      gas = ensureHex(gasWord);
      to = stackAddr(toWord);
      value = ensureHex(valWord);
      break;
    }
    case "STATICCALL":
    case "DELEGATECALL": {
      if (len < 6) return null;
      const gasWord = s[len - 1] as string;
      const toWord = s[len - 2] as string;
      gas = ensureHex(gasWord);
      to = stackAddr(toWord);
      value = "0x0";
      break;
    }
    case "CREATE": {
      if (len < 3) return null;
      const valWord = s[len - 1] as string;
      value = ensureHex(valWord);
      gas = toHex(log.gas);
      type = "CREATE";
      to = undefined;
      break;
    }
    case "CREATE2": {
      if (len < 4) return null;
      const valWord = s[len - 1] as string;
      value = ensureHex(valWord);
      gas = toHex(log.gas);
      type = "CREATE2";
      to = undefined;
      break;
    }
    default:
      return null;
  }

  // For DELEGATECALL, msg.sender stays the same as the parent's from
  const from =
    log.op === "DELEGATECALL"
      ? (parent.node.from ?? "")
      : (parent.node.to ?? parent.node.from ?? "");

  const node: CallNode = {
    type: type.toUpperCase(),
    from,
    to,
    value,
    gas,
    gasUsed: undefined,
    input: undefined,
    output: undefined,
    calls: [],
  };

  const startGas = gas ? Number.parseInt(gas, 16) || 0 : log.gas;
  return { node, startGas };
}

/** Remove empty calls arrays to match callTracer output format. */
function cleanEmptyCalls(node: CallNode): void {
  if (node.calls && node.calls.length === 0) {
    node.calls = undefined;
  } else if (node.calls) {
    for (const child of node.calls) {
      cleanEmptyCalls(child);
    }
  }
}

/**
 * Build a PrestateTrace (pre/post state diff) from EVM struct logs.
 *
 * Tracks SLOAD/SSTORE operations to identify storage changes.
 *
 * Note: This produces a best-effort approximation since struct logs
 * don't contain the full pre/post state like a native prestateTracer.
 */
export function buildPrestateFromStructLogs(
  trace: TraceResult,
  tx: TxContext,
): PrestateTrace | null {
  const pre: Record<string, PrestateAccountState> = {};
  const post: Record<string, PrestateAccountState> = {};

  const storageReads: Record<string, Record<string, string>> = {};
  const storageWrites: Record<string, Record<string, string>> = {};

  // Track which contract is executing at each depth
  const addressByDepth: Record<number, string> = {};
  addressByDepth[1] = tx.to.toLowerCase();

  for (const log of trace.structLogs) {
    const currentAddr = addressByDepth[log.depth] ?? tx.to.toLowerCase();

    if (log.op === "SLOAD" && log.stack && log.storage) {
      const slot = log.stack[log.stack.length - 1];
      if (slot !== undefined) {
        const addr = currentAddr;
        if (!storageReads[addr]) storageReads[addr] = {};
        const hexSlot = ensureHex(slot);
        const rawSlot = slot.replace(/^0x/, "");
        const storageVal = log.storage[rawSlot];
        if (storageVal) {
          (storageReads[addr] as Record<string, string>)[hexSlot] = ensureHex(storageVal);
        }
      }
    }

    if (log.op === "SSTORE" && log.stack) {
      const len = log.stack.length;
      if (len >= 2) {
        const slot = log.stack[len - 1];
        const val = log.stack[len - 2];
        if (slot !== undefined && val !== undefined) {
          const addr = currentAddr;
          if (!storageWrites[addr]) storageWrites[addr] = {};
          const hexSlot = ensureHex(slot);
          (storageWrites[addr] as Record<string, string>)[hexSlot] = ensureHex(val);

          // If we haven't seen a read for this slot, record pre-state from storage map
          const addrReads = storageReads[addr];
          if ((!addrReads || !addrReads[hexSlot]) && log.storage) {
            if (!storageReads[addr]) storageReads[addr] = {};
            const rawSlot = slot.replace(/^0x/, "");
            const storageVal = log.storage[rawSlot];
            if (storageVal) {
              (storageReads[addr] as Record<string, string>)[hexSlot] = ensureHex(storageVal);
            }
          }
        }
      }
    }

    // Track address context changes from CALL opcodes
    if (CALL_OPS.has(log.op) && log.stack) {
      const len = log.stack.length;
      if (log.op === "CALL" || log.op === "CALLCODE" || log.op === "STATICCALL") {
        const toWord = len >= 2 ? log.stack[len - 2] : undefined;
        if (toWord) {
          addressByDepth[log.depth + 1] = stackAddr(toWord);
        }
      } else if (log.op === "DELEGATECALL") {
        addressByDepth[log.depth + 1] = currentAddr;
      }
    }
  }

  // Build pre state from reads
  for (const [addr, slots] of Object.entries(storageReads)) {
    if (!pre[addr]) pre[addr] = {};
    (pre[addr] as PrestateAccountState).storage = slots;
  }

  // Build post state from writes (merged with reads for unchanged slots)
  for (const [addr, slots] of Object.entries(storageWrites)) {
    if (!post[addr]) post[addr] = {};
    const preStorage = storageReads[addr] ?? {};
    (post[addr] as PrestateAccountState).storage = { ...preStorage, ...slots };
  }

  // Include pre-state for addresses that had writes
  for (const addr of Object.keys(storageWrites)) {
    if (!pre[addr]) pre[addr] = {};
    const preEntry = pre[addr] as PrestateAccountState;
    if (!preEntry.storage) preEntry.storage = storageReads[addr] ?? {};
  }

  // Add sender and receiver
  const sender = tx.from.toLowerCase();
  const receiver = tx.to.toLowerCase();
  if (!pre[sender]) pre[sender] = {};
  if (!post[sender]) post[sender] = {};
  if (!pre[receiver]) pre[receiver] = {};
  if (!post[receiver]) post[receiver] = {};

  if (Object.keys(pre).length === 0 && Object.keys(post).length === 0) {
    return null;
  }

  return { pre, post };
}
