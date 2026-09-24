import { NextResponse } from 'next/server';
import {
  Connection,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotent,
} from '@solana/spl-token';
import { loadKeeperKeypair } from '@/lib/keeperCore';
import {
  MAINNET_USDC_MINT,
  RPC_URL,
} from '@/lib/onchain';
import { createDepositInstruction } from '@/lib/vault-client';
import { createRateLimiter } from '@/lib/rateLimiter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// L7: Max 10 deposits per minute per IP
const depositLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });

export async function POST(req: Request) {
  // L7: Rate-limit by forwarded IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rateResult = depositLimiter.check(ip);
  if (!rateResult.allowed) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded. Try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  // C2: Require keeper API secret header
  const authHeader = req.headers.get('x-keeper-secret');
  if (!authHeader || authHeader !== process.env.KEEPER_API_SECRET) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const vaultAddress = body.vaultAddress;
    const amountUsdc = Number(body.amountUsdc || 25);

    // L2: Always require an explicit vaultAddress — no silent fallback to first vault
    if (!vaultAddress) {
      return NextResponse.json(
        { success: false, error: 'vaultAddress is required' },
        { status: 400 }
      );
    }

    let vaultPda: PublicKey;
    try {
      vaultPda = new PublicKey(vaultAddress);
    } catch {
      return NextResponse.json(
        { success: false, error: `Invalid Solana vaultAddress: "${vaultAddress}"` },
        { status: 400 }
      );
    }

    const connection = new Connection(RPC_URL, 'confirmed');
    const payer = loadKeeperKeypair();

    const depositorAta = getAssociatedTokenAddressSync(
      MAINNET_USDC_MINT,
      payer.publicKey,
      true,
      TOKEN_PROGRAM_ID
    );
    await createAssociatedTokenAccountIdempotent(
      connection,
      payer,
      MAINNET_USDC_MINT,
      payer.publicKey,
      {},
      TOKEN_PROGRAM_ID
    );

    const amountLamports = Math.floor(amountUsdc * 1_000_000);

    // On local Surfpool, ensure payer ATA is funded with USDC
    try {
      await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'surfnet_setTokenAccount',
          params: [payer.publicKey.toBase58(), MAINNET_USDC_MINT.toBase58(), { amount: amountLamports * 2 }],
        }),
      });
    } catch {}

    const saveJarAta = getAssociatedTokenAddressSync(
      MAINNET_USDC_MINT,
      vaultPda,
      true,
      TOKEN_PROGRAM_ID
    );

    // Ensure Save Jar token account is initialized on-chain (allowOwnerOffCurve: true)
    await createAssociatedTokenAccountIdempotent(
      connection,
      payer,
      MAINNET_USDC_MINT,
      vaultPda,
      {},
      TOKEN_PROGRAM_ID,
      undefined,
      true
    );

    // Pure TransactionInstruction without Anchor runtime
    const depositIx = createDepositInstruction({
      depositor: payer.publicKey,
      vault: vaultPda,
      saveJarToken: saveJarAta,
      depositorToken: depositorAta,
      usdcMint: MAINNET_USDC_MINT,
      amount: BigInt(amountLamports),
    });

    const tx = new Transaction().add(depositIx);
    const txSig = await sendAndConfirmTransaction(connection, tx, [payer], {
      commitment: 'confirmed',
    });

    return NextResponse.json({
      success: true,
      amountUsdc,
      txSignature: txSig,
      vaultAddress: vaultPda.toBase58(),
    });
  } catch (err: any) {
    console.error('[API /api/deposit] Deposit error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Deposit failed',
      },
      { status: 500 }
    );
  }
}
