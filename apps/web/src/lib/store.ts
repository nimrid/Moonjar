'use client';

import { PublicKey } from '@solana/web3.js';
import {
  ChildVaultMetadata,
  BuyDecisionLog,
  KidRequest,
  getBasketPresets,
} from '@moonjar/shared';
import { findVaultPda } from './vault-client/pda';
import { RPC_URL } from './onchain';

export interface OnChainRoundupTx {
  id: string;
  type: 'JUPITER_DEX' | 'SPL_TRANSFER' | 'RAYDIUM_AMM' | 'DEFI_DEPOSIT';
  protocol: string;
  badgeColor: string;
  icon: string;
  description: string;
  volumeUsd: number;
  roundedUpUsdc: number;
  txHash: string;
  timestamp: string;
}

export interface RoundupSettings {
  isEnabled: boolean;
  multiplier: 1 | 2 | 5;
  weeklyCap: number;
  includeJupiter: boolean;
  includeSpl: boolean;
  includeDeFi: boolean;
}

export interface VaultState {
  metadata: ChildVaultMetadata;
  saveBalanceUsdc: number;
  moonBalanceUsdc: number;
  moonCostBasisUsdc: number;
  totalDepositedUsdc: number;
  moonCapBps: number; // 2000 = 20%
  roundupThresholdUsdc?: number;
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
  roundupTransactions?: OnChainRoundupTx[];
  roundupSettings?: RoundupSettings;
}

export const STORAGE_KEY = 'moonjar_vault_state';

/**
 * Creates a clean default vault state with real derived PDA and empty decisions.
 */
export function createDefaultVaultState(guardianWallet: string, vaultAddress?: string): VaultState {
  let addr = vaultAddress || '';
  if (!addr && guardianWallet && guardianWallet !== 'demo-guardian') {
    try {
      const [pda] = findVaultPda(new PublicKey(guardianWallet), 0n);
      addr = pda.toBase58();
    } catch {}
  }

  return {
    metadata: {
      vaultAddress: addr,
      nickname: 'Child Vault',
      avatar: 'otter',
      ageBand: 'little',
      unlockDate: new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000).toISOString(),
      guardianWallet,
      capabilityToken: `token-${Date.now()}`,
      createdAt: new Date().toISOString(),
    },
    saveBalanceUsdc: 0.00,
    moonBalanceUsdc: 0.00,
    moonCostBasisUsdc: 0.00,
    totalDepositedUsdc: 0.00,
    moonCapBps: 2000, // 20%
    isPaused: false,
    isGraduated: false,
    matchBalanceUsdc: 0.00,
    allocations: getBasketPresets(RPC_URL.includes('devnet'))[0].entries.map((e) => ({
      symbol: e.symbol,
      mint: e.mint,
      weightBps: e.weightBps,
      sharesOwned: 0,
      currentValueUsd: 0,
    })),
    decisions: [],
    requests: [],
    completedLessons: [],
    roundupTransactions: [],
  };
}

export const DEMO_VAULT: VaultState = {
  metadata: {
    vaultAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    nickname: 'Leo The Explorer',
    avatar: 'otter',
    ageBand: 'little',
    unlockDate: '2032-06-15T00:00:00.000Z',
    guardianWallet: 'demo-guardian',
    capabilityToken: 'demo',
    createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
  },
  saveBalanceUsdc: 185.5,
  moonBalanceUsdc: 38.75,
  moonCostBasisUsdc: 32.0,
  totalDepositedUsdc: 217.5,
  moonCapBps: 2000, // 20%
  isPaused: false,
  isGraduated: false,
  matchBalanceUsdc: 15.0,
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
  ],
  completedLessons: ['what-is-money', 'two-jars'],
  roundupTransactions: [],
};

export const CLEAN_EMPTY_VAULT: VaultState = createDefaultVaultState('demo-guardian', '');

/**
 * Retrieve stored vault for a specific guardian wallet or scan active vaults.
 * If guardianWallet is provided, strictly matches that wallet.
 * If omitted, checks for the last active guardian wallet or any stored vault.
 */
export function getStoredVault(guardianWallet?: string | null): VaultState | null {
  if (typeof window === 'undefined') return null;

  // 1. If a specific wallet is passed, retrieve its scoped state
  if (guardianWallet) {
    const rawScoped = localStorage.getItem(`${STORAGE_KEY}_${guardianWallet}`);
    if (rawScoped) {
      try {
        const parsed: VaultState = JSON.parse(rawScoped);
        if (parsed && parsed.metadata?.guardianWallet === guardianWallet) {
          if (Array.isArray(parsed.decisions)) {
            parsed.decisions = parsed.decisions.filter(
              (d) => d.vaultAddress === parsed.metadata.vaultAddress
            );
          }
          return parsed;
        }
      } catch {}
    }
    return null;
  }

  // 2. If no wallet is passed, try retrieving the last active guardian wallet
  const lastWallet = localStorage.getItem('moonjar_last_guardian_wallet');
  if (lastWallet) {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${lastWallet}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.metadata) return parsed;
      } catch {}
    }
  }

  // 3. Fallback: scan any localStorage key matching `${STORAGE_KEY}_`
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`${STORAGE_KEY}_`)) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.metadata) return parsed;
        } catch {}
      }
    }
  }

  return null;
}

/**
 * Retrieve a stored vault by its capabilityToken, or fallback to DEMO_VAULT.
 */
export function getStoredVaultByToken(token?: string | null): VaultState {
  if (typeof window === 'undefined') return DEMO_VAULT;
  if (!token || token === 'demo' || token === 'demo-token') {
    const active = getStoredVault();
    return active || DEMO_VAULT;
  }

  // 1. Check if token maps directly to a known guardian wallet
  const mappedWallet = localStorage.getItem(`moonjar_vault_token_${token}`);
  if (mappedWallet) {
    const v = getStoredVault(mappedWallet);
    if (v) return v;
  }

  // 2. Scan all stored vaults in localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`${STORAGE_KEY}_`)) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed: VaultState = JSON.parse(raw);
          if (parsed.metadata?.capabilityToken === token) {
            return parsed;
          }
        } catch {}
      }
    }
  }

  // 3. Fallback to any existing vault, or DEMO_VAULT
  const fallback = getStoredVault();
  return fallback || DEMO_VAULT;
}

/**
 * Retrieve existing vault or create a clean default scoped to the given guardian wallet.
 */
export function getOrCreateStoredVault(guardianWallet?: string | null, vaultAddress?: string): VaultState {
  if (!guardianWallet) {
    const anyStored = getStoredVault();
    if (anyStored) return anyStored;
    return DEMO_VAULT;
  }
  const existing = getStoredVault(guardianWallet);
  if (existing) return existing;
  const fresh = createDefaultVaultState(guardianWallet, vaultAddress);
  saveVault(fresh);
  return fresh;
}

/**
 * Save vault state strictly scoped to the guardian's wallet address.
 */
export function saveVault(state: VaultState): void {
  if (typeof window === 'undefined') return;
  const guardianWallet = state.metadata?.guardianWallet;
  if (!guardianWallet || guardianWallet === 'demo-guardian') return;

  // Filter decisions before persisting: strictly preserve ONLY decisions for this vault
  const cleanedState: VaultState = {
    ...state,
    decisions: (state.decisions || []).filter(
      (d) => d.vaultAddress === state.metadata.vaultAddress
    ),
  };

  localStorage.setItem(`${STORAGE_KEY}_${guardianWallet}`, JSON.stringify(cleanedState));
  if (state.metadata?.capabilityToken) {
    localStorage.setItem(`moonjar_vault_token_${state.metadata.capabilityToken}`, guardianWallet);
  }
  localStorage.setItem('moonjar_last_guardian_wallet', guardianWallet);
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Purge all decision logs for a specific guardian vault.
 */
export function clearStoredDecisions(guardianWallet: string): void {
  if (typeof window === 'undefined') return;
  const current = getStoredVault(guardianWallet);
  if (!current) return;
  const updated: VaultState = {
    ...current,
    decisions: [],
  };
  saveVault(updated);
}

/**
 * Reset vault state for a given guardian wallet.
 */
export function resetVault(guardianWallet?: string | null): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    if (guardianWallet) {
      localStorage.removeItem(`${STORAGE_KEY}_${guardianWallet}`);
    }
  }
}
