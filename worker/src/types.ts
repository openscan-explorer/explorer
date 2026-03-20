export const VALID_ANALYSIS_TYPES = [
  "transaction",
  "account",
  "contract",
  "block",
  "bitcoin_transaction",
  "bitcoin_block",
  "bitcoin_address",
] as const;

export type AIAnalysisType = (typeof VALID_ANALYSIS_TYPES)[number];

export interface AnalyzeRequestBody {
  type: AIAnalysisType;
  messages: Array<{ role: "system" | "user"; content: string }>;
}

export interface EtherscanVerifyRequestBody {
  chainId: number;
  address: string;
}

export interface Env {
  GROQ_API_KEY: string;
  ETHERSCAN_API_KEY: string;
  ALLOWED_ORIGINS: string;
  GROQ_MODEL: string;
}
