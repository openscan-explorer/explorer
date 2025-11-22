import { ethers } from 'ethers';
import React from 'react';

// ==================== CORE DOMAIN TYPES ====================

export interface NetworkStats {
  currentGasPrice: string
  isSyncing: boolean
  hashRate: string
  currentBlockNumber: string
}

export interface Block {
  difficulty: string
  extraData: string
  gasLimit: string
  gasUsed: string
  hash: string
  logsBloom: string
  miner: string
  mixHash: string
  nonce: string
  number: string
  parentHash: string
  receiptsRoot: string
  sha3Uncles: string
  size: string
  stateRoot: string
  timestamp: string
  totalDifficulty: string
  transactions: Transaction[]
  transactionsRoot: string
  uncles: any[]
}

export interface Transaction {
  blockHash: string
  blockNumber: string
  from: string
  gas: string
  gasPrice: string
  hash: string
  input: string
  nonce: string
  to: string
  transactionIndex: string
  value: string
  type: string
  v: string
  r: string
  s: string
}

export interface TransactionReceipt {  
  blockHash: string
  blockNumber: string
  contractAddress: any
  cumulativeGasUsed: string
  effectiveGasPrice: string
  from: string
  gasUsed: string
  logs: any[]
  logsBloom: string
  status: string
  to: string
  transactionHash: string
  transactionIndex: string
  type: string
}

export interface Address {
  balance: string
  code: string
  txCount: string
  storeageAt: StoreageAt
}

export type StoreageAt = Record<string, string> 

export interface MempoolTransaction {
  from: string
  gas: string
  gasPrice: string
  hash: string
  input: string
  nonce: string
  to: string
  value: string
  type: string
  v: string
  r: string
  s: string
}

// ==================== CONTEXT TYPES ====================

/**
 * Notification interface
 */
export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error';
  duration?: number; // Auto-dismiss after this many milliseconds (optional)
}

/**
 * Notification context type
 */
export interface NotificationContextType {
  notifications: Notification[];
  addNotification: (message: string, type: Notification['type'], duration?: number) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

/**
 * Notification provider props
 */
export interface NotificationProviderProps {
  children: React.ReactNode;
}

/**
 * Theme context type
 */
export interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

/**
 * Theme provider props
 */
export interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * App context interface
 */
export interface IAppContext {
  appReady: boolean;
  resourcesLoaded: boolean;
  isHydrated: boolean;
}






// ==================== HOOK CONFIGURATION TYPES ====================



// ==================== SETTINGS TYPES ====================

/**
 * User settings for the application
 */
export interface UserSettings {
  theme?: 'light' | 'dark' | 'auto';
}

/**
 * Default user settings
 */
export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'auto'
};
