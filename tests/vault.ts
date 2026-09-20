import * as anchor from '@coral-xyz/anchor';
import { Program, BN } from '@coral-xyz/anchor';
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import {
  createMint,
  createAccount,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { expect } from 'chai';
import { createHash } from 'crypto';

// Load IDL and Types
import vaultIdl from '../target/idl/vault.json';
import mockSwapIdl from '../target/idl/mock_swap.json';

describe('Moonjar On-Chain Programs (vault & mock-swap)', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const vaultProgram = new Program(vaultIdl as anchor.Idl, provider);
  const mockSwapProgram = new Program(mockSwapIdl as anchor.Idl, provider);

  // Keypairs & Actors
  const admin = (provider.wallet as anchor.Wallet).payer;
  const keeper = Keypair.generate();
  const guardian = Keypair.generate();
  const childAuthority = Keypair.generate();
  const donor = Keypair.generate(); // Relative/Friend

  // Mints
  let usdcMint: PublicKey;
  let spacexMint: PublicKey;
  let andurilMint: PublicKey;
  let figureaiMint: PublicKey;
  let disallowedMint: PublicKey;

  // PDAs
  let configPda: PublicKey;
  let configBump: number;
  let matchPoolPda: PublicKey;
  let matchPoolTokenAta: PublicKey;
  let mockSwapPoolPda: PublicKey;

  let vaultPda: PublicKey;
  let vaultBump: number;
  let saveJarAta: PublicKey;
  let moonJarSpacexAta: PublicKey;

  // Donor & Guardian ATAs
  let donorUsdcAta: PublicKey;
  let guardianUsdcAta: PublicKey;
  let mockPoolUsdcAta: PublicKey;
  let mockPoolSpacexAta: PublicKey;

  const childIndex = new BN(1);
  const nickname = 'Little Explorer';
  const nicknameHash = createHash('sha256').update(nickname).digest();

  before(async () => {
    // Airdrop SOL to test actors
    for (const actor of [keeper, guardian, childAuthority, donor]) {
      const sig = await provider.connection.requestAirdrop(
        actor.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);
    }

    // Create Mints (USDC has 6 decimals, PreStocks have 6 decimals)
    usdcMint = await createMint(provider.connection, admin, admin.publicKey, null, 6);
    spacexMint = await createMint(provider.connection, admin, admin.publicKey, null, 6);
    andurilMint = await createMint(provider.connection, admin, admin.publicKey, null, 6);
    figureaiMint = await createMint(provider.connection, admin, admin.publicKey, null, 6);
    disallowedMint = await createMint(provider.connection, admin, admin.publicKey, null, 6);

    // Derive PDAs
    [configPda, configBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      vaultProgram.programId
    );

    [matchPoolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('match_pool')],
      vaultProgram.programId
    );

    matchPoolTokenAta = getAssociatedTokenAddressSync(usdcMint, matchPoolPda, true);

    [mockSwapPoolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('mock_swap_pool')],
      mockSwapProgram.programId
    );

    [vaultPda, vaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), guardian.publicKey.toBuffer(), childIndex.toArrayLike(Buffer, 'le', 8)],
      vaultProgram.programId
    );

    saveJarAta = getAssociatedTokenAddressSync(usdcMint, vaultPda, true);
    moonJarSpacexAta = getAssociatedTokenAddressSync(spacexMint, vaultPda, true);

    // Create Token Accounts for Donor and Guardian
    donorUsdcAta = await createAccount(provider.connection, donor, usdcMint, donor.publicKey);
    guardianUsdcAta = await createAccount(provider.connection, guardian, usdcMint, guardian.publicKey);

    // Create Pool Accounts for Mock Swap
    mockPoolUsdcAta = await createAssociatedTokenAccount(provider.connection, admin, usdcMint, mockSwapPoolPda, undefined, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, true);
    mockPoolSpacexAta = await createAssociatedTokenAccount(provider.connection, admin, spacexMint, mockSwapPoolPda, undefined, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, true);

    // Fund Donor with $500 USDC
    await mintTo(provider.connection, admin, usdcMint, donorUsdcAta, admin, 500_000_000);

    // Fund Mock Swap Pool with 10,000 SpaceX PreStock tokens
    await mintTo(provider.connection, admin, spacexMint, mockPoolSpacexAta, admin, 10_000_000_000);
  });

  it('1. Initializes global Config (Admin)', async () => {
    const allowedMints = [spacexMint, andurilMint, figureaiMint];

    await vaultProgram.methods
      .initConfig(
        keeper.publicKey,
        100, // 1% max slippage
        100, // 1% match bps
        new BN(50_000_000), // $50 max match per vault
        allowedMints
      )
      .accounts({
        admin: admin.publicKey,
        config: configPda,
        usdcMint,
        matchPool: matchPoolPda,
        matchPoolToken: matchPoolTokenAta,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const configAccount: any = await vaultProgram.account.config.fetch(configPda);
    expect(configAccount.admin.toBase58()).to.equal(admin.publicKey.toBase58());
    expect(configAccount.keeper.toBase58()).to.equal(keeper.publicKey.toBase58());
    expect(configAccount.maxSlippageBps).to.equal(100);
    expect(configAccount.allowedCount).to.equal(3);
  });

  it('2. Fails to create vault when basket weights do not sum to 10,000 bps', async () => {
    const invalidBasket = [
      { mint: spacexMint, weightBps: 4000 },
      { mint: andurilMint, weightBps: 3000 }, // sum = 7000 != 10000
    ];

    try {
      await vaultProgram.methods
        .createVault(
          childIndex,
          Array.from(nicknameHash),
          new BN(Math.floor(Date.now() / 1000) + 86400 * 365), // 1 year unlock
          2000, // 20% moon cap
          invalidBasket,
          new BN(5_000_000) // $5 roundup
        )
        .accounts({
          guardian: guardian.publicKey,
          config: configPda,
          vault: vaultPda,
          saveJarToken: saveJarAta,
          usdcMint,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([guardian])
        .rpc();
      expect.fail('Should have failed with WeightsInvalid');
    } catch (err: any) {
      expect(err.message).to.include('WeightsInvalid');
    }
  });

  it('3. Fails to create vault when basket contains a disallowed mint', async () => {
    const disallowedBasket = [
      { mint: disallowedMint, weightBps: 10000 },
    ];

    try {
      await vaultProgram.methods
        .createVault(
          childIndex,
          Array.from(nicknameHash),
          new BN(Math.floor(Date.now() / 1000) + 86400 * 365),
          2000,
          disallowedBasket,
          new BN(5_000_000)
        )
        .accounts({
          guardian: guardian.publicKey,
          config: configPda,
          vault: vaultPda,
          saveJarToken: saveJarAta,
          usdcMint,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([guardian])
        .rpc();
      expect.fail('Should have failed with MintNotAllowed');
    } catch (err: any) {
      expect(err.message).to.include('MintNotAllowed');
    }
  });

  it('4. Successfully creates ChildVault (Guardian)', async () => {
    const validBasket = [
      { mint: spacexMint, weightBps: 4000 },
      { mint: andurilMint, weightBps: 3500 },
      { mint: figureaiMint, weightBps: 2500 },
    ];

    const unlockTs = new BN(Math.floor(Date.now() / 1000) + 86400 * 365); // 1 year
    const moonCapBps = 2000; // 20%

    await vaultProgram.methods
      .createVault(
        childIndex,
        Array.from(nicknameHash),
        unlockTs,
        moonCapBps,
        validBasket,
        new BN(5_000_000)
      )
      .accounts({
        guardian: guardian.publicKey,
        config: configPda,
        vault: vaultPda,
        saveJarToken: saveJarAta,
        usdcMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([guardian])
      .rpc();

    const vaultAccount: any = await vaultProgram.account.childVault.fetch(vaultPda);
    expect(vaultAccount.guardian.toBase58()).to.equal(guardian.publicKey.toBase58());
    expect(vaultAccount.moonCapBps).to.equal(2000);
    expect(vaultAccount.totalDeposited.toNumber()).to.equal(0);
    expect(vaultAccount.moonCostBasis.toNumber()).to.equal(0);
    expect(vaultAccount.paused).to.equal(false);
    expect(vaultAccount.graduated).to.equal(false);
  });

  it('5. Allows non-guardian family member to deposit gift into Save Jar', async () => {
    const depositAmount = new BN(100_000_000); // $100 USDC
    const memo = Buffer.alloc(32);
    memo.write('🎂 Happy Birthday Kiddo!');

    await vaultProgram.methods
      .deposit(depositAmount, Array.from(memo))
      .accounts({
        depositor: donor.publicKey,
        vault: vaultPda,
        saveJarToken: saveJarAta,
        depositorToken: donorUsdcAta,
        usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([donor])
      .rpc();

    const saveJarAccount = await getAccount(provider.connection, saveJarAta);
    expect(Number(saveJarAccount.amount)).to.equal(100_000_000);

    const vaultAccount: any = await vaultProgram.account.childVault.fetch(vaultPda);
    expect(vaultAccount.totalDeposited.toNumber()).to.equal(100_000_000);
  });

  it('6. Executes buy within cost-basis cap with balance-delta verification (Keeper)', async () => {
    // Moon cap is 20% of $100 = $20 USDC.
    // Buy $10 USDC of SpaceX PreStocks.
    const amountIn = new BN(10_000_000); // $10 USDC
    const amountOut = new BN(80_000_000); // 80 SpaceX tokens (mock rate)
    const quotedOut = amountOut;
    const minOut = new BN(79_200_000); // within 1% slippage

    // Create moon jar ATA for SpaceX
    await createAssociatedTokenAccount(provider.connection, guardian, spacexMint, vaultPda, undefined, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, true);

    // Mock swap CPI instruction data: sighash("swap") + amountIn (u64) + amountOut (u64)
    // Sighash of "global:swap" is sha256("global:swap")[..8]
    const swapSighash = createHash('sha256').update('global:swap').digest().subarray(0, 8);
    const cpiData = Buffer.concat([
      swapSighash,
      amountIn.toArrayLike(Buffer, 'le', 8),
      amountOut.toArrayLike(Buffer, 'le', 8),
    ]);

    // Remaining accounts required by mock swap CPI:
    // 0: user_authority (vaultPda)
    // 1: user_source (saveJarAta)
    // 2: user_destination (moonJarSpacexAta)
    // 3: pool_authority (mockSwapPoolPda)
    // 4: pool_destination (mockPoolUsdcAta)
    // 5: pool_source (mockPoolSpacexAta)
    // 6: token_program (TOKEN_PROGRAM_ID)
    const remainingAccounts = [
      { pubkey: vaultPda, isWritable: false, isSigner: false },
      { pubkey: saveJarAta, isWritable: true, isSigner: false },
      { pubkey: moonJarSpacexAta, isWritable: true, isSigner: false },
      { pubkey: mockSwapPoolPda, isWritable: false, isSigner: false },
      { pubkey: mockPoolUsdcAta, isWritable: true, isSigner: false },
      { pubkey: mockPoolSpacexAta, isWritable: true, isSigner: false },
      { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
    ];

    await vaultProgram.methods
      .executeBuy(
        spacexMint,
        amountIn,
        quotedOut,
        minOut,
        cpiData
      )
      .accounts({
        keeper: keeper.publicKey,
        config: configPda,
        vault: vaultPda,
        saveJarToken: saveJarAta,
        moonJarToken: moonJarSpacexAta,
        usdcMint,
        mintOut: spacexMint,
        swapProgram: mockSwapProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts(remainingAccounts)
      .signers([keeper])
      .rpc();

    // Verify token balances
    const saveJar = await getAccount(provider.connection, saveJarAta);
    expect(Number(saveJar.amount)).to.equal(90_000_000); // $90 remaining

    const moonJar = await getAccount(provider.connection, moonJarSpacexAta);
    expect(Number(moonJar.amount)).to.equal(80_000_000); // 80 SpaceX tokens

    const vaultAccount: any = await vaultProgram.account.childVault.fetch(vaultPda);
    expect(vaultAccount.moonCostBasis.toNumber()).to.equal(10_000_000);
  });

  it('7. Fails when execute_buy exceeds the cost-basis Moon cap', async () => {
    // Current total deposited = $100. Cap = 20% = $20.
    // Already spent $10. Room left = $10.
    // Attempting to buy $15 must fail with CapExceeded!
    const amountIn = new BN(15_000_000);
    const amountOut = new BN(120_000_000);
    const quotedOut = amountOut;
    const minOut = new BN(119_000_000);

    const swapSighash = createHash('sha256').update('global:swap').digest().subarray(0, 8);
    const cpiData = Buffer.concat([
      swapSighash,
      amountIn.toArrayLike(Buffer, 'le', 8),
      amountOut.toArrayLike(Buffer, 'le', 8),
    ]);

    const remainingAccounts = [
      { pubkey: vaultPda, isWritable: false, isSigner: false },
      { pubkey: saveJarAta, isWritable: true, isSigner: false },
      { pubkey: moonJarSpacexAta, isWritable: true, isSigner: false },
      { pubkey: mockSwapPoolPda, isWritable: false, isSigner: false },
      { pubkey: mockPoolUsdcAta, isWritable: true, isSigner: false },
      { pubkey: mockPoolSpacexAta, isWritable: true, isSigner: false },
      { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
    ];

    try {
      await vaultProgram.methods
        .executeBuy(spacexMint, amountIn, quotedOut, minOut, cpiData)
        .accounts({
          keeper: keeper.publicKey,
          config: configPda,
          vault: vaultPda,
          saveJarToken: saveJarAta,
          moonJarToken: moonJarSpacexAta,
          usdcMint,
          mintOut: spacexMint,
          swapProgram: mockSwapProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .remainingAccounts(remainingAccounts)
        .signers([keeper])
        .rpc();
      expect.fail('Should have failed with CapExceeded');
    } catch (err: any) {
      expect(err.message).to.include('CapExceeded');
    }
  });

  it('8. Fails when non-keeper attempts to call execute_buy', async () => {
    const impostor = Keypair.generate();
    const sig = await provider.connection.requestAirdrop(impostor.publicKey, anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig);

    try {
      await vaultProgram.methods
        .executeBuy(spacexMint, new BN(1_000_000), new BN(1_000_000), new BN(1_000_000), Buffer.alloc(0))
        .accounts({
          keeper: impostor.publicKey,
          config: configPda,
          vault: vaultPda,
          saveJarToken: saveJarAta,
          moonJarToken: moonJarSpacexAta,
          usdcMint,
          mintOut: spacexMint,
          swapProgram: mockSwapProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([impostor])
        .rpc();
      expect.fail('Should have failed with NotKeeper');
    } catch (err: any) {
      expect(err.message).to.include('NotKeeper');
    }
  });

  it('9. Fails when slippage tolerance is breached', async () => {
    const amountIn = new BN(5_000_000); // $5
    const amountOut = new BN(40_000_000);
    const quotedOut = new BN(40_000_000);
    // Program checks min_out >= quoted_out * (10000 - max_slippage_bps) / 10000
    // If min_out is too loose (e.g. 10_000_000), it fails with SlippageTooLoose!
    const tooLooseMinOut = new BN(10_000_000);

    const swapSighash = createHash('sha256').update('global:swap').digest().subarray(0, 8);
    const cpiData = Buffer.concat([
      swapSighash,
      amountIn.toArrayLike(Buffer, 'le', 8),
      amountOut.toArrayLike(Buffer, 'le', 8),
    ]);

    const remainingAccounts = [
      { pubkey: vaultPda, isWritable: false, isSigner: false },
      { pubkey: saveJarAta, isWritable: true, isSigner: false },
      { pubkey: moonJarSpacexAta, isWritable: true, isSigner: false },
      { pubkey: mockSwapPoolPda, isWritable: false, isSigner: false },
      { pubkey: mockPoolUsdcAta, isWritable: true, isSigner: false },
      { pubkey: mockPoolSpacexAta, isWritable: true, isSigner: false },
      { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
    ];

    try {
      await vaultProgram.methods
        .executeBuy(spacexMint, amountIn, quotedOut, tooLooseMinOut, cpiData)
        .accounts({
          keeper: keeper.publicKey,
          config: configPda,
          vault: vaultPda,
          saveJarToken: saveJarAta,
          moonJarToken: moonJarSpacexAta,
          usdcMint,
          mintOut: spacexMint,
          swapProgram: mockSwapProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .remainingAccounts(remainingAccounts)
        .signers([keeper])
        .rpc();
      expect.fail('Should have failed with SlippageTooLoose');
    } catch (err: any) {
      expect(err.message).to.include('SlippageTooLoose');
    }
  });

  it('10. Pausing blocks execute_buy but NEVER blocks Guardian withdrawals', async () => {
    // 1. Guardian pauses the vault
    await vaultProgram.methods
      .setPaused(true)
      .accounts({
        guardian: guardian.publicKey,
        config: configPda,
        vault: vaultPda,
      })
      .signers([guardian])
      .rpc();

    let vaultAccount: any = await vaultProgram.account.childVault.fetch(vaultPda);
    expect(vaultAccount.paused).to.equal(true);

    // 2. Keeper buy MUST FAIL when paused
    try {
      await vaultProgram.methods
        .executeBuy(spacexMint, new BN(5_000_000), new BN(40_000_000), new BN(39_600_000), Buffer.alloc(0))
        .accounts({
          keeper: keeper.publicKey,
          config: configPda,
          vault: vaultPda,
          saveJarToken: saveJarAta,
          moonJarToken: moonJarSpacexAta,
          usdcMint,
          mintOut: spacexMint,
          swapProgram: mockSwapProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([keeper])
        .rpc();
      expect.fail('Should have failed with Paused');
    } catch (err: any) {
      expect(err.message).to.include('Paused');
    }

    // 3. Guardian withdrawal MUST SUCCEED even while paused!
    const withdrawAmount = new BN(10_000_000); // $10 USDC
    await vaultProgram.methods
      .withdraw(withdrawAmount)
      .accounts({
        guardian: guardian.publicKey,
        config: configPda,
        vault: vaultPda,
        vaultToken: saveJarAta,
        guardianToken: guardianUsdcAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([guardian])
      .rpc();

    const guardianAccount = await getAccount(provider.connection, guardianUsdcAta);
    expect(Number(guardianAccount.amount)).to.equal(10_000_000);

    // 4. Guardian unpauses
    await vaultProgram.methods
      .setPaused(false)
      .accounts({
        guardian: guardian.publicKey,
        config: configPda,
        vault: vaultPda,
      })
      .signers([guardian])
      .rpc();
  });

  it('11. Fails graduation when unlock_ts has not been reached', async () => {
    // Register child authority
    await vaultProgram.methods
      .setChildAuthority(childAuthority.publicKey)
      .accounts({
        guardian: guardian.publicKey,
        config: configPda,
        vault: vaultPda,
      })
      .signers([guardian])
      .rpc();

    try {
      await vaultProgram.methods
        .graduate()
        .accounts({
          childAuthority: childAuthority.publicKey,
          vault: vaultPda,
        })
        .signers([childAuthority])
        .rpc();
      expect.fail('Should have failed with NotYetUnlocked');
    } catch (err: any) {
      expect(err.message).to.include('NotYetUnlocked');
    }
  });

  it('12. Successfully graduates vault when unlock_ts is in the past', async () => {
    const expiredChildIndex = new BN(99);
    const [expiredVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), guardian.publicKey.toBuffer(), expiredChildIndex.toArrayLike(Buffer, 'le', 8)],
      vaultProgram.programId
    );
    const expiredSaveJarAta = getAssociatedTokenAddressSync(usdcMint, expiredVaultPda, true);

    const pastUnlockTs = new BN(Math.floor(Date.now() / 1000) - 100); // In the past!

    // Create vault already unlocked
    await vaultProgram.methods
      .createVault(
        expiredChildIndex,
        Array.from(nicknameHash),
        pastUnlockTs,
        2000,
        [{ mint: spacexMint, weightBps: 10000 }],
        new BN(5_000_000)
      )
      .accounts({
        guardian: guardian.publicKey,
        config: configPda,
        vault: expiredVaultPda,
        saveJarToken: expiredSaveJarAta,
        usdcMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([guardian])
      .rpc();

    // Set child authority
    await vaultProgram.methods
      .setChildAuthority(childAuthority.publicKey)
      .accounts({
        guardian: guardian.publicKey,
        config: configPda,
        vault: expiredVaultPda,
      })
      .signers([guardian])
      .rpc();

    // Call graduate
    await vaultProgram.methods
      .graduate()
      .accounts({
        childAuthority: childAuthority.publicKey,
        vault: expiredVaultPda,
      })
      .signers([childAuthority])
      .rpc();

    const vaultAccount: any = await vaultProgram.account.childVault.fetch(expiredVaultPda);
    expect(vaultAccount.graduated).to.equal(true);
    expect(vaultAccount.guardian.toBase58()).to.equal(childAuthority.publicKey.toBase58());
  });

  it('13. Funds sponsor match pool and applies deposit match', async () => {
    // 1. Admin funds match pool with $20 USDC
    const funderUsdcAta = await createAccount(provider.connection, admin, usdcMint, admin.publicKey);
    await mintTo(provider.connection, admin, usdcMint, funderUsdcAta, admin, 20_000_000);

    await vaultProgram.methods
      .fundMatchPool(new BN(20_000_000))
      .accounts({
        funder: admin.publicKey,
        config: configPda,
        matchPool: matchPoolPda,
        matchPoolToken: matchPoolTokenAta,
        funderToken: funderUsdcAta,
        usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const poolBalance = await getAccount(provider.connection, matchPoolTokenAta);
    expect(Number(poolBalance.amount)).to.equal(20_000_000);

    // 2. Apply sponsor match on a $100 deposit (1% match = $1.00 = 1,000,000 units)
    await vaultProgram.methods
      .applyMatch(new BN(100_000_000))
      .accounts({
        caller: keeper.publicKey,
        config: configPda,
        vault: vaultPda,
        saveJarToken: saveJarAta,
        matchPool: matchPoolPda,
        matchPoolToken: matchPoolTokenAta,
        usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([keeper])
      .rpc();

    const vaultAccount: any = await vaultProgram.account.childVault.fetch(vaultPda);
    expect(vaultAccount.matchReceived.toNumber()).to.equal(1_000_000); // $1 match received
  });
});
