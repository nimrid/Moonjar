import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Program, BN } from '@coral-xyz/anchor';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  getAccount,
} from '@solana/spl-token';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import vaultIdl from '../target/idl/vault.json';
import devnetMints from '../packages/shared/src/devnet-prestocks.json';

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey(process.env.VAULT_PROGRAM_ID || '8Xi2Ty3i2VMsi4JauYrHoyyBcKoaBdMcLHEtZb6bHMno');
const MOCK_SWAP_PROGRAM_ID = new PublicKey('C8cAUowrquZVNxH8PpToSkzzr74fC7uorZ4VPzFgNLAE');
const DEVNET_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

function loadAdminKeypair(): Keypair {
  const defaultPath = path.join(process.env.HOME || '', '.config', 'solana', 'id.json');
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(defaultPath, 'utf-8'))));
}

async function main() {
  console.log('======================================================');
  console.log('🧪 MoonJar Devnet End-to-End Vault & PreStock Trade Test');
  console.log(`RPC: ${RPC_URL}`);

  const admin = loadAdminKeypair();
  const connection = new Connection(RPC_URL, 'confirmed');
  const wallet = new anchor.Wallet(admin);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const vaultProgram = new Program(vaultIdl as anchor.Idl, provider);

  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID);
  const [mockSwapPoolPda] = PublicKey.findProgramAddressSync([Buffer.from('mock_swap_pool')], MOCK_SWAP_PROGRAM_ID);

  const childIndex = new BN(1);
  const nickname = 'Luna Devnet Test';
  const nicknameHash = createHash('sha256').update(nickname).digest();

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), admin.publicKey.toBuffer(), childIndex.toArrayLike(Buffer, 'le', 8)],
    PROGRAM_ID
  );

  console.log(`Guardian:    ${admin.publicKey.toBase58()}`);
  console.log(`Vault PDA:   ${vaultPda.toBase58()}`);

  const spacexMint = new PublicKey(devnetMints.SPACEX);
  const openaiMint = new PublicKey(devnetMints.OPENAI);

  // 1. Check or Create Vault PDA
  const vaultInfo = await connection.getAccountInfo(vaultPda);
  if (!vaultInfo) {
    console.log('\n⚡ Creating Child Vault on Devnet...');
    const basket = [
      { mint: spacexMint, weightBps: 5000 },
      { mint: openaiMint, weightBps: 5000 },
    ];
    const unlockTs = new BN(Math.floor(Date.now() / 1000) + 365 * 24 * 3600); // 1 year
    const moonCapBps = 5000; // 50%
    const roundupThreshold = new BN(5_000_000); // $5.00

    const saveJarAta = getAssociatedTokenAddressSync(DEVNET_USDC_MINT, vaultPda, true);

    const tx = await vaultProgram.methods
      .createVault(childIndex, Array.from(nicknameHash), unlockTs, moonCapBps, basket, roundupThreshold)
      .accounts({
        guardian: admin.publicKey,
        config: configPda,
        vault: vaultPda,
        saveJarToken: saveJarAta,
        usdcMint: DEVNET_USDC_MINT,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([admin])
      .rpc();

    console.log(`✅ Child Vault created! Tx: ${tx}`);
  } else {
    console.log('✅ Child Vault already exists on Devnet.');
  }

  // 2. Deposit 5 USDC into Save Jar if balance < $5
  const saveJarAta = getAssociatedTokenAddressSync(DEVNET_USDC_MINT, vaultPda, true);
  const guardianUsdcAta = await getOrCreateAssociatedTokenAccount(connection, admin, DEVNET_USDC_MINT, admin.publicKey);

  let currentSaveBalance = 0;
  try {
    const bal = await connection.getTokenAccountBalance(saveJarAta);
    currentSaveBalance = bal.value.uiAmount || 0;
  } catch {}

  console.log(`Save Jar USDC Balance: $${currentSaveBalance}`);

  if (currentSaveBalance < 5.0) {
    console.log('⚡ Depositing 5 USDC into Save Jar...');
    const depositAmount = new BN(5_000_000); // 5 USDC
    const memo = new Uint8Array(32);
    memo.set(Buffer.from('Test Devnet PreStock Buy'));

    const tx = await vaultProgram.methods
      .deposit(depositAmount, Array.from(memo))
      .accounts({
        guardian: admin.publicKey,
        config: configPda,
        vault: vaultPda,
        saveJarToken: saveJarAta,
        depositorToken: guardianUsdcAta.address,
        usdcMint: DEVNET_USDC_MINT,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([admin])
      .rpc();
    console.log(`✅ Deposited 5 USDC! Tx: ${tx}`);
  }

  // 3. Prepare Mock Swap CPI for 2 USDC -> SpaceX
  const targetMint = spacexMint;
  const amountIn = new BN(2_000_000); // $2.00 USDC
  // Assume SpaceX price is ~$116.30 -> $2 buys ~0.0171969 SPACEX (17,196,904 base units with 9 decimals)
  const amountOut = new BN(17_196_904);
  const quotedOut = amountOut;
  const minOut = amountOut.muln(98).divn(100); // 2% slippage

  console.log(`\n⚡ Executing on-chain buy: $2.00 USDC -> ~0.0172 SPACEX on Devnet...`);

  // Ensure Moon Jar ATA exists for SpaceX
  const moonJarSpacexAta = await getOrCreateAssociatedTokenAccount(
    connection,
    admin,
    targetMint,
    vaultPda,
    true
  );

  const mockPoolUsdcAta = getAssociatedTokenAddressSync(DEVNET_USDC_MINT, mockSwapPoolPda, true);
  const mockPoolSpacexAta = getAssociatedTokenAddressSync(targetMint, mockSwapPoolPda, true);

  // Mock swap CPI instruction data: sighash("swap") + amountIn (u64) + amountOut (u64)
  const swapSighash = createHash('sha256').update('global:swap').digest().subarray(0, 8);
  const cpiData = Buffer.concat([
    swapSighash,
    amountIn.toArrayLike(Buffer, 'le', 8),
    amountOut.toArrayLike(Buffer, 'le', 8),
  ]);

  const remainingAccounts = [
    { pubkey: vaultPda, isWritable: false, isSigner: false },
    { pubkey: saveJarAta, isWritable: true, isSigner: false },
    { pubkey: moonJarSpacexAta.address, isWritable: true, isSigner: false },
    { pubkey: mockSwapPoolPda, isWritable: false, isSigner: false },
    { pubkey: mockPoolUsdcAta, isWritable: true, isSigner: false },
    { pubkey: mockPoolSpacexAta, isWritable: true, isSigner: false },
    { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
  ];

  const buyTx = await vaultProgram.methods
    .executeBuy(
      targetMint,
      amountIn,
      quotedOut,
      minOut,
      cpiData
    )
    .accounts({
      keeper: admin.publicKey,
      config: configPda,
      vault: vaultPda,
      saveJarToken: saveJarAta,
      moonJarToken: moonJarSpacexAta.address,
      usdcMint: DEVNET_USDC_MINT,
      mintOut: targetMint,
      swapProgram: MOCK_SWAP_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      tokenOutProgram: TOKEN_PROGRAM_ID,
    })
    .remainingAccounts(remainingAccounts)
    .signers([admin])
    .rpc();

  console.log(`🎉 On-Chain executeBuy succeeded on Devnet! Tx: ${buyTx}`);

  // 4. Verify balances
  const updatedMoonJar = await getAccount(connection, moonJarSpacexAta.address);
  const updatedSaveJar = await getAccount(connection, saveJarAta);

  console.log('\n================ POST-TRADE BALANCES ================');
  console.log(`Save Jar Balance: $${(Number(updatedSaveJar.amount) / 1e6).toFixed(2)} USDC`);
  console.log(`Moon Jar Balance: ${(Number(updatedMoonJar.amount) / 1e9).toFixed(6)} SPACEX Tokens! 🚀`);
}

main().catch((err) => {
  console.error('Error executing trade test:', err);
  process.exit(1);
});
