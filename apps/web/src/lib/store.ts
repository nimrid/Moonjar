'use client';

import {
  ChildVaultMetadata,
  BuyDecisionLog,
  KidRequest,
  GiftLink,
  PreStockToken,
  PRESTOCKS_LIST,
  BASKET_PRESETS,
  calculatePremiumPct,
  getPriceCheck,
} from '@moonjar/shared';

export interface VaultState {
  metadata: ChildVaultMetadata;
  saveBalanceUsdc: number;
  moonBalanceUsdc: number;
  moonCostBasisUsdc: number;
  totalDepositedUsdc: number;
  moonCapBps: number; // 2000 = 20%
  isPaused: boolean;
  isGraduated: boolean;
  matchBalanceUsdc: number;
  allocations: {
    symbol: string;
    mint: string;
    weightBps: number;
    sharesOwned: number;
    currentValueUsd: number;
  }[];
  decisions: BuyDecisionLog[];
  requests: KidRequest[];
  completedLessons: string[];
}

const INITIAL_DEMO_VAULT: VaultState = {
  metadata: {
    vaultAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    nickname: 'Leo The Explorer',
    avatar: 'otter',
    ageBand: 'little',
    unlockDate: '2032-06-15T00:00:00.000Z',
    guardianWallet: 'BBNyzG9Kn1xf8ZFbwK2nKr3XW4MGr4XE8pQ9iJ1rsi57',
    capabilityToken: 'demo-token',
    createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
  },
  saveBalanceUsdc: 185.50,
  moonBalanceUsdc: 38.75,
  moonCostBasisUsdc: 32.00,
  totalDepositedUsdc: 217.50,
  moonCapBps: 2000, // 20%
  isPaused: false,
  isGraduated: false,
  matchBalanceUsdc: 15.00,
  allocations: [
    {
      symbol: 'SPACEX',
      mint: 'PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh',
      weightBps: 4000,
      sharesOwned: 1.5,
      currentValueUsd: 18.15,
    },
    {
      symbol: 'ANDURIL',
      mint: 'PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB',
      weightBps: 3500,
      sharesOwned: 1.4,
      currentValueUsd: 12.46,
    },
    {
      symbol: 'FIGUREAI',
      mint: 'PreZad18qfPtbxNpMtMuAuX2zVpvkEU8DnJx56faCWd',
      weightBps: 2500,
      sharesOwned: 1.85,
      currentValueUsd: 8.14,
    },
  ],
  decisions: [
    {
      id: 'dec-101',
      timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      vaultAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      symbol: 'SPACEX',
      action: 'BUY',
      premiumPct: 8.04,
      amountInUsdc: 5000000,
      amountOutTokens: 413223,
      machineReason: 'PREMIUM_ACCEPTABLE (8.0% <= 10.0%)',
      humanReasonKid: 'Pip found a fair price for SpaceX and added a little piece to your Moon Jar!',
      humanReasonGuardian: 'SpaceX premium is 8.0% (<= 10% threshold). $5.00 allocated from Save Jar.',
      txSignature: '3xNq...7wPq',
    },
    {
      id: 'dec-102',
      timestamp: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
      vaultAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      symbol: 'OPENAI',
      action: 'SKIP',
      premiumPct: 15.56,
      machineReason: 'PREMIUM_TOO_HIGH (15.6% > 10.0%)',
      humanReasonKid: 'OpenAI costs too much right now. Pip is being patient and keeping your coins safe!',
      humanReasonGuardian: 'OpenAI premium is 15.6%, exceeding 10.0% safety ceiling. Purchase skipped.',
    },
    {
      id: 'dec-103',
      timestamp: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
      vaultAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      symbol: 'ANDURIL',
      action: 'BUY',
      premiumPct: 4.71,
      amountInUsdc: 4500000,
      amountOutTokens: 505617,
      machineReason: 'PREMIUM_ACCEPTABLE (4.7% <= 10.0%)',
      humanReasonKid: 'Anduril was at a great price! Pip added another slice to your Moon Jar.',
      humanReasonGuardian: 'Anduril premium 4.7% is well under 10% cap. Executed buy for $4.50.',
      txSignature: '4zKt...9mRt',
    },
  ],
  requests: [
    {
      id: 'req-1',
      vaultAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      type: 'ADD_MONEY',
      amount: 10,
      topic: 'I cleaned my room and washed the dishes!',
      status: 'PENDING',
    },
    {
      id: 'req-2',
      vaultAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      type: 'LEARN',
      topic: 'How do rockets actually land backwards?',
      status: 'COMPLETED',
    }
  ],
  completedLessons: ['what-is-money', 'two-jars'],
};

const STORAGE_KEY = 'moonjar_vault_state';

export function getStoredVault(): VaultState {
  if (typeof window === 'undefined') return INITIAL_DEMO_VAULT;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    saveVault(INITIAL_DEMO_VAULT);
    return INITIAL_DEMO_VAULT;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_VAULT;
  }
}

export function saveVault(state: VaultState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetVault(): VaultState {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  return INITIAL_DEMO_VAULT;
}
