import { Connection, PublicKey } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {
  PRESTOCKS_LIST,
  PreStockToken,
  USDC_DECIMALS,
  findPreStockToken,
} from '@moonjar/shared';
import { VaultState } from './store';
import {
  PROGRAM_ID,
  MAINNET_USDC_MINT,
  fetchChildVault,
  fetchAllChildVaults,
} from './vault-client';

export { PROGRAM_ID, MAINNET_USDC_MINT };

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8899';

// BUG FIX: derive active USDC mint from RPC URL so Save Jar ATA lookups use
// the correct address on each network. Devnet uses Circle's devnet USDC.
const DEVNET_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
export const ACTIVE_USDC_MINT: PublicKey = RPC_URL.includes('devnet')
  ? DEVNET_USDC_MINT
  : MAINNET_USDC_MINT;

export function getSolanaConnection(): Connection {
  return new Connection(RPC_URL, 'confirmed');
}

/**
 * Returns a human-readable network label based on the active RPC URL.
 * - localhost / 127.0.0.1 → "Surfpool Mainnet Fork"
 * - devnet              → "Solana Devnet"
 * - mainnet             → "Solana Mainnet"
 * - anything else       → the raw hostname
 */
export function getNetworkLabel(rpcUrl: string = RPC_URL): string {
  if (rpcUrl.includes('127.0.0.1') || rpcUrl.includes('localhost')) {
    return 'Surfpool Mainnet Fork';
  }
  if (rpcUrl.includes('devnet')) {
    return 'Solana Devnet';
  }
  if (rpcUrl.includes('mainnet')) {
    return 'Solana Mainnet';
  }
  try {
    return new URL(rpcUrl).hostname;
  } catch {
    return rpcUrl;
  }
}

export interface OnChainVaultSummary {
  address: string;
  guardian: string;
  totalDepositedUsdc: number;
  moonCostBasisUsdc: number;
  moonCapBps: number;
  paused: boolean;
  graduated: boolean;
  basketMints: string[];
}

/**
 * Fetch all child vaults registered on-chain without Anchor runtime
 */
export async function fetchAllOnChainVaults(): Promise<OnChainVaultSummary[]> {
  try {
    const connection = getSolanaConnection();
    const vaults = await fetchAllChildVaults(connection, PROGRAM_ID);

    return vaults.map((v) => {
      const data = v.account;
      return {
        address: v.publicKey.toBase58(),
        guardian: data.guardian.toBase58(),
        totalDepositedUsdc: Number(data.totalDeposited) / Math.pow(10, USDC_DECIMALS),
        moonCostBasisUsdc: Number(data.moonCostBasis) / Math.pow(10, USDC_DECIMALS),
        moonCapBps: data.moonCapBps,
        paused: data.paused,
        graduated: data.graduated,
        basketMints: data.basket.map((b) => b.mint.toBase58()),
      };
    });
  } catch (err) {
    console.warn('[onchain] Could not fetch all vaults from cluster:', err);
    return [];
  }
}

/**
 * Fetch full live on-chain state for a specific child vault PDA
 */
export async function fetchOnChainVaultState(
  vaultAddressStr: string,
  liveTokens: PreStockToken[] = PRESTOCKS_LIST
): Promise<Partial<VaultState> | null> {
  try {
    const vaultPubkey = new PublicKey(vaultAddressStr);
    const connection = getSolanaConnection();

    // 1. Fetch and decode ChildVault account via pure binary decoder
    const vaultAccount = await fetchChildVault(connection, vaultPubkey);
    if (!vaultAccount) return null;

    // 2. Fetch Save Jar (USDC) ATA
    // BUG FIX: use ACTIVE_USDC_MINT so the ATA address is correct on devnet
    const saveJarAta = getAssociatedTokenAddressSync(
      ACTIVE_USDC_MINT,
      vaultPubkey,
      true,
      TOKEN_PROGRAM_ID
    );
    let saveBalanceUsdc = 0;
    try {
      const bal = await connection.getTokenAccountBalance(saveJarAta);
      saveBalanceUsdc = bal.value.uiAmount || 0;
    } catch {
      saveBalanceUsdc = 0;
    }

    // 3. Fetch Moon Jar ATAs for basket assets (Token-2022 & legacy)
    const allocations: VaultState['allocations'] = [];
    let totalMoonValue = 0;

    for (const entry of vaultAccount.basket) {
      const mintPubkey = entry.mint;
      const mintStr = mintPubkey.toBase58();

      const tokenMeta = findPreStockToken(mintStr, liveTokens);

      const symbol = tokenMeta ? tokenMeta.symbol : mintStr.slice(0, 6);
      const price = tokenMeta ? tokenMeta.tokenPrice : 0;

      let shares = 0;
      // Try Token-2022 first (all PreStocks are Token-2022)
      try {
        const ata22 = getAssociatedTokenAddressSync(
          mintPubkey,
          vaultPubkey,
          true,
          TOKEN_2022_PROGRAM_ID
        );
        const bal = await connection.getTokenAccountBalance(ata22);
        shares = bal.value.uiAmount || 0;
      } catch {
        // Fallback to legacy Tokenkeg
        try {
          const ataLegacy = getAssociatedTokenAddressSync(
            mintPubkey,
            vaultPubkey,
            true,
            TOKEN_PROGRAM_ID
          );
          const bal = await connection.getTokenAccountBalance(ataLegacy);
          shares = bal.value.uiAmount || 0;
        } catch {
          shares = 0;
        }
      }

      const val = Number((shares * price).toFixed(2));
      totalMoonValue += val;

      allocations.push({
        symbol,
        mint: mintStr,
        weightBps: entry.weightBps,
        sharesOwned: Number(shares.toFixed(4)),
        currentValueUsd: val,
      });
    }

    const totalDeposited =
      Number(vaultAccount.totalDeposited) / Math.pow(10, USDC_DECIMALS);
    const moonCostBasis =
      Number(vaultAccount.moonCostBasis) / Math.pow(10, USDC_DECIMALS);
    const roundupThresholdUsdc =
      Number(vaultAccount.roundupThreshold) / Math.pow(10, USDC_DECIMALS);

    return {
      saveBalanceUsdc: Number(saveBalanceUsdc.toFixed(2)),
      moonBalanceUsdc: Number(totalMoonValue.toFixed(2)),
      moonCostBasisUsdc: Number(moonCostBasis.toFixed(2)),
      totalDepositedUsdc: Number(totalDeposited.toFixed(2)),
      moonCapBps: vaultAccount.moonCapBps,
      roundupThresholdUsdc: Number(roundupThresholdUsdc.toFixed(2)),
      isPaused: vaultAccount.paused,
      isGraduated: vaultAccount.graduated,
      allocations,
    };
  } catch (err) {
    console.warn('[onchain] Error fetching on-chain vault state:', err);
    return null;
  }
}
