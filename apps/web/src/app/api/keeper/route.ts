import { NextResponse } from 'next/server';
import { executeKeeperCycleForVault } from '@/lib/keeperCore';
import { PublicKey } from '@solana/web3.js';
import { createRateLimiter } from '@/lib/rateLimiter';

// Force Node.js runtime — keeperCore uses `fs` and `path`
export const runtime = 'nodejs';

// L7: Max 30 keeper evaluations per minute per IP
const keeperLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30 });

export async function POST(req: Request) {
  // L7: Rate-limit by forwarded IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rateResult = keeperLimiter.check(ip);
  if (!rateResult.allowed) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded. Try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  // C2: Require keeper API secret header to prevent unauthenticated trigger
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
    const forceBuy = Boolean(body.forceBuy);

    if (!vaultAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'vaultAddress is required for keeper evaluation',
        },
        { status: 400 }
      );
    }

    try {
      new PublicKey(vaultAddress);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid Solana vaultAddress: "${vaultAddress}"`,
        },
        { status: 400 }
      );
    }

    console.log(`[API /api/keeper] Triggering keeper evaluation for vault ${vaultAddress} (forceBuy=${forceBuy})...`);
    const result = await executeKeeperCycleForVault(vaultAddress, forceBuy);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /api/keeper] Internal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Keeper evaluation failed',
      },
      { status: 500 }
    );
  }
}
