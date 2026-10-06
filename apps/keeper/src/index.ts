import {
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  AddressLookupTableAccount,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Program, BN } from '@coral-xyz/anchor';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotent,
} from '@solana/spl-token';
import {
  PRESTOCKS_LIST,
  PreStockToken,
  PreStockTokenSchema,
  BuyDecisionLog,
  calculatePremiumPct,
  getPriceCheck,
  findPreStockToken,
} from '@moonjar/shared';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import vaultIdl from '../../../target/idl/vault.json';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/** Fetch with a hard timeout. Throws if the request takes longer than `ms` ms. */
async function fetchWithTimeout(url: string, options: RequestInit = {}, ms = 10_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const MAINNET_USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const DEVNET_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const MOCK_SWAP_PROGRAM_ID = new PublicKey('C8cAUowrquZVNxH8PpToSkzzr74fC7uorZ4VPzFgNLAE');

const RPC_URL = process.env.SOLANA_RPC_URL || 'http://127.0.0.1:8899';
const PROGRAM_ID = new PublicKey(process.env.VAULT_PROGRAM_ID || '8Xi2Ty3i2VMsi4JauYrHoyyBcKoaBdMcLHEtZb6bHMno');

const ACTIVE_USDC_MINT = RPC_URL.includes('devnet') ? DEVNET_USDC_MINT : MAINNET_USDC_MINT;

let liveTokens: PreStockToken[] = PRESTOCKS_LIST;

async function refreshLiveTokens() {
  try {
    const res = await fetchWithTimeout('https://prestocks.com/api/prestocks');
    if (res.ok) {
      const data: unknown = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // MINOR-2 FIX: validate each entry so a malformed API response can't
        // poison downstream price calculations with NaN / unexpected shapes.
        const validated = data.flatMap((item: unknown) => {
          const result = PreStockTokenSchema.safeParse(item);
          return result.success ? [result.data] : [];
        });
        if (validated.length > 0) {
          liveTokens = validated;
          console.log(`[Keeper] 📡 Synced ${liveTokens.length} live PreStocks from prestocks.com`);
        }
      }
    }
  } catch {
    console.warn(`[Keeper] ⚠️ Using fallback PRESTOCKS_LIST`);
  }
}

function loadKeeperKeypair(): Keypair {
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
  console.warn(`[Keeper] ⚠️ No keypair file found at ${keyPath}, generating ephemeral keypair.`);
  return Keypair.generate();
}

export async function evaluateOnChainVault(
  connection: Connection,
  vaultProgram: Program,
  keeper: Keypair,
  configPda: PublicKey,
  vaultPda: PublicKey,
  vaultData: any
): Promise<BuyDecisionLog | null> {
  const nickname = `ChildVault #${vaultData.childIndex.toString()}`;
  // MINOR-3 FIX: snapshot module-global liveTokens into a local const so that
  // a concurrent refreshLiveTokens() call can't mutate it mid-evaluation.
  const tokens = liveTokens;
  console.log(`\n======================================================`);
  console.log(`[Keeper] 🍯 Evaluating On-Chain Vault: ${vaultPda.toBase58().slice(0, 8)}... (${nickname})`);

  if (vaultData.paused) {
    console.log(`  ⏸️ Vault is currently paused by guardian. Skipping.`);
    return null;
  }
  if (vaultData.graduated) {
    console.log(`  🎓 Vault has graduated. Skipping.`);
    return null;
  }

  // 1. Fetch Save Jar Token Account Balance
  const saveJarAta = getAssociatedTokenAddressSync(ACTIVE_USDC_MINT, vaultPda, true, TOKEN_PROGRAM_ID);
  let saveBalanceUsdc = 0;
  try {
    const bal = await connection.getTokenAccountBalance(saveJarAta);
    saveBalanceUsdc = bal.value.uiAmount || 0;
  } catch {
    console.log(`  ℹ️ Save Jar account ${saveJarAta.toBase58().slice(0, 8)} not found or zero.`);
  }

  const moonCostBasisUsdc = vaultData.moonCostBasis.toNumber() / 1e6;
  const totalDepositedUsdc = vaultData.totalDeposited.toNumber() / 1e6;
  const moonCapBps = vaultData.moonCapBps;

  console.log(`  Save Balance: $${saveBalanceUsdc.toFixed(2)} | Moon Cost Basis: $${moonCostBasisUsdc.toFixed(2)} | Cap: ${moonCapBps / 100}%`);

  // 2. Check cost-basis cap headroom
  const maxAllowedMoon = (totalDepositedUsdc * moonCapBps) / 10000;
  const remainingCapHeadroom = maxAllowedMoon - moonCostBasisUsdc;

  console.log(`  Cap Ceiling: $${maxAllowedMoon.toFixed(2)} | Remaining Headroom: $${remainingCapHeadroom.toFixed(2)}`);

  if (remainingCapHeadroom <= 0) {
    console.log(`  🛑 Cap limit reached! Moon Jar cost basis is at maximum allowed percentage.`);
    return {
      id: `dec-${Date.now()}`,
      timestamp: new Date().toISOString(),
      vaultAddress: vaultPda.toBase58(),
      symbol: 'PORTFOLIO',
      action: 'SKIP',
      premiumPct: 0,
      machineReason: `COST_BASIS_CAP_EXCEEDED (${moonCostBasisUsdc.toFixed(2)} >= ${maxAllowedMoon.toFixed(2)})`,
      humanReasonKid: `Your Moon Jar is currently full! Pip is keeping all new coins safely in your Save Jar.`,
      humanReasonGuardian: `Moon Jar cost basis has reached the guardian limit of ${moonCapBps / 100}%. Purchases blocked.`,
    };
  }

  // 3. Select target asset from basket
  const basketEntries = vaultData.basket.slice(0, vaultData.basketLen);
  if (!basketEntries || basketEntries.length === 0) {
    console.log(`  ⚠️ Empty basket. Skipping.`);
    return null;
  }

  const candidate = basketEntries[Math.floor(Math.random() * basketEntries.length)];
  const candidateMint: PublicKey = candidate.mint;

  // Find token metadata via findPreStockToken (supports both devnet and mainnet mints)
  const tokenMeta = findPreStockToken(candidateMint.toBase58(), tokens);

  if (!tokenMeta) {
    console.log(`  ⚠️ Unknown mint ${candidateMint.toBase58().slice(0, 8)}... — skipping to avoid stale pricing.`);
    return null;
  }

  // 4. Query live Jupiter Quote
  const tradeAmountUsdc = Math.min(5.00, remainingCapHeadroom, saveBalanceUsdc);
  if (tradeAmountUsdc < 1.00) {
    console.log(`  ⚠️ Insufficient cash or headroom ($${tradeAmountUsdc.toFixed(2)} < $1.00). Skipping.`);
    return null;
  }

  const tradeAmountLamports = Math.floor(tradeAmountUsdc * 1_000_000);
  console.log(`  Querying Jupiter for $${tradeAmountUsdc.toFixed(2)} USDC -> ${tokenMeta.symbol}...`);

  const isDevnet = RPC_URL.includes('devnet');
  let quoteRes: any = null;
  let swapProgramId: PublicKey = MOCK_SWAP_PROGRAM_ID;
  let cpiData: Buffer = Buffer.alloc(0);
  let remainingAccounts: any[] = [];
  let lookupTableAccounts: AddressLookupTableAccount[] = [];

  // Ensure Moon Jar ATA exists (detect Token-2022 vs legacy Token program dynamically)
  const mintInfo = await connection.getAccountInfo(candidateMint);
  if (!mintInfo) {
    console.log(`  ⚠️ Mint ${candidateMint.toBase58().slice(0, 8)}... does not exist on this cluster. Skipping.`);
    return null;
  }
  const tokenOutProgram = mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;
  const moonJarTokenAta = getAssociatedTokenAddressSync(candidateMint, vaultPda, true, tokenOutProgram);
  await createAssociatedTokenAccountIdempotent(
    connection,
    keeper,
    candidateMint,
    vaultPda,
    {},
    tokenOutProgram,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    true
  );

  if (isDevnet) {
    console.log(`  [Devnet Mode] Simulating quote and routing through mock_swap program...`);
    const tokensOut = tradeAmountUsdc / tokenMeta.tokenPrice;
    const outAmountBase = Math.floor(tokensOut * 1e9);
    quoteRes = {
      outAmount: outAmountBase.toString(),
      otherAmountThreshold: Math.floor(outAmountBase * 0.98).toString(),
    };
    swapProgramId = MOCK_SWAP_PROGRAM_ID;

    const swapSighash = createHash('sha256').update('global:swap').digest().subarray(0, 8);
    cpiData = Buffer.concat([
      swapSighash,
      new BN(tradeAmountLamports).toArrayLike(Buffer, 'le', 8),
      new BN(outAmountBase).toArrayLike(Buffer, 'le', 8),
    ]);

    const [mockSwapPoolPda] = PublicKey.findProgramAddressSync([Buffer.from('mock_swap_pool')], MOCK_SWAP_PROGRAM_ID);
    const mockPoolUsdcAta = getAssociatedTokenAddressSync(DEVNET_USDC_MINT, mockSwapPoolPda, true);
    const mockPoolTokenAta = getAssociatedTokenAddressSync(candidateMint, mockSwapPoolPda, true);

    remainingAccounts = [
      { pubkey: vaultPda, isWritable: false, isSigner: false },
      { pubkey: saveJarAta, isWritable: true, isSigner: false },
      { pubkey: moonJarTokenAta, isWritable: true, isSigner: false },
      { pubkey: mockSwapPoolPda, isWritable: false, isSigner: false },
      { pubkey: mockPoolUsdcAta, isWritable: true, isSigner: false },
      { pubkey: mockPoolTokenAta, isWritable: true, isSigner: false },
      { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
    ];
  } else {
    try {
      const quoteUrl = `https://api.jup.ag/swap/v1/quote?inputMint=${MAINNET_USDC_MINT.toBase58()}&outputMint=${candidateMint.toBase58()}&amount=${tradeAmountLamports}&onlyDirectRoutes=true&slippageBps=200`;
      quoteRes = await fetchWithTimeout(quoteUrl).then((r) => r.json());
    } catch (err) {
      console.error(`  ❌ Failed to fetch quote from Jupiter API:`, err);
      return null;
    }

    if (!quoteRes || !quoteRes.outAmount) {
      console.log(`  ⚠️ No swap route available for ${tokenMeta.symbol}. Skipping.`);
      return null;
    }
  }

  // 5. Calculate Valuation & Premium
  const tokensOut = Number(quoteRes.outAmount) / 1e9;
  const executionPrice = tradeAmountUsdc / tokensOut;
  const premium = calculatePremiumPct(executionPrice, tokenMeta.markPrice);
  const priceCheck = getPriceCheck(premium);

  console.log(`  Target Asset: ${tokenMeta.name} (${tokenMeta.symbol})`);
  console.log(`  Execution Price: $${executionPrice.toFixed(2)} | Mark Price: $${tokenMeta.markPrice.toFixed(2)}`);
  console.log(`  Secondary Premium: ${premium.toFixed(2)}% (Max Safety Ceiling: 10.0%)`);

  // M3: forceBuy is disallowed in production to prevent accidental safety bypass
  const rawForceBuy = process.argv.includes('--force-buy') || process.env.FORCE_BUY === 'true';
  const effectiveForceBuy = rawForceBuy && process.env.NODE_ENV !== 'production';

  if (priceCheck.skipCycle && !effectiveForceBuy) {
    console.log(`  ❌ Price Check Failed: ${priceCheck.tag} - Premium ${premium.toFixed(2)}% > 10.0%`);
    return {
      id: `dec-${Date.now()}`,
      timestamp: new Date().toISOString(),
      vaultAddress: vaultPda.toBase58(),
      symbol: tokenMeta.symbol,
      action: 'SKIP',
      premiumPct: premium,
      machineReason: `PREMIUM_TOO_HIGH (${premium.toFixed(2)}% > 10.0%)`,
      humanReasonKid: `${tokenMeta.name} costs a bit too much today. Pip is keeping your coins safe and cozy in the Save Jar!`,
      humanReasonGuardian: `${tokenMeta.symbol} premium is ${premium.toFixed(2)}%, above the 10% safety ceiling. Purchase deferred.`,
    };
  }

  if (priceCheck.skipCycle && effectiveForceBuy) {
    console.log(`  ⚡ --force-buy flag detected: Overriding safety ceiling for test verification (${premium.toFixed(2)}%).`);
  }

  // 6. Execute On-Chain Buy via CPI
  console.log(`  ✅ Price Check Passed: ${priceCheck.tag}`);

  if (!isDevnet) {
    console.log(`  🚀 Fetching Jupiter swap instruction for execution...`);
    try {
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
        console.error(`  ❌ Failed to obtain swapInstruction from Jupiter.`);
        return null;
      }

      swapProgramId = new PublicKey(swapInstruction.programId);
      cpiData = Buffer.from(swapInstruction.data, 'base64');

      remainingAccounts = swapInstruction.accounts.map((acc: any) => ({
        pubkey: new PublicKey(acc.pubkey),
        isWritable: acc.isWritable,
        isSigner: false,
      }));

      lookupTableAccounts = await Promise.all(
        (addressLookupTableAddresses || []).map(async (address: string) => {
          const res = await connection.getAddressLookupTable(new PublicKey(address));
          return res.value;
        })
      ).then((tables) => tables.filter((t): t is AddressLookupTableAccount => t !== null));
    } catch (err) {
      console.error(`  ❌ Error obtaining Jupiter swap instruction:`, err);
      return null;
    }
  }

  try {
    console.log(`  Submitting on-chain execute_buy to MoonJar...`);
  const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 });
  const ix = await vaultProgram.methods
    .executeBuy(
      candidateMint,
      new BN(tradeAmountLamports),
      new BN(quoteRes.outAmount),
      new BN(quoteRes.otherAmountThreshold),
      cpiData
    )
    .accounts({
      keeper: keeper.publicKey,
      config: configPda,
      vault: vaultPda,
      saveJarToken: saveJarAta,
      moonJarToken: moonJarTokenAta,
      usdcMint: ACTIVE_USDC_MINT,
      mintOut: candidateMint,
      swapProgram: swapProgramId,
      tokenProgram: TOKEN_PROGRAM_ID,
      tokenOutProgram: tokenOutProgram,
    })
    .remainingAccounts(remainingAccounts)
    .instruction();

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    const messageV0 = new TransactionMessage({
      payerKey: keeper.publicKey,
      recentBlockhash: blockhash,
      instructions: [modifyComputeUnits, ix],
    }).compileToV0Message(lookupTableAccounts);

    const versionedTx = new VersionedTransaction(messageV0);
    versionedTx.sign([keeper]);

    const txSig = await connection.sendTransaction(versionedTx, { skipPreflight: false, maxRetries: 3 });
    await connection.confirmTransaction({ signature: txSig, blockhash, lastValidBlockHeight }, 'confirmed');

    console.log(`  🎉 Transaction Confirmed! Signature: ${txSig}`);

    return {
      id: `dec-${Date.now()}`,
      timestamp: new Date().toISOString(),
      vaultAddress: vaultPda.toBase58(),
      symbol: tokenMeta.symbol,
      action: 'BUY',
      premiumPct: premium,
      amountInUsdc: tradeAmountLamports,
      amountOutTokens: Number(quoteRes.outAmount),
      machineReason: `PREMIUM_ACCEPTABLE (${premium.toFixed(2)}% <= 10.0%)`,
      humanReasonKid: `Pip found a fair price for ${tokenMeta.name} and tucked a new piece into your Moon Jar!`,
      humanReasonGuardian: `Executed algorithmic purchase for ${tokenMeta.symbol} at ${premium.toFixed(2)}% premium. $${tradeAmountUsdc.toFixed(2)} allocated.`,
      txSignature: txSig,
    };
  } catch (err: any) {
    console.error(`  ❌ Failed to execute on-chain buy:`, err);
    return null;
  }
}

async function runKeeper() {
  const isOnce = process.argv.includes('--once');
  console.log(`\n======================================================`);
  console.log(`🌙 Moonjar Autonomous Valuation Keeper Service`);
  console.log(`Mode: ${isOnce ? 'One-Shot Execution' : 'Continuous Daemon (30s interval)'}`);
  console.log(`Solana RPC: ${RPC_URL}`);

  await refreshLiveTokens();

  const keeper = loadKeeperKeypair();
  console.log(`Keeper Authority: ${keeper.publicKey.toBase58()}`);

  const connection = new Connection(RPC_URL, 'confirmed');
  const wallet = new anchor.Wallet(keeper);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const vaultProgram = new Program(vaultIdl as anchor.Idl, provider);

  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID);

  const scan = async () => {
    try {
      // 1. Fetch all on-chain child vaults
      const vaults = await (vaultProgram.account as any).childVault.all();
      console.log(`\n[Keeper] 🔍 Scanned cluster: Found ${vaults.length} on-chain vault(s).`);

      if (vaults.length === 0) {
        console.log(`[Keeper] ℹ️ No on-chain vaults found on ${RPC_URL}. Waiting for guardian onboarding.`);
        return;
      }

      for (const v of vaults) {
        await evaluateOnChainVault(
          connection,
          vaultProgram,
          keeper,
          configPda,
          v.publicKey,
          v.account
        );
      }
    } catch (err) {
      console.error('[Keeper Scan Error]', err);
    }
  };

  await scan();

  if (!isOnce) {
    console.log(`\n[Keeper] Continuous evaluation active. Polling every 30 seconds...`);
    setInterval(scan, 30000);
  }
}

if (require.main === module) {
  runKeeper().catch((err) => {
    console.error('[Keeper Fatal Error]', err);
    process.exit(1);
  });
}
