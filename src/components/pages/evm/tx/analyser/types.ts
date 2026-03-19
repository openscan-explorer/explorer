import type { DecodedInput } from "../../../../../utils/inputDecoder";
import type { DataService } from "../../../../../services/DataService";

export type AnalyserTab =
  | "callTree"
  | "gasProfiler"
  | "stateChanges"
  | "events"
  | "inputData"
  | "blobData";

export interface TxAnalyserProps {
  txHash: string;
  networkId: string;
  networkCurrency: string;
  dataService: DataService;
  logs?: import("@openscan/network-connectors").EthLog[];
  txToAddress?: string;
  // biome-ignore lint/suspicious/noExplicitAny: ABI types are dynamic
  contractAbi?: any[];
  inputData?: string;
  decodedInputData?: DecodedInput | null;
  isSuperUser?: boolean;
  blobVersionedHashes?: string[];
  blockTimestamp?: number;
}

export const CALL_TYPE_COLORS: Record<string, string> = {
  CALL: "#3b82f6",
  DELEGATECALL: "#f97316",
  STATICCALL: "#8b5cf6",
  CREATE: "#10b981",
  CREATE2: "#10b981",
  SELFDESTRUCT: "#ef4444",
};

export function getCallTypeColor(type: string): string {
  return CALL_TYPE_COLORS[type.toUpperCase()] ?? "#6b7280";
}
