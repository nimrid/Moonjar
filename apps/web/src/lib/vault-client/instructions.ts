import {
  TransactionInstruction,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {
  PROGRAM_ID,
  MAINNET_USDC_MINT,
  DEPOSIT_DISCRIMINATOR,
  CREATE_VAULT_DISCRIMINATOR,
  SET_PAUSED_DISCRIMINATOR,
  SET_CAPS_DISCRIMINATOR,
  SET_BASKET_DISCRIMINATOR,
  EXECUTE_BUY_DISCRIMINATOR,
} from './constants';
import { findVaultPda, findConfigPda, findSaveJarAta, u64ToLeBytes } from './pda';
import {
  DepositParams,
  CreateVaultParams,
  SetPausedParams,
  SetCapsParams,
  SetBasketParams,
  ExecuteBuyParams,
} from './types';

function u16ToLeBytes(val: number): Uint8Array {
  const buf = new Uint8Array(2);
  new DataView(buf.buffer).setUint16(0, val, true);
  return buf;
}

function u32ToLeBytes(val: number): Uint8Array {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setUint32(0, val, true);
  return buf;
}

function i64ToLeBytes(val: bigint | number): Uint8Array {
  const big = typeof val === 'bigint' ? val : BigInt(val);
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigInt64(0, big, true);
  return buf;
}

/**
 * Creates an Anchor `deposit` instruction without using runtime Anchor SDK
 */
export function createDepositInstruction(params: DepositParams): TransactionInstruction {
  const usdcMint = params.usdcMint || MAINNET_USDC_MINT;
  const saveJarToken = params.saveJarToken || findSaveJarAta(params.vault, usdcMint);
  const depositorToken =
    params.depositorToken ||
    getAssociatedTokenAddressSync(usdcMint, params.depositor, true, TOKEN_PROGRAM_ID);

  const memoBytes = new Uint8Array(32);
  if (params.memo) {
    const src = new Uint8Array(params.memo);
    memoBytes.set(src.subarray(0, 32));
  }

  const amountBytes = u64ToLeBytes(params.amount);

  // Layout: Discriminator (8) + amount (8) + memo (32) = 48 bytes
  const data = new Uint8Array(48);
  data.set(DEPOSIT_DISCRIMINATOR, 0);
  data.set(amountBytes, 8);
  data.set(memoBytes, 16);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: params.depositor, isSigner: true, isWritable: true },
      { pubkey: params.vault, isSigner: false, isWritable: true },
      { pubkey: saveJarToken, isSigner: false, isWritable: true },
      { pubkey: depositorToken, isSigner: false, isWritable: true },
      { pubkey: usdcMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

/**
 * Creates an Anchor `create_vault` instruction
 */
export function createCreateVaultInstruction(params: CreateVaultParams): TransactionInstruction {
  const childIndex = params.childIndex ?? 0n;
  const [vaultPda] = findVaultPda(params.guardian, childIndex);
  const [configPda] = findConfigPda();
  const saveJarToken = findSaveJarAta(vaultPda, MAINNET_USDC_MINT);

  // Data serialization:
  // Discriminator (8) + child_index (8) + nickname_hash (32) + unlock_ts (8) + moon_cap_bps (2) + basket vec (4 + n * 34) + roundup_threshold (8)
  const nicknameHashBytes = new Uint8Array(32);
  nicknameHashBytes.set(new Uint8Array(params.nicknameHash).subarray(0, 32));

  const basketCount = params.basket.length;
  const basketBytes = new Uint8Array(4 + basketCount * 34);
  basketBytes.set(u32ToLeBytes(basketCount), 0);
  let offset = 4;
  for (const entry of params.basket) {
    basketBytes.set(entry.mint.toBytes(), offset);
    basketBytes.set(u16ToLeBytes(entry.weightBps), offset + 32);
    offset += 34;
  }

  const roundupBytes = u64ToLeBytes(params.roundupThreshold ?? 0n);

  const parts = [
    CREATE_VAULT_DISCRIMINATOR,
    u64ToLeBytes(childIndex),
    nicknameHashBytes,
    i64ToLeBytes(params.unlockTs),
    u16ToLeBytes(params.moonCapBps),
    basketBytes,
    roundupBytes,
  ];

  const totalLength = parts.reduce((acc, p) => acc + p.length, 0);
  const data = new Uint8Array(totalLength);
  let cur = 0;
  for (const part of parts) {
    data.set(part, cur);
    cur += part.length;
  }

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: params.guardian, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: saveJarToken, isSigner: false, isWritable: true },
      { pubkey: MAINNET_USDC_MINT, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

/**
 * Creates an Anchor `set_paused` instruction
 */
export function createSetPausedInstruction(params: SetPausedParams): TransactionInstruction {
  const [configPda] = findConfigPda();
  const data = new Uint8Array(9);
  data.set(SET_PAUSED_DISCRIMINATOR, 0);
  data[8] = params.paused ? 1 : 0;

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: params.guardian, isSigner: true, isWritable: false },
      { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: params.vault, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(data),
  });
}

/**
 * Creates an Anchor `set_caps` instruction
 */
export function createSetCapsInstruction(params: SetCapsParams): TransactionInstruction {
  const [configPda] = findConfigPda();
  const data = new Uint8Array(18);
  data.set(SET_CAPS_DISCRIMINATOR, 0);
  data.set(u16ToLeBytes(params.moonCapBps), 8);
  data.set(u64ToLeBytes(params.roundupThreshold), 10);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: params.guardian, isSigner: true, isWritable: false },
      { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: params.vault, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(data),
  });
}

/**
 * Creates an Anchor `set_basket` instruction
 */
export function createSetBasketInstruction(params: SetBasketParams): TransactionInstruction {
  const [configPda] = findConfigPda();

  const basketCount = params.basket.length;
  const basketBytes = new Uint8Array(4 + basketCount * 34);
  basketBytes.set(u32ToLeBytes(basketCount), 0);
  let offset = 4;
  for (const entry of params.basket) {
    basketBytes.set(entry.mint.toBytes(), offset);
    basketBytes.set(u16ToLeBytes(entry.weightBps), offset + 32);
    offset += 34;
  }

  const data = new Uint8Array(8 + basketBytes.length);
  data.set(SET_BASKET_DISCRIMINATOR, 0);
  data.set(basketBytes, 8);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: params.guardian, isSigner: true, isWritable: false },
      { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: params.vault, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(data),
  });
}

/**
 * Creates an Anchor `execute_buy` instruction for the keeper cycle
 */
export function createExecuteBuyInstruction(params: ExecuteBuyParams): TransactionInstruction {
  const [configPda] = findConfigPda();
  const usdcMint = params.usdcMint || MAINNET_USDC_MINT;
  const tokenProgram = params.tokenProgram || TOKEN_PROGRAM_ID;
  const tokenOutProgram = params.tokenOutProgram || TOKEN_2022_PROGRAM_ID;

  const cpiBytes = new Uint8Array(params.cpiData);
  const data = new Uint8Array(68 + cpiBytes.length);

  // Layout:
  // Discriminator (8)
  // mint_out (32)
  // amount_in (8)
  // quoted_out (8)
  // min_out (8)
  // cpi_data: length (4) + bytes
  data.set(EXECUTE_BUY_DISCRIMINATOR, 0);
  data.set(params.mintOut.toBytes(), 8);
  data.set(u64ToLeBytes(params.amountIn), 40);
  data.set(u64ToLeBytes(params.quotedOut), 48);
  data.set(u64ToLeBytes(params.minOut), 56);
  data.set(u32ToLeBytes(cpiBytes.length), 64);
  data.set(cpiBytes, 68);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: params.keeper, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: params.vault, isSigner: false, isWritable: true },
      { pubkey: params.saveJarToken, isSigner: false, isWritable: true },
      { pubkey: params.moonJarToken, isSigner: false, isWritable: true },
      { pubkey: usdcMint, isSigner: false, isWritable: false },
      { pubkey: params.mintOut, isSigner: false, isWritable: false },
      { pubkey: params.swapProgram, isSigner: false, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: tokenOutProgram, isSigner: false, isWritable: false },
      ...(params.remainingAccounts || []),
    ],
    data: Buffer.from(data),
  });
}
