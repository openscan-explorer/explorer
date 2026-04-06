/**
 * Temporary type stubs for SolanaClient until @openscan/network-connectors publishes Solana support.
 * These types mirror the SolanaClient API from network-connectors PR #25.
 * Once the package is published, delete this file and import from @openscan/network-connectors.
 */

// biome-ignore lint/suspicious/noExplicitAny: stub types for unpublished package
type StrategyResult<T> = { data: T; metadata?: any };

export type Commitment = "processed" | "confirmed" | "finalized";

export interface SolRpcResponse<T> {
  context: { slot: number; apiVersion?: string };
  value: T;
}

export interface SolAccountInfo {
  lamports: number;
  owner: string;
  // biome-ignore lint/suspicious/noExplicitAny: account data varies
  data: string | [string, string] | { program: string; parsed: any; space: number };
  executable: boolean;
  rentEpoch: number;
  space?: number;
}

export interface SolBlock {
  blockhash: string;
  previousBlockhash: string;
  parentSlot: number;
  // biome-ignore lint/suspicious/noExplicitAny: transaction format varies
  transactions?: any[];
  signatures?: string[];
  rewards?: SolReward[];
  blockTime: number | null;
  blockHeight: number | null;
}

export interface SolReward {
  pubkey: string;
  lamports: number;
  postBalance: number;
  rewardType: "fee" | "rent" | "staking" | "voting" | null;
  commission?: number | null;
}

export interface SolTransaction {
  slot: number;
  transaction: {
    signatures: string[];
    message: {
      accountKeys: string[] | SolParsedAccountKey[];
      recentBlockhash: string;
      // biome-ignore lint/suspicious/noExplicitAny: instruction formats vary
      instructions: any[];
      addressTableLookups?: {
        accountKey: string;
        writableIndexes: number[];
        readonlyIndexes: number[];
      }[];
    };
  };
  meta: SolTransactionMeta | null;
  blockTime: number | null;
  version?: "legacy" | 0;
}

export interface SolParsedAccountKey {
  pubkey: string;
  writable: boolean;
  signer: boolean;
  source?: "transaction" | "lookupTable";
}

export interface SolTransactionMeta {
  // biome-ignore lint/suspicious/noExplicitAny: error format varies
  err: any;
  fee: number;
  preBalances: number[];
  postBalances: number[];
  // biome-ignore lint/suspicious/noExplicitAny: instruction formats vary
  innerInstructions: { index: number; instructions: any[] }[] | null;
  logMessages: string[] | null;
  preTokenBalances?: SolTokenBalance[];
  postTokenBalances?: SolTokenBalance[];
  rewards?: SolReward[] | null;
  loadedAddresses?: { writable: string[]; readonly: string[] };
  returnData?: { programId: string; data: [string, string] } | null;
  computeUnitsConsumed?: number;
}

export interface SolTokenBalance {
  accountIndex: number;
  mint: string;
  uiTokenAmount: SolTokenAmount;
  owner?: string;
  programId?: string;
}

export interface SolTokenAmount {
  amount: string;
  decimals: number;
  uiAmount: number | null;
  uiAmountString: string;
}

export interface SolTokenAccount {
  account: SolAccountInfo;
  pubkey: string;
}

export interface SolTokenLargestAccount {
  address: string;
  amount: string;
  decimals: number;
  uiAmount: number | null;
  uiAmountString: string;
}

export interface SolEpochInfo {
  absoluteSlot: number;
  blockHeight: number;
  epoch: number;
  slotIndex: number;
  slotsInEpoch: number;
  transactionCount?: number;
}

export interface SolVoteAccount {
  votePubkey: string;
  nodePubkey: string;
  activatedStake: number;
  epochVoteAccount: boolean;
  commission: number;
  lastVote: number;
  epochCredits: [number, number, number][];
  rootSlot?: number;
}

export interface SolSignatureInfo {
  signature: string;
  slot: number;
  // biome-ignore lint/suspicious/noExplicitAny: error format varies
  err: any;
  memo: string | null;
  blockTime: number | null;
  confirmationStatus: Commitment | null;
}

export interface SolVersion {
  "solana-core": string;
  "feature-set": number;
}

export interface SolPerfSample {
  slot: number;
  numTransactions: number;
  numSlots: number;
  samplePeriodSecs: number;
  numNonVoteTransactions?: number;
}

export type SolLeaderSchedule = Record<string, number[]>;

/**
 * Minimal SolanaClient interface matching the API from network-connectors PR #25.
 * Replace with import from @openscan/network-connectors once published.
 */
export interface ISolanaClient {
  getAccountInfo(
    pubkey: string,
    config?: { commitment?: Commitment; encoding?: string },
  ): Promise<StrategyResult<SolRpcResponse<SolAccountInfo | null>>>;

  getBalance(
    pubkey: string,
    config?: { commitment?: Commitment },
  ): Promise<StrategyResult<SolRpcResponse<number>>>;

  getBlock(
    slot: number,
    config?: {
      encoding?: string;
      transactionDetails?: string;
      rewards?: boolean;
      commitment?: Commitment;
    },
  ): Promise<StrategyResult<SolBlock | null>>;

  getBlockHeight(commitment?: Commitment): Promise<StrategyResult<number>>;

  getBlocks(
    startSlot: number,
    endSlot?: number,
    commitment?: Commitment,
  ): Promise<StrategyResult<number[]>>;

  getBlocksWithLimit(
    startSlot: number,
    limit: number,
    commitment?: Commitment,
  ): Promise<StrategyResult<number[]>>;

  getBlockTime(slot: number): Promise<StrategyResult<number | null>>;

  getSlot(commitment?: Commitment): Promise<StrategyResult<number>>;

  getTransaction(
    signature: string,
    config?: {
      encoding?: string;
      commitment?: Commitment;
      maxSupportedTransactionVersion?: number;
    },
  ): Promise<StrategyResult<SolTransaction | null>>;

  getSignaturesForAddress(
    address: string,
    config?: { limit?: number; before?: string; until?: string; commitment?: Commitment },
  ): Promise<StrategyResult<SolSignatureInfo[]>>;

  getTokenAccountsByOwner(
    owner: string,
    filter: { mint?: string; programId?: string },
    config?: { encoding?: string; commitment?: Commitment },
  ): Promise<StrategyResult<SolRpcResponse<SolTokenAccount[]>>>;

  getTokenSupply(
    mint: string,
    commitment?: Commitment,
  ): Promise<StrategyResult<SolRpcResponse<SolTokenAmount>>>;

  getTokenLargestAccounts(
    mint: string,
    commitment?: Commitment,
  ): Promise<StrategyResult<SolRpcResponse<SolTokenLargestAccount[]>>>;

  getEpochInfo(commitment?: Commitment): Promise<StrategyResult<SolEpochInfo>>;

  getVoteAccounts(config?: {
    commitment?: Commitment;
  }): Promise<StrategyResult<{ current: SolVoteAccount[]; delinquent: SolVoteAccount[] }>>;

  getVersion(): Promise<StrategyResult<SolVersion>>;

  getSlotLeader(commitment?: Commitment): Promise<StrategyResult<string>>;

  getLeaderSchedule(
    slot?: number | null,
    config?: { commitment?: Commitment; identity?: string },
  ): Promise<StrategyResult<SolLeaderSchedule | null>>;

  getTransactionCount(commitment?: Commitment): Promise<StrategyResult<number>>;

  getRecentPerformanceSamples(limit?: number): Promise<StrategyResult<SolPerfSample[]>>;

  getRecentPrioritizationFees(
    addresses?: string[],
  ): Promise<StrategyResult<{ slot: number; prioritizationFee: number }[]>>;
}
