import { PublicKey } from '@solana/web3.js';

export interface BasketEntry {
  mint: PublicKey;
  weightBps: number;
}

export interface ChildVaultAccount {
  guardian: PublicKey;
  childAuthority: PublicKey | null;
  nicknameHash: Uint8Array;
  childIndex: bigint;
  unlockTs: bigint;
  moonCapBps: number;
  basket: BasketEntry[];
  basketLen: number;
  roundupThreshold: bigint;
  totalDeposited: bigint;
  moonCostBasis: bigint;
  matchReceived: bigint;
  paused: boolean;
  graduated: boolean;
  createdAt: bigint;
  bump: number;
}

export interface GlobalConfigAccount {
  admin: PublicKey;
  keeper: PublicKey;
  maxSlippageBps: number;
  matchBps: number;
  maxMatchPerVault: bigint;
  totalMatched: bigint;
  allowedMints: PublicKey[];
  allowedMintsLen: number;
  bump: number;
}

export interface CreateVaultParams {
  guardian: PublicKey;
  childIndex?: bigint | number;
  nicknameHash: Uint8Array | number[];
  unlockTs: bigint | number;
  moonCapBps: number;
  basket: Array<{ mint: PublicKey; weightBps: number }>;
  roundupThreshold?: bigint | number;
}

export interface DepositParams {
  depositor: PublicKey;
  vault: PublicKey;
  amount: bigint | number;
  memo?: Uint8Array | number[];
  saveJarToken?: PublicKey;
  depositorToken?: PublicKey;
  usdcMint?: PublicKey;
}

export interface SetPausedParams {
  guardian: PublicKey;
  vault: PublicKey;
  paused: boolean;
}

export interface SetCapsParams {
  guardian: PublicKey;
  vault: PublicKey;
  moonCapBps: number;
  roundupThreshold: bigint | number;
}

export interface SetBasketParams {
  guardian: PublicKey;
  vault: PublicKey;
  basket: Array<{ mint: PublicKey; weightBps: number }>;
}

export interface ExecuteBuyParams {
  keeper: PublicKey;
  vault: PublicKey;
  saveJarToken: PublicKey;
  moonJarToken: PublicKey;
  usdcMint?: PublicKey;
  mintOut: PublicKey;
  swapProgram: PublicKey;
  tokenProgram?: PublicKey;
  tokenOutProgram?: PublicKey;
  remainingAccounts?: Array<{ pubkey: PublicKey; isWritable: boolean; isSigner: boolean }>;
  amountIn: bigint | number;
  quotedOut: bigint | number;
  minOut: bigint | number;
  cpiData: Uint8Array | Buffer;
}
