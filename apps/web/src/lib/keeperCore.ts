import {
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  AddressLookupTableAccount,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotent,
} from '@solana/spl-token';
import {
  PRESTOCKS_LIST,
  PreStockToken,
  BuyDecisionLog,
  calculatePremiumPct,
  getPriceCheck,
  PRESTOCKS_DECIMALS,
  USDC_DECIMALS,
} from '@moonjar/shared';
import * as fs from 'fs';
import * as path from 'path';
import {
  PROGRAM_ID,
  MAINNET_USDC_MINT,
  fetchChildVault,
  createExecuteBuyInstruction,
} from './vault-client';
import { RPC_URL } from './onchain';

/** Fetch with a hard timeout. Throws if the request takes longer than `ms` milliseconds. */
async function fetchWithTimeout(url: string, options: RequestInit = {}, ms = 10_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function loadKeeperKeypair(): Keypair {
  if (process.env.KEEPER_PRIVATE_KEY) {
    try {
      const raw = JSON.parse(process.env.KEEPER_PRIVATE_KEY);
      return Keypair.fromSecretKey(new Uint8Array(raw));
    } catch {}
  }
  const defaultPath = path.join(process.env.HOME || '', '.config', 'solana', 'id.json');
  const keyPath = process.env.KEEPER_KEYPAIR_PATH || defaultPath;
  if (fs.existsSync(keyPath)) {
    const raw = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
    return Keypair.fromSecretKey(new Uint8Array(raw));
  }
  console.warn(`[keeperCore] ⚠️ No keypair file found at ${keyPath}, generating ephemeral keypair.`);
  return Keypair.generate();
}

export async function executeKeeperCycleForVault(
  vaultAddressStr: string,
  forceBuy: boolean = false
): Promise<{ success: boolean; decision: BuyDecisionLog; txSignature?: string; error?: string }> {
  let targetSymbol = 'PORTFOLIO';
  try {
    // M3: forceBuy is disallowed in production builds
    const effectiveForceBuy = forceBuy && process.env.NODE_ENV !== 'production';
    const vaultPda = new PublicKey(vaultAddressStr);
    const connection = new Connection(RPC_URL, 'confirmed');
    const keeper = loadKeeperKeypair();

    // Fetch Vault Account Data
    const vaultData = await fetchChildVault(connection, vaultPda);
    if (!vaultData) {
      throw new Error(`Vault ${vaultAddressStr} not found on cluster`);
    }

    if (vaultData.paused) {
      const decision: BuyDecisionLog = {
        id: `dec-${Date.now()}`,
        timestamp: new Date().toISOString(),
        vaultAddress: vaultPda.toBase58(),
        symbol: 'PORTFOLIO',
        action: 'SKIP',
        premiumPct: 0,
        machineReason: 'VAULT_PAUSED_BY_GUARDIAN',
        humanReasonKid: 'Pip is resting while your vault is paused.',
        humanReasonGuardian: 'Vault is paused by guardian. Automated buys are suspended.',
      };
      return { success: true, decision };
    }

    if (vaultData.graduated) {
      const decision: BuyDecisionLog = {
        id: `dec-${Date.now()}`,
        timestamp: new Date().toISOString(),
        vaultAddress: vaultPda.toBase58(),
        symbol: 'PORTFOLIO',
        action: 'SKIP',
        premiumPct: 0,
        machineReason: 'VAULT_GRADUATED',
        humanReasonKid: 'You graduated! You have full control of your coins.',
        humanReasonGuardian: 'Vault has graduated. Automated buys completed.',
      };
      return { success: true, decision };
    }

    // Check Save Jar USDC Balance
    const saveJarAta = getAssociatedTokenAddressSync(
      MAINNET_USDC_MINT,
      vaultPda,
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

    const moonCostBasisUsdc = Number(vaultData.moonCostBasis) / Math.pow(10, USDC_DECIMALS);
    const totalDepositedUsdc = Number(vaultData.totalDeposited) / Math.pow(10, USDC_DECIMALS);
    const moonCapBps = vaultData.moonCapBps;

    const maxAllowedMoon = (totalDepositedUsdc * moonCapBps) / 10000;
    const remainingCapHeadroom = maxAllowedMoon - moonCostBasisUsdc;

    if (remainingCapHeadroom <= 0) {
      const decision: BuyDecisionLog = {
        id: `dec-${Date.now()}`,
        timestamp: new Date().toISOString(),
        vaultAddress: vaultPda.toBase58(),
        symbol: 'PORTFOLIO',
        action: 'SKIP',
        premiumPct: 0,
        machineReason: `COST_BASIS_CAP_EXCEEDED (${moonCostBasisUsdc.toFixed(2)} >= ${maxAllowedMoon.toFixed(2)})`,
        humanReasonKid: 'Your Moon Jar is cozy and full! Pip is keeping coins safe in the Save Jar.',
        humanReasonGuardian: `Moon Jar cost basis reached guardian cap of ${moonCapBps / 100}%. Purchases blocked.`,
      };
      return { success: true, decision };
    }

    if (saveBalanceUsdc < 1.0) {
      const decision: BuyDecisionLog = {
        id: `dec-${Date.now()}`,
        timestamp: new Date().toISOString(),
        vaultAddress: vaultPda.toBase58(),
        symbol: 'PORTFOLIO',
        action: 'SKIP',
        premiumPct: 0,
        machineReason: `INSUFFICIENT_CASH ($${saveBalanceUsdc.toFixed(2)} < $1.00)`,
        humanReasonKid: 'Your Save Jar needs a few more coins before Pip can make the next purchase.',
        humanReasonGuardian: `Insufficient liquid USDC in Save Jar ($${saveBalanceUsdc.toFixed(2)}). Deposit funds to continue.`,
      };
      return { success: true, decision };
    }

    // Select candidate from basket
    const basketEntries = vaultData.basket.slice(0, vaultData.basketLen);
    if (basketEntries.length === 0) {
      throw new Error('Vault basket is empty');
    }

    const candidate = basketEntries[Math.floor(Math.random() * basketEntries.length)];
    const candidateMint: PublicKey = candidate.mint;

    // Fetch token metadata from prestocks
    let liveTokens: PreStockToken[] = PRESTOCKS_LIST;
    try {
      const res = await fetchWithTimeout('https://prestocks.com/api/prestocks');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) liveTokens = data;
      }
    } catch {}

    const tokenMeta =
      liveTokens.find((p) => p.contract_address === candidateMint.toBase58()) ||
      PRESTOCKS_LIST.find((p) => p.contract_address === candidateMint.toBase58());

    // L1: If the mint is unknown to both live and fallback lists, skip rather than
    // using stale hardcoded prices that could produce incorrect BUY/SKIP decisions.
    if (!tokenMeta) {
      return {
        success: true,
        decision: {
          id: `dec-${Date.now()}`,
          timestamp: new Date().toISOString(),
          vaultAddress: vaultPda.toBase58(),
          symbol: candidateMint.toBase58().slice(0, 8),
          action: 'SKIP' as const,
          premiumPct: 0,
          machineReason: `UNKNOWN_TOKEN (${candidateMint.toBase58()})`,
          humanReasonKid: 'Pip could not recognise this asset and is keeping your coins safe for now.',
          humanReasonGuardian: `Basket contains an unrecognised mint (${candidateMint.toBase58()}). Purchase skipped to avoid stale pricing.`,
        },
      };
    }

    targetSymbol = tokenMeta.symbol;

    const tradeAmountUsdc = Math.min(5.0, remainingCapHeadroom, saveBalanceUsdc);
    const tradeAmountLamports = Math.floor(tradeAmountUsdc * Math.pow(10, USDC_DECIMALS));

    // Fetch live Jupiter quote with direct routes (PDA has no intermediate token accounts)
    // and 200 bps (2%) slippage matching the on-chain vault max_slippage_bps
    const quoteUrl = `https://api.jup.ag/swap/v1/quote?inputMint=${MAINNET_USDC_MINT.toBase58()}&outputMint=${candidateMint.toBase58()}&amount=${tradeAmountLamports}&onlyDirectRoutes=true&slippageBps=200`;
    const quoteRes: any = await fetchWithTimeout(quoteUrl).then((r) => r.json());

    if (!quoteRes || !quoteRes.outAmount) {
      const decision: BuyDecisionLog = {
        id: `dec-${Date.now()}`,
        timestamp: new Date().toISOString(),
        vaultAddress: vaultPda.toBase58(),
        symbol: tokenMeta.symbol,
        action: 'SKIP',
        premiumPct: 0,
        machineReason: 'NO_JUPITER_SWAP_ROUTE',
        humanReasonKid: `Pip could not find a pathway to buy ${tokenMeta.name} today. We will try again soon!`,
        humanReasonGuardian: `Jupiter aggregator found no liquidity route for ${tokenMeta.symbol}. Purchase skipped.`,
      };
      return { success: true, decision };
    }

    // Calculate secondary execution price and valuation premium (9 decimals for PreStocks)
    const tokensOut = Number(quoteRes.outAmount) / Math.pow(10, PRESTOCKS_DECIMALS);
    const executionPrice = tradeAmountUsdc / tokensOut;
    const premium = calculatePremiumPct(executionPrice, tokenMeta.markPrice);
    const priceCheck = getPriceCheck(premium);

    if (priceCheck.skipCycle && !effectiveForceBuy) {
      const decision: BuyDecisionLog = {
        id: `dec-${Date.now()}`,
        timestamp: new Date().toISOString(),
        vaultAddress: vaultPda.toBase58(),
        symbol: tokenMeta.symbol,
        action: 'SKIP',
        premiumPct: Number(premium.toFixed(2)),
        machineReason: `PREMIUM_TOO_HIGH (${premium.toFixed(1)}% > 10.0%)`,
        humanReasonKid: `${tokenMeta.name} costs a bit too much today. Pip is keeping your coins safe and cozy in the Save Jar!`,
        humanReasonGuardian: `${tokenMeta.symbol} premium is ${premium.toFixed(1)}%, exceeding the 10.0% safety ceiling. Purchase deferred.`,
      };
      return { success: true, decision };
    }

    // Execute on-chain buy via Jupiter CPI
    const swapInsRes: any = await fetchWithTimeout(
      'https://api.jup.ag/swap/v1/swap-instructions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quoteRes,
          userPublicKey: vaultPda.toBase58(),
        }),
      }
    ).then((r) => r.json());

    const { swapInstruction, addressLookupTableAddresses } = swapInsRes;
    if (!swapInstruction) {
      throw new Error('Failed to obtain swapInstruction from Jupiter API');
    }

    const jupProgramId = new PublicKey(swapInstruction.programId);
    const cpiData = Buffer.from(swapInstruction.data, 'base64');

    const remainingAccounts = swapInstruction.accounts.map((acc: any) => ({
      pubkey: new PublicKey(acc.pubkey),
      isWritable: acc.isWritable,
      isSigner: false,
    }));

    // Ensure Moon Jar Token-2022 ATA exists
    const moonJarTokenAta = getAssociatedTokenAddressSync(
      candidateMint,
      vaultPda,
      true,
      TOKEN_2022_PROGRAM_ID
    );
    await createAssociatedTokenAccountIdempotent(
      connection,
      keeper,
      candidateMint,
      vaultPda,
      {},
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
      true
    );

    // Fetch address lookup table accounts to prevent transaction size overflow
    const lookupTableAccounts = await Promise.all(
      (addressLookupTableAddresses || []).map(async (address: string) => {
        const res = await connection.getAddressLookupTable(new PublicKey(address));
        return res.value;
      })
    ).then((tables) => tables.filter((t): t is AddressLookupTableAccount => t !== null));

    const instructions = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 }),
      createExecuteBuyInstruction({
        keeper: keeper.publicKey,
        vault: vaultPda,
        saveJarToken: saveJarAta,
        moonJarToken: moonJarTokenAta,
        usdcMint: MAINNET_USDC_MINT,
        mintOut: candidateMint,
        swapProgram: jupProgramId,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenOutProgram: TOKEN_2022_PROGRAM_ID,
        remainingAccounts,
        amountIn: BigInt(tradeAmountLamports),
        quotedOut: BigInt(quoteRes.outAmount),
        minOut: BigInt(quoteRes.otherAmountThreshold),
        cpiData,
      }),
    ];

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    const messageV0 = new TransactionMessage({
      payerKey: keeper.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message(lookupTableAccounts);

    const versionedTx = new VersionedTransaction(messageV0);
    versionedTx.sign([keeper]);

    const txSig = await connection.sendTransaction(versionedTx, {
      skipPreflight: false,
      maxRetries: 3,
    });
    await connection.confirmTransaction(
      {
        signature: txSig,
        blockhash,
        lastValidBlockHeight,
      },
      'confirmed'
    );

    const decision: BuyDecisionLog = {
      id: `dec-${Date.now()}`,
      timestamp: new Date().toISOString(),
      vaultAddress: vaultPda.toBase58(),
      symbol: tokenMeta.symbol,
      action: 'BUY',
      premiumPct: Number(premium.toFixed(2)),
      amountInUsdc: tradeAmountLamports,
      amountOutTokens: Number(quoteRes.outAmount),
      machineReason: `PREMIUM_ACCEPTABLE (${premium.toFixed(1)}% <= 10.0%)`,
      humanReasonKid: `Pip found a fair price for ${tokenMeta.name} and tucked a new piece into your Moon Jar!`,
      humanReasonGuardian: `Executed algorithmic purchase for ${tokenMeta.symbol} at ${premium.toFixed(1)}% premium. $${tradeAmountUsdc.toFixed(2)} allocated.`,
      txSignature: txSig,
    };

    return { success: true, decision, txSignature: txSig };
  } catch (err: any) {
    console.error('[keeperCore] Error running keeper cycle:', err);

    let machineReason = `ERROR: ${err.message}`;
    let humanReasonKid = 'Pip is taking a quick rest while the computer checks the network.';
    let humanReasonGuardian = `Keeper encountered an error: ${err.message}`;

    const errMsg = err?.message || String(err);
    if (errMsg.includes('0x1771') || errMsg.includes('6001')) {
      machineReason = 'JUPITER_SLIPPAGE_EXCEEDED (0x1771)';
      humanReasonKid = `Pip tried to buy a piece of ${targetSymbol}, but the price moved before the purchase finished. Your coins are safe in your Save Jar!`;
      humanReasonGuardian = `Jupiter swap simulation: Slippage tolerance exceeded (0x1771). Price moved beyond the allowed tolerance on DEX pools.`;
    } else if (errMsg.includes('0x1789') || errMsg.includes('6025')) {
      machineReason = 'JUPITER_INVALID_TOKEN_ACCOUNT (0x1789)';
      humanReasonKid = `Pip is preparing the token safe for ${targetSymbol}. We will try again next cycle!`;
      humanReasonGuardian = `Jupiter swap simulation: InvalidTokenAccount (0x1789). Token account configuration issue.`;
    } else if (errMsg.includes('0x1775') || errMsg.includes('CapExceeded')) {
      machineReason = 'MOON_CAP_EXCEEDED (0x1775)';
      humanReasonKid = 'Your Moon Jar is cozy and full! Pip is keeping coins safe in the Save Jar.';
      humanReasonGuardian = 'Moon Jar cost basis reached guardian cap. Further purchases blocked until cap adjusted or more funds deposited.';
    }

    return {
      success: false,
      decision: {
        id: `dec-${Date.now()}`,
        timestamp: new Date().toISOString(),
        vaultAddress: vaultAddressStr,
        symbol: targetSymbol,
        action: 'SKIP',
        premiumPct: 0,
        machineReason,
        humanReasonKid,
        humanReasonGuardian,
      },
      error: err.message,
    };
  }
}
