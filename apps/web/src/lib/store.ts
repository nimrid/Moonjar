'use client';

import { PublicKey } from '@solana/web3.js';
import {
  ChildVaultMetadata,
  BuyDecisionLog,
  KidRequest,
  BASKET_PRESETS,
} from '@moonjar/shared';
import { findVaultPda } from './vault-client/pda';

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
  roundupTransactions?: OnChainRoundupTx[];
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
    allocations: BASKET_PRESETS[0].entries.map((e) => ({
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

export const CLEAN_EMPTY_VAULT: VaultState = createDefaultVaultState('demo-guardian', '');

/**
 * Retrieve stored vault for a specific guardian wallet.
 * Strictly scoped to `moonjar_vault_state_<guardianWallet>` to prevent cross-wallet data leaks.
 */
export function getStoredVault(guardianWallet?: string | null): VaultState | null {
  if (typeof window === 'undefined') return null;

  // Proactively purge old unscoped global storage key to eliminate cross-wallet contamination
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}

  if (!guardianWallet) return null;

  const rawScoped = localStorage.getItem(`${STORAGE_KEY}_${guardianWallet}`);
  if (rawScoped) {
    try {
      const parsed: VaultState = JSON.parse(rawScoped);
      if (parsed && parsed.metadata?.guardianWallet === guardianWallet) {
        // Enforce that decisions strictly match this vault address
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

/**
 * Retrieve existing vault or create a clean default scoped to the given guardian wallet.
 */
export function getOrCreateStoredVault(guardianWallet?: string | null, vaultAddress?: string): VaultState {
  if (!guardianWallet) {
    return CLEAN_EMPTY_VAULT;
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
