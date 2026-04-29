import type {
  DataWithMetadata,
  SolanaAccount,
  SolanaBlock,
  SolanaEpochInfo,
  SolanaInnerInstruction,
  SolanaInstruction,
  SolanaLeaderSchedule,
  SolanaNetworkStats,
  SolanaReward,
  SolanaSignatureInfo,
  SolanaTokenAmount,
  SolanaTokenHolding,
  SolanaTokenLargestAccount,
  SolanaTransaction,
  SolanaValidator,
} from "../../../types";
import type { SolanaClient, SolBlock, SolTransaction } from "@openscan/network-connectors";

// Not exported from the package — mirror the shape
interface SolParsedAccountKey {
  pubkey: string;
  writable: boolean;
  signer: boolean;
  source?: "transaction" | "lookupTable";
}

// SPL Token Program IDs
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

/**
 * Solana blockchain adapter
 *
 * Follows the same pattern as BitcoinAdapter — standalone class, not extending NetworkAdapter.
 */
export class SolanaAdapter {
  readonly networkId: string;
  private client: SolanaClient;

  constructor(networkId: string, client: SolanaClient) {
    this.networkId = networkId;
    this.client = client;
  }

  // ==================== CORE METHODS ====================

  /**
   * Get the current slot number
   */
  async getLatestSlot(): Promise<number> {
    const result = await this.client.getSlot("finalized");
    return result.data ?? 0;
  }

  /**
   * Get network statistics
   */
  async getNetworkStats(): Promise<DataWithMetadata<SolanaNetworkStats>> {
    const [slotResult, epochResult, versionResult, txCountResult] = await Promise.all([
      this.client.getSlot("finalized"),
      this.client.getEpochInfo("finalized"),
      this.client.getVersion(),
      this.client.getTransactionCount("finalized"),
    ]);

    const epochInfo = epochResult.data;

    const stats: SolanaNetworkStats = {
      currentSlot: slotResult.data ?? 0,
      blockHeight: epochInfo?.blockHeight ?? 0,
      epoch: epochInfo?.epoch ?? 0,
      epochSlotIndex: epochInfo?.slotIndex ?? 0,
      epochSlotsTotal: epochInfo?.slotsInEpoch ?? 0,
      transactionCount: txCountResult.data ?? 0,
      version: versionResult.data?.["solana-core"] ?? "unknown",
    };

    return {
      data: stats,
      metadata: slotResult.metadata as DataWithMetadata<SolanaNetworkStats>["metadata"],
    };
  }

  /**
   * Get epoch info
   */
  async getEpochInfo(): Promise<SolanaEpochInfo> {
    const result = await this.client.getEpochInfo("finalized");
    const data = result.data;
    if (!data) {
      throw new Error("Failed to fetch epoch info");
    }
    return {
      epoch: data.epoch,
      slotIndex: data.slotIndex,
      slotsInEpoch: data.slotsInEpoch,
      absoluteSlot: data.absoluteSlot,
      blockHeight: data.blockHeight,
      transactionCount: data.transactionCount,
    };
  }

  /**
   * Get the latest N blocks (slots with confirmed blocks)
   */
  async getLatestBlocks(count = 10): Promise<SolanaBlock[]> {
    const currentSlot = await this.getLatestSlot();

    // Get confirmed block slots in a range
    const startSlot = Math.max(0, currentSlot - 100);
    const slotsResult = await this.client.getBlocks(startSlot, currentSlot, "finalized");
    const slots = (slotsResult.data ?? []).slice(-count).reverse();

    // Fetch block details in parallel
    const blockResults = await Promise.all(
      slots.map((slot) =>
        this.client
          .getBlock(slot, {
            encoding: "jsonParsed",
            transactionDetails: "signatures",
            rewards: true,
            commitment: "finalized",
          })
          .catch(() => null),
      ),
    );

    const blocks: SolanaBlock[] = [];
    for (let i = 0; i < slots.length; i++) {
      const result = blockResults[i];
      if (!result?.data) continue;

      const blockData = result.data;
      blocks.push(this.transformBlock(slots[i] ?? 0, blockData));
    }

    return blocks;
  }

  /**
   * Get a single block by slot number
   */
  async getBlock(slot: number): Promise<DataWithMetadata<SolanaBlock>> {
    const result = await this.client.getBlock(slot, {
      encoding: "jsonParsed",
      transactionDetails: "signatures",
      rewards: true,
      commitment: "finalized",
    });

    if (!result.data) {
      throw new Error(`Block at slot ${slot} not found`);
    }

    return {
      data: this.transformBlock(slot, result.data),
      metadata: result.metadata as DataWithMetadata<SolanaBlock>["metadata"],
    };
  }

  /**
   * Get a transaction by signature
   */
  async getTransaction(signature: string): Promise<DataWithMetadata<SolanaTransaction>> {
    const result = await this.client.getTransaction(signature, {
      encoding: "jsonParsed",
      commitment: "finalized",
      maxSupportedTransactionVersion: 0,
    });

    if (!result.data) {
      throw new Error(`Transaction ${signature} not found`);
    }

    return {
      data: this.transformTransaction(signature, result.data),
      metadata: result.metadata as DataWithMetadata<SolanaTransaction>["metadata"],
    };
  }

  /**
   * Get account information
   */
  async getAccount(pubkey: string): Promise<DataWithMetadata<SolanaAccount>> {
    const [accountResult, tokenAccountsResult] = await Promise.all([
      this.client.getAccountInfo(pubkey, { commitment: "finalized", encoding: "jsonParsed" }),
      this.getTokenAccountsByOwner(pubkey).catch(() => []),
    ]);

    const accountInfo = accountResult.data?.value;

    const account: SolanaAccount = {
      address: pubkey,
      lamports: accountInfo?.lamports ?? 0,
      owner: accountInfo?.owner ?? "11111111111111111111111111111111",
      executable: accountInfo?.executable ?? false,
      rentEpoch: accountInfo?.rentEpoch ?? 0,
      space: accountInfo?.space ?? 0,
      tokenAccounts: tokenAccountsResult,
    };

    return {
      data: account,
      metadata: accountResult.metadata as DataWithMetadata<SolanaAccount>["metadata"],
    };
  }

  // ==================== TOKEN METHODS ====================

  /**
   * Get SPL token accounts owned by an address
   */
  async getTokenAccountsByOwner(owner: string): Promise<SolanaTokenHolding[]> {
    // Fetch from both Token Program and Token-2022 in parallel
    const [tokenResult, token2022Result] = await Promise.all([
      this.client
        .getTokenAccountsByOwner(
          owner,
          { programId: TOKEN_PROGRAM_ID },
          { encoding: "jsonParsed", commitment: "finalized" },
        )
        .catch(() => null),
      this.client
        .getTokenAccountsByOwner(
          owner,
          { programId: TOKEN_2022_PROGRAM_ID },
          { encoding: "jsonParsed", commitment: "finalized" },
        )
        .catch(() => null),
    ]);

    const holdings: SolanaTokenHolding[] = [];

    // biome-ignore lint/suspicious/noExplicitAny: RPC response varies
    const processAccounts = (result: { data?: { value?: any[] } } | null) => {
      if (!result?.data?.value) return;
      for (const tokenAccount of result.data.value) {
        // biome-ignore lint/suspicious/noExplicitAny: parsed data varies
        const parsed = (tokenAccount.account?.data as any)?.parsed?.info;
        if (!parsed) continue;

        holdings.push({
          mint: parsed.mint,
          tokenAccount: tokenAccount.pubkey,
          amount: {
            amount: parsed.tokenAmount?.amount ?? "0",
            decimals: parsed.tokenAmount?.decimals ?? 0,
            uiAmount: parsed.tokenAmount?.uiAmount ?? null,
            uiAmountString: parsed.tokenAmount?.uiAmountString ?? "0",
          },
        });
      }
    };

    processAccounts(tokenResult);
    processAccounts(token2022Result);

    return holdings;
  }

  /**
   * Get total supply for an SPL token
   */
  async getTokenSupply(mint: string): Promise<SolanaTokenAmount> {
    const result = await this.client.getTokenSupply(mint, "finalized");
    const value = result.data?.value;
    return {
      amount: value?.amount ?? "0",
      decimals: value?.decimals ?? 0,
      uiAmount: value?.uiAmount ?? null,
      uiAmountString: value?.uiAmountString ?? "0",
    };
  }

  /**
   * Get the largest holders of an SPL token
   */
  async getTokenLargestAccounts(mint: string): Promise<SolanaTokenLargestAccount[]> {
    const result = await this.client.getTokenLargestAccounts(mint, "finalized");
    const accounts = result.data?.value ?? [];
    return accounts.map((a) => ({
      address: a.address,
      amount: a.amount,
      decimals: a.decimals,
      uiAmount: a.uiAmount,
      uiAmountString: a.uiAmountString,
    }));
  }

  // ==================== VALIDATOR METHODS ====================

  /**
   * Get vote accounts (validators)
   */
  async getVoteAccounts(): Promise<{
    current: SolanaValidator[];
    delinquent: SolanaValidator[];
  }> {
    const result = await this.client.getVoteAccounts({ commitment: "finalized" });
    const data = result.data;
    if (!data) {
      return { current: [], delinquent: [] };
    }

    const mapValidator = (v: {
      votePubkey: string;
      nodePubkey: string;
      activatedStake: number;
      epochVoteAccount: boolean;
      commission: number;
      lastVote: number;
      epochCredits: [number, number, number][];
      rootSlot?: number;
    }): SolanaValidator => ({
      votePubkey: v.votePubkey,
      nodePubkey: v.nodePubkey,
      activatedStake: v.activatedStake,
      commission: v.commission,
      lastVote: v.lastVote,
      epochVoteAccount: v.epochVoteAccount,
      epochCredits: v.epochCredits,
      rootSlot: v.rootSlot,
    });

    return {
      current: (data.current ?? []).map(mapValidator),
      delinquent: (data.delinquent ?? []).map(mapValidator),
    };
  }

  /**
   * Get leader schedule for current epoch
   */
  async getLeaderSchedule(): Promise<SolanaLeaderSchedule> {
    const result = await this.client.getLeaderSchedule(null, { commitment: "finalized" });
    return result.data ?? {};
  }

  // ==================== ACCOUNT HISTORY ====================

  /**
   * Get confirmed signatures for transactions involving an address
   */
  async getSignaturesForAddress(
    address: string,
    config?: { limit?: number; before?: string },
  ): Promise<SolanaSignatureInfo[]> {
    const result = await this.client.getSignaturesForAddress(address, {
      limit: config?.limit ?? 20,
      before: config?.before,
      commitment: "finalized",
    });

    return (result.data ?? []).map((sig) => ({
      signature: sig.signature,
      slot: sig.slot,
      blockTime: sig.blockTime,
      err: sig.err,
      memo: sig.memo,
      confirmationStatus: sig.confirmationStatus,
    }));
  }

  // ==================== UTILITY METHODS ====================

  isSolana(): boolean {
    return true;
  }

  getNetworkId(): string {
    return this.networkId;
  }

  // ==================== PRIVATE TRANSFORM METHODS ====================

  private transformBlock(slot: number, blockData: SolBlock): SolanaBlock {
    return {
      slot,
      blockhash: blockData.blockhash,
      previousBlockhash: blockData.previousBlockhash,
      parentSlot: blockData.parentSlot,
      blockHeight: blockData.blockHeight,
      blockTime: blockData.blockTime,
      transactionCount: blockData.signatures?.length ?? blockData.transactions?.length ?? 0,
      rewards: (blockData.rewards ?? []).map(
        (r): SolanaReward => ({
          pubkey: r.pubkey,
          lamports: r.lamports,
          postBalance: r.postBalance,
          rewardType: r.rewardType,
          commission: r.commission,
        }),
      ),
      signatures: blockData.signatures,
    };
  }

  private transformTransaction(signature: string, txData: SolTransaction): SolanaTransaction {
    const meta = txData.meta;
    const message = txData.transaction.message;

    // Parse account keys
    const accountKeys = Array.isArray(message.accountKeys)
      ? message.accountKeys.map((key) => {
          if (typeof key === "string") {
            return { pubkey: key, writable: false, signer: false };
          }
          const parsed = key as SolParsedAccountKey;
          return {
            pubkey: parsed.pubkey,
            writable: parsed.writable,
            signer: parsed.signer,
          };
        })
      : [];

    // Extract signers
    const signers = accountKeys.filter((k) => k.signer).map((k) => k.pubkey);
    if (signers.length === 0 && txData.transaction.signatures.length > 0) {
      // First account key is always the fee payer / signer
      const firstKey = accountKeys[0];
      if (firstKey) {
        signers.push(firstKey.pubkey);
      }
    }

    // Transform instructions
    const instructions: SolanaInstruction[] = message.instructions.map(
      // biome-ignore lint/suspicious/noExplicitAny: instruction format varies
      (ix: any): SolanaInstruction => ({
        programId: ix.programId ?? ix.program ?? "",
        accounts: ix.accounts ?? [],
        data: ix.data ?? "",
        parsed: ix.parsed,
      }),
    );

    // Transform inner instructions
    const innerInstructions: SolanaInnerInstruction[] = (meta?.innerInstructions ?? []).map(
      // biome-ignore lint/suspicious/noExplicitAny: inner instruction format varies
      (group: any): SolanaInnerInstruction => ({
        index: group.index,
        instructions: (group.instructions ?? []).map(
          // biome-ignore lint/suspicious/noExplicitAny: instruction format varies
          (ix: any): SolanaInstruction => ({
            programId: ix.programId ?? ix.program ?? "",
            accounts: ix.accounts ?? [],
            data: ix.data ?? "",
            parsed: ix.parsed,
          }),
        ),
      }),
    );

    return {
      signature,
      slot: txData.slot,
      blockTime: txData.blockTime,
      fee: meta?.fee ?? 0,
      status: meta?.err ? "failed" : "success",
      err: meta?.err ?? null,
      signers,
      accountKeys,
      instructions,
      innerInstructions,
      logMessages: meta?.logMessages ?? [],
      preBalances: meta?.preBalances ?? [],
      postBalances: meta?.postBalances ?? [],
      preTokenBalances: (meta?.preTokenBalances ?? []).map((tb) => ({
        accountIndex: tb.accountIndex,
        mint: tb.mint,
        owner: tb.owner,
        uiTokenAmount: {
          amount: tb.uiTokenAmount.amount,
          decimals: tb.uiTokenAmount.decimals,
          uiAmount: tb.uiTokenAmount.uiAmount,
          uiAmountString: tb.uiTokenAmount.uiAmountString,
        },
      })),
      postTokenBalances: (meta?.postTokenBalances ?? []).map((tb) => ({
        accountIndex: tb.accountIndex,
        mint: tb.mint,
        owner: tb.owner,
        uiTokenAmount: {
          amount: tb.uiTokenAmount.amount,
          decimals: tb.uiTokenAmount.decimals,
          uiAmount: tb.uiTokenAmount.uiAmount,
          uiAmountString: tb.uiTokenAmount.uiAmountString,
        },
      })),
      computeUnitsConsumed: meta?.computeUnitsConsumed,
      version: txData.version,
    };
  }
}
