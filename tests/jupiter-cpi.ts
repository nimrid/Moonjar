import * as anchor from '@coral-xyz/anchor';
import { Program, BN } from '@coral-xyz/anchor';
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotent,
  getAccount,
} from '@solana/spl-token';
import { expect } from 'chai';
import { createHash } from 'crypto';
import vaultIdl from '../target/idl/vault.json';

// Real Mainnet PublicKeys
const MAINNET_USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const MAINNET_SPACEX_MINT = new PublicKey('PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh'); // Token-2022
const JUPITER_V6_PROGRAM_ID = new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4');

describe('Milestone 1: Live Jupiter CPI Swap Against Mainnet PreStocks (Surfpool)', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const vaultProgram = new Program(vaultIdl as anchor.Idl, provider);
  const connection = provider.connection;
  const admin = (provider.wallet as anchor.Wallet).payer;
  const guardian = Keypair.generate();

  const childIndex = new BN(1);
  const nickname = 'Luna PreStocks Explorer';
  const nicknameHash = createHash('sha256').update(nickname).digest();

  let configPda: PublicKey;
  let vaultPda: PublicKey;
  let saveJarAta: PublicKey;
  let moonJarSpacexAta: PublicKey;
  let guardianUsdcAta: PublicKey;

  before(async () => {
    console.log('\n======================================================');
    console.log('🚀 Setting up Milestone 1 Live Jupiter CPI Test');
    console.log('  RPC Endpoint:', connection.rpcEndpoint);
    console.log('  Admin / Keeper:', admin.publicKey.toBase58());
    console.log('  Guardian:', guardian.publicKey.toBase58());

    // 1. Airdrop SOL to Guardian
    const airdropSig = await connection.requestAirdrop(guardian.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);
    await connection.confirmTransaction(airdropSig);

    // 2. Derive PDAs
    [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], vaultProgram.programId);
    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), guardian.publicKey.toBuffer(), childIndex.toArrayLike(Buffer, 'le', 8)],
      vaultProgram.programId
    );

    saveJarAta = getAssociatedTokenAddressSync(MAINNET_USDC_MINT, vaultPda, true, TOKEN_PROGRAM_ID);
    moonJarSpacexAta = getAssociatedTokenAddressSync(MAINNET_SPACEX_MINT, vaultPda, true, TOKEN_2022_PROGRAM_ID);
    guardianUsdcAta = getAssociatedTokenAddressSync(MAINNET_USDC_MINT, guardian.publicKey, false, TOKEN_PROGRAM_ID);

    console.log('  Config PDA:', configPda.toBase58());
    console.log('  Vault PDA:', vaultPda.toBase58());
    console.log('  Save Jar (USDC):', saveJarAta.toBase58());
    console.log('  Moon Jar (SpaceX Token-2022):', moonJarSpacexAta.toBase58());

    // 3. Fund Guardian ATA with $500 USDC using Surfpool cheatcode
    console.log('  Funding Guardian with $500 Circle USDC via Surfpool cheatcode...');
    const setTokenRes = await fetch('http://127.0.0.1:8899', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'surfnet_setTokenAccount',
        params: [
          guardian.publicKey.toBase58(),
          MAINNET_USDC_MINT.toBase58(),
          { amount: 500_000_000 }, // $500 USDC
        ],
      }),
    }).then((r) => r.json());

    // Verify guardian USDC balance
    const guardianBalance = await connection.getTokenAccountBalance(guardianUsdcAta);
    console.log('  Guardian USDC Balance:', guardianBalance.value.uiAmountString, 'USDC');
    expect(Number(guardianBalance.value.amount)).to.equal(500_000_000);

    // 4. Initialize Config if needed
    const configInfo = await connection.getAccountInfo(configPda);
    if (!configInfo) {
      console.log('  Initializing Global Config with SpaceX allowed mint and Circle USDC...');
      const [matchPoolPda] = PublicKey.findProgramAddressSync([Buffer.from('match_pool')], vaultProgram.programId);
      await vaultProgram.methods
        .initConfig(
          admin.publicKey, // Keeper
          200, // 2% max slippage
          100, // 1% match
          new BN(50_000_000), // $50 max match per vault
          [MAINNET_SPACEX_MINT]
        )
        .accounts({
          admin: admin.publicKey,
          config: configPda,
          matchPool: matchPoolPda,
          matchPoolToken: getAssociatedTokenAddressSync(MAINNET_USDC_MINT, matchPoolPda, true),
          usdcMint: MAINNET_USDC_MINT,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([admin])
        .rpc();
      console.log('  ✅ Config Initialized.');
    } else {
      console.log('  Config already initialized.');
    }

    // 5. Create Child Vault
    console.log('  Creating Child Vault with 100% SpaceX basket...');
    const unlockTs = Math.floor(Date.now() / 1000) + 86400 * 365;
    const basket = [
      {
        mint: MAINNET_SPACEX_MINT,
        weightBps: 10000, // 100%
      },
    ];

    await vaultProgram.methods
      .createVault(
        childIndex,
        Array.from(nicknameHash),
        new BN(unlockTs),
        5000, // 50% moon cap
        basket,
        new BN(1_000_000) // $1 roundup threshold
      )
      .accounts({
        guardian: guardian.publicKey,
        config: configPda,
        vault: vaultPda,
        saveJarToken: saveJarAta,
        usdcMint: MAINNET_USDC_MINT,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([guardian])
      .rpc();
    console.log('  ✅ Child Vault Created.');

    // 6. Create Moon Jar Token-2022 ATA for SpaceX
    console.log('  Creating Moon Jar Token-2022 ATA for SpaceX...');
    await createAssociatedTokenAccountIdempotent(
      connection,
      guardian,
      MAINNET_SPACEX_MINT,
      vaultPda,
      {},
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
      true
    );
    console.log('  ✅ Moon Jar SpaceX ATA ready.');

    // 7. Deposit $50 USDC into Save Jar
    console.log('  Depositing $50 USDC into Save Jar...');
    const memo = Buffer.alloc(32);
    memo.write('🚀 Launch Funds for Luna');
    await vaultProgram.methods
      .deposit(new BN(50_000_000), Array.from(memo))
      .accounts({
        depositor: guardian.publicKey,
        vault: vaultPda,
        saveJarToken: saveJarAta,
        depositorToken: guardianUsdcAta,
        usdcMint: MAINNET_USDC_MINT,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([guardian])
      .rpc();

    const saveBalance = await connection.getTokenAccountBalance(saveJarAta);
    console.log('  Save Jar Balance:', saveBalance.value.uiAmountString, 'USDC');
    expect(Number(saveBalance.value.amount)).to.equal(50_000_000);
  });

  it('Executes live Jupiter V6 swap: USDC -> SpaceX PreStocks (Token-2022) into Moon Jar PDA', async () => {
    const amountIn = new BN(10_000_000); // $10 USDC

    // 1. Fetch live Jupiter quote on Solana Mainnet
    console.log('\n--- Step 1: Querying live Jupiter quote for $10 USDC -> SpaceX PreStocks ---');
    const quoteUrl = `https://api.jup.ag/swap/v1/quote?inputMint=${MAINNET_USDC_MINT.toBase58()}&outputMint=${MAINNET_SPACEX_MINT.toBase58()}&amount=${amountIn.toString()}&slippageBps=100`;
    const quoteRes: any = await fetch(quoteUrl).then((r) => r.json());

    console.log('  Input:', Number(quoteRes.inAmount) / 1e6, 'USDC');
    console.log('  Estimated Output:', Number(quoteRes.outAmount) / 1e9, 'SpaceX PreStocks (9 decimals)');
    console.log('  Minimum Output (1% slippage):', Number(quoteRes.otherAmountThreshold) / 1e9, 'SpaceX PreStocks');
    console.log('  Routing Plan:');
    for (const step of quoteRes.routePlan) {
      console.log(`    -> AMM: ${step.swapInfo.label} (${step.swapInfo.percent}%)`);
    }

    const quotedOut = new BN(quoteRes.outAmount);
    const minOut = new BN(quoteRes.otherAmountThreshold);

    // 2. Fetch Jupiter Swap Instructions with userPublicKey = vaultPda
    console.log('\n--- Step 2: Fetching Jupiter swap instructions with userPublicKey = vaultPda ---');
    const swapInsRes: any = await fetch('https://api.jup.ag/swap/v1/swap-instructions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quoteRes,
        userPublicKey: vaultPda.toBase58(),
      }),
    }).then((r) => r.json());

    const { swapInstruction, addressLookupTableAddresses } = swapInsRes;
    expect(swapInstruction).to.not.be.null;

    const jupProgramId = new PublicKey(swapInstruction.programId);
    const cpiData = Buffer.from(swapInstruction.data, 'base64');

    // Build remaining accounts for Jupiter CPI (outer tx signer is keeper only, vault signs inner CPI)
    const remainingAccounts = swapInstruction.accounts.map((acc: any) => ({
      pubkey: new PublicKey(acc.pubkey),
      isWritable: acc.isWritable,
      isSigner: false,
    }));

    console.log(`  Jupiter swap requires ${remainingAccounts.length} accounts`);
    console.log(`  Address lookup tables: ${addressLookupTableAddresses?.length || 0}`);

    // Pre-execution balances
    const saveBefore = await connection.getTokenAccountBalance(saveJarAta);
    const moonBefore = await connection.getTokenAccountBalance(moonJarSpacexAta);

    console.log('\n--- Step 3: Submitting MoonJar execute_buy via CPI on Surfpool ---');
    console.log('  Pre-swap Save Jar (USDC):', saveBefore.value.uiAmountString);
    console.log('  Pre-swap Moon Jar (SpaceX):', moonBefore.value.uiAmountString);

    const txSig = await vaultProgram.methods
      .executeBuy(
        MAINNET_SPACEX_MINT,
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
        moonJarToken: moonJarSpacexAta,
        usdcMint: MAINNET_USDC_MINT,
        mintOut: MAINNET_SPACEX_MINT,
        swapProgram: jupProgramId,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenOutProgram: TOKEN_2022_PROGRAM_ID,
      })
      .remainingAccounts(remainingAccounts)
      .signers([admin])
      .rpc();

    console.log('  ✅ Transaction Confirmed on Surfpool!');
    console.log('  Signature:', txSig);

    // Post-execution balances
    const saveAfter = await connection.getTokenAccountBalance(saveJarAta);
    const moonAfter = await connection.getTokenAccountBalance(moonJarSpacexAta);

    console.log('\n--- Step 4: Verifying On-Chain Invariants & Token-2022 Balances ---');
    console.log('  Post-swap Save Jar (USDC):', saveAfter.value.uiAmountString);
    console.log('  Post-swap Moon Jar (SpaceX Token-2022):', moonAfter.value.uiAmountString);

    // Save Jar decreased by $10 USDC
    const usdcDelta = Number(saveBefore.value.amount) - Number(saveAfter.value.amount);
    expect(usdcDelta).to.equal(10_000_000);

    // Moon Jar increased with SpaceX tokens
    const spacexReceived = Number(moonAfter.value.amount) - Number(moonBefore.value.amount);
    console.log(`  SpaceX Tokens Received: ${spacexReceived / 1e9} SpaceX`);
    expect(spacexReceived).to.be.greaterThan(0);

    // Cost basis updated
    const vaultAccount: any = await vaultProgram.account.childVault.fetch(vaultPda);
    console.log('  Vault Moon Cost Basis:', vaultAccount.moonCostBasis.toNumber() / 1e6, 'USDC');
    expect(vaultAccount.moonCostBasis.toNumber()).to.equal(10_000_000);

    console.log('\n🎉 SUCCESS: Live Jupiter V6 CPI swap delivered SpaceX PreStocks (Token-2022) to Moon Jar PDA on Surfpool!');
  });
});
