import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PROGRAM_ID, MAINNET_USDC_MINT } from './constants';

export function u64ToLeBytes(value: bigint | number): Uint8Array {
  const big = typeof value === 'bigint' ? value : BigInt(value);
  const buf = new Uint8Array(8);
  const view = new DataView(buf.buffer);
  view.setBigUint64(0, big, true); // true = little-endian
  return buf;
}

export function findVaultPda(
  guardian: PublicKey,
  childIndex: bigint | number = 0n,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const childIndexBytes = u64ToLeBytes(childIndex);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), guardian.toBuffer(), childIndexBytes],
    programId
  );
}

export function findConfigPda(programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('config')], programId);
}

export function findMatchPoolPda(programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('match_pool')], programId);
}

export function findSaveJarAta(
  vaultPda: PublicKey,
  usdcMint: PublicKey = MAINNET_USDC_MINT
): PublicKey {
  return getAssociatedTokenAddressSync(usdcMint, vaultPda, true, TOKEN_PROGRAM_ID);
}
