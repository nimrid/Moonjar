import { PublicKey } from '@solana/web3.js';

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_VAULT_PROGRAM_ID || '8Xi2Ty3i2VMsi4JauYrHoyyBcKoaBdMcLHEtZb6bHMno'
);

export const MAINNET_USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT ||
  (process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet'
    ? '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
    : 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
);

export const MAX_BASKET_LEN = 8;

// Anchor 8-byte Account Discriminators
export const CHILD_VAULT_DISCRIMINATOR = new Uint8Array([
  99, 87, 164, 169, 137, 204, 197, 118,
]);

export const CONFIG_DISCRIMINATOR = new Uint8Array([
  155, 12, 170, 224, 30, 250, 204, 130,
]);

// Anchor 8-byte Instruction Discriminators
export const DEPOSIT_DISCRIMINATOR = new Uint8Array([
  242, 35, 198, 137, 82, 225, 242, 182,
]);

export const CREATE_VAULT_DISCRIMINATOR = new Uint8Array([
  29, 237, 247, 208, 193, 82, 54, 135,
]);

export const SET_PAUSED_DISCRIMINATOR = new Uint8Array([
  91, 60, 125, 192, 176, 225, 166, 218,
]);

export const SET_CAPS_DISCRIMINATOR = new Uint8Array([
  173, 204, 47, 125, 102, 192, 240, 161,
]);

export const SET_BASKET_DISCRIMINATOR = new Uint8Array([
  49, 237, 235, 34, 166, 154, 247, 29,
]);

export const APPLY_MATCH_DISCRIMINATOR = new Uint8Array([
  221, 64, 180, 139, 208, 19, 196, 223,
]);

export const EXECUTE_BUY_DISCRIMINATOR = new Uint8Array([
  14, 137, 248, 5, 172, 244, 183, 152,
]);
