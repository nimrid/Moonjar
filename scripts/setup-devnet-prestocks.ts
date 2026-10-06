import {
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';
import vaultIdl from '../target/idl/vault.json';

const DEVNET_RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey(process.env.VAULT_PROGRAM_ID || '8Xi2Ty3i2VMsi4JauYrHoyyBcKoaBdMcLHEtZb6bHMno');
const MOCK_SWAP_PROGRAM_ID = new PublicKey('C8cAUowrquZVNxH8PpToSkzzr74fC7uorZ4VPzFgNLAE');
const DEVNET_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

const PRESTOCK_SYMBOLS = [
  { symbol: 'SPACEX', name: 'SpaceX' },
  { symbol: 'ANDURIL', name: 'Anduril' },
  { symbol: 'FIGUREAI', name: 'Figure AI' },
  { symbol: 'ANTHROPIC', name: 'Anthropic' },
  { symbol: 'OPENAI', name: 'OpenAI' },
  { symbol: 'KALSHI', name: 'Kalshi' },
  { symbol: 'POLYMARKET', name: 'Polymarket' },
];

function loadAdminKeypair(): Keypair {
  const defaultPath = path.join(process.env.HOME || '', '.config', 'solana', 'id.json');
  if (fs.existsSync(defaultPath)) {
    const raw = JSON.parse(fs.readFileSync(defaultPath, 'utf-8'));
    return Keypair.fromSecretKey(new Uint8Array(raw));
  }
  throw new Error(`Admin keypair not found at ${defaultPath}`);
}

function getOrCreateKeypair(keysDir: string, symbol: string): Keypair {
  const filePath = path.join(keysDir, `${symbol.toLowerCase()}.json`);
  if (fs.existsSync(filePath)) {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return Keypair.fromSecretKey(new Uint8Array(raw));
  }
  const keypair = Keypair.generate();
  fs.writeFileSync(filePath, JSON.stringify(Array.from(keypair.secretKey), null, 2));
  return keypair;
}

async function main() {
  console.log('======================================================');
  console.log('🚀 MoonJar Devnet Pre-IPO Stock Token Initializer');
  console.log(`RPC: ${DEVNET_RPC}`);

  const admin = loadAdminKeypair();
  console.log(`Admin Wallet: ${admin.publicKey.toBase58()}`);

  const connection = new Connection(DEVNET_RPC, 'confirmed');
  const balance = await connection.getBalance(admin.publicKey);
  console.log(`Admin Balance: ${(balance / 1e9).toFixed(4)} SOL`);

  if (balance < 0.5 * 1e9) {
    throw new Error('Insufficient SOL balance on admin keypair to create and fund mints');
  }

  const keysDir = path.join(__dirname, 'devnet-keys');
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }

  // Derive PDAs
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID);
  const [mockSwapPoolPda] = PublicKey.findProgramAddressSync([Buffer.from('mock_swap_pool')], MOCK_SWAP_PROGRAM_ID);
  console.log(`Config PDA:         ${configPda.toBase58()}`);
  console.log(`Mock Swap Pool PDA: ${mockSwapPoolPda.toBase58()}`);

  // Create or verify Devnet USDC account for mock swap pool
  try {
    const mockPoolUsdcAta = await getOrCreateAssociatedTokenAccount(
      connection,
      admin,
      DEVNET_USDC_MINT,
      mockSwapPoolPda,
      true
    );
    console.log(`Mock Pool USDC ATA: ${mockPoolUsdcAta.address.toBase58()}`);
  } catch (err: any) {
    console.warn('Note on Mock Pool USDC ATA:', err?.message || err);
  }

  const devnetMintAddresses: Record<string, string> = {};
  const allowedMintsList: PublicKey[] = [];

  for (const item of PRESTOCK_SYMBOLS) {
    const mintKeypair = getOrCreateKeypair(keysDir, item.symbol);
    const mintPubkey = mintKeypair.publicKey;
    devnetMintAddresses[item.symbol] = mintPubkey.toBase58();
    allowedMintsList.push(mintPubkey);

    console.log(`\n--- Setting up ${item.name} (${item.symbol}) ---`);
    console.log(`  Mint Address: ${mintPubkey.toBase58()}`);

    const info = await connection.getAccountInfo(mintPubkey);
    if (!info) {
      console.log(`  ⚡ Creating SPL Token mint (9 decimals)...`);
      await createMint(
        connection,
        admin,
        admin.publicKey,
        admin.publicKey,
        9,
        mintKeypair
      );
      console.log(`  ✅ Mint created.`);
    } else {
      console.log(`  ℹ️ Mint already exists on-chain.`);
    }

    // Admin ATA & initial mint
    const adminAta = await getOrCreateAssociatedTokenAccount(
      connection,
      admin,
      mintPubkey,
      admin.publicKey
    );
    console.log(`  Admin ATA: ${adminAta.address.toBase58()}`);

    if (adminAta.amount === BigInt(0)) {
      console.log(`  ⚡ Minting 100,000 ${item.symbol} to Admin...`);
      await mintTo(
        connection,
        admin,
        mintPubkey,
        adminAta.address,
        admin,
        BigInt(100_000) * BigInt(1e9)
      );
    }

    // Mock Swap Pool ATA & liquidity
    const poolAta = await getOrCreateAssociatedTokenAccount(
      connection,
      admin,
      mintPubkey,
      mockSwapPoolPda,
      true
    );
    console.log(`  Mock Pool ATA: ${poolAta.address.toBase58()}`);

    if (poolAta.amount < BigInt(10_000) * BigInt(1e9)) {
      console.log(`  ⚡ Minting 50,000 ${item.symbol} to Mock Swap Pool...`);
      await mintTo(
        connection,
        admin,
        mintPubkey,
        poolAta.address,
        admin,
        BigInt(50_000) * BigInt(1e9)
      );
      console.log(`  ✅ Mock Swap Pool funded with 50,000 ${item.symbol}!`);
    } else {
      console.log(`  ℹ️ Mock Swap Pool already funded.`);
    }
  }

  // Save mints JSON to packages/shared/src/devnet-prestocks.json
  const outputPath = path.join(__dirname, '..', 'packages', 'shared', 'src', 'devnet-prestocks.json');
  fs.writeFileSync(outputPath, JSON.stringify(devnetMintAddresses, null, 2));
  console.log(`\n💾 Saved Devnet PreStocks to ${outputPath}`);

  // Update vault program's allowed_mints on Devnet
  console.log('\n⚡ Updating MoonJar Vault Program allowed_mints on Devnet...');
  const wallet = new anchor.Wallet(admin);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const vaultProgram = new Program(vaultIdl as anchor.Idl, provider);

  const txSig = await vaultProgram.methods
    .updateAllowedMints(allowedMintsList)
    .accounts({
      admin: admin.publicKey,
      config: configPda,
    })
    .signers([admin])
    .rpc();

  console.log(`🎉 Vault Program allowed_mints successfully updated on Devnet!`);
  console.log(`Tx Signature: ${txSig}`);

  console.log('\n================ SUMMARY ================');
  console.table(
    PRESTOCK_SYMBOLS.map((s) => ({
      Symbol: s.symbol,
      Name: s.name,
      'Devnet Mint': devnetMintAddresses[s.symbol],
    }))
  );
}

main().catch((err) => {
  console.error('Execution error:', err);
  process.exit(1);
});
