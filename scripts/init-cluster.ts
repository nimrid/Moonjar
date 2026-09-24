import { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Program, BN } from '@coral-xyz/anchor';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';
import vaultIdl from '../target/idl/vault.json';

const RPC_URL = process.env.SOLANA_RPC_URL || 'http://127.0.0.1:8899';
const PROGRAM_ID = new PublicKey('hVSAPTYZCboWUcmzGcAJkC8jLSWcmJ4VtBjNpW4DmWT');
const MAINNET_USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

const ALLOWED_MINTS = [
  new PublicKey('PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh'), // SpaceX
  new PublicKey('PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB'), // Anduril
  new PublicKey('PreZad18qfPtbxNpMtMuAuX2zVpvkEU8DnJx56faCWd'), // Figure AI
  new PublicKey('Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw'), // Anthropic
  new PublicKey('PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF'), // OpenAI
  new PublicKey('PreLWGkkeqG1s4HEfFZSy9moCrJ7btsHuUtfcCeoRua'), // Kalshi
  new PublicKey('Pre8AREmFPtoJFT8mQSXQLh56cwJmM7CFDRuoGBZiUP'), // Polymarket
];

function loadAdminKeypair(): Keypair {
  const defaultPath = path.join(process.env.HOME || '', '.config', 'solana', 'id.json');
  if (fs.existsSync(defaultPath)) {
    const raw = JSON.parse(fs.readFileSync(defaultPath, 'utf-8'));
    return Keypair.fromSecretKey(new Uint8Array(raw));
  }
  throw new Error(`Admin keypair not found at ${defaultPath}`);
}

async function main() {
  console.log(`\n======================================================`);
  console.log(`🌙 Moonjar Cluster Config Initializer`);
  console.log(`Solana RPC: ${RPC_URL}`);

  const admin = loadAdminKeypair();
  console.log(`Admin / Keeper: ${admin.publicKey.toBase58()}`);

  const connection = new Connection(RPC_URL, 'confirmed');
  const wallet = new anchor.Wallet(admin);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const vaultProgram = new Program(vaultIdl as anchor.Idl, provider);

  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID);
  const [matchPoolPda] = PublicKey.findProgramAddressSync([Buffer.from('match_pool')], PROGRAM_ID);
  const matchPoolTokenAta = getAssociatedTokenAddressSync(MAINNET_USDC_MINT, matchPoolPda, true);

  console.log(`Config PDA:     ${configPda.toBase58()}`);
  console.log(`Match Pool PDA: ${matchPoolPda.toBase58()}`);

  const configInfo = await connection.getAccountInfo(configPda);
  if (configInfo) {
    console.log(`✅ Config already initialized on cluster.`);
    return;
  }

  console.log(`⚡ Initializing Global Config on-chain...`);
  const txSig = await vaultProgram.methods
    .initConfig(
      admin.publicKey, // Keeper authority
      200,             // 2% max slippage (200 bps)
      100,             // 1% match rate (100 bps)
      new BN(50_000_000), // $50 max match per vault (6 decimals)
      ALLOWED_MINTS
    )
    .accounts({
      admin: admin.publicKey,
      config: configPda,
      matchPool: matchPoolPda,
      matchPoolToken: matchPoolTokenAta,
      usdcMint: MAINNET_USDC_MINT,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([admin])
    .rpc();

  console.log(`🎉 Global Config successfully initialized! Tx: ${txSig}`);
}

main().catch((err) => {
  console.error('Initialization error:', err);
  process.exit(1);
});
