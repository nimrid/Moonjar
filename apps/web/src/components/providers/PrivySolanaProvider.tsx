'use client';

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import {
  useWallets,
  useStandardWallets,
  useSignTransaction,
  useCreateWallet,
  type ConnectedStandardSolanaWallet,
} from '@privy-io/react-auth/solana';
import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
  SystemProgram,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createTransferInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
} from '@solana/spl-token';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import { RPC_URL, ACTIVE_USDC_MINT, getSolanaConnection } from '@/lib/onchain';
import { getPreStockMint } from '@moonjar/shared';
import {
  createDepositInstruction,
  createCreateVaultInstruction,
  createSetCapsInstruction,
  createSetBasketInstruction,
  findVaultPda,
} from '@/lib/vault-client';

export interface GuardianWalletContextType {
  ready: boolean;
  authenticated: boolean;
  connected: boolean;
  address: string | null;
  publicKey: PublicKey | null;
  user: ReturnType<typeof usePrivy>['user'];
  wallets: ConnectedStandardSolanaWallet[];
  primaryWallet: ConnectedStandardSolanaWallet | null;
  solBalance: number;
  usdcBalance: number;
  isRefreshingBalances: boolean;
  refreshBalances: () => Promise<void>;
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>;
  sendTransaction: (tx: Transaction, customConnection?: Connection) => Promise<string>;
  transferTokens: (params: {
    recipient: string;
    amount: number;
    token: 'USDC' | 'SOL';
  }) => Promise<{ signature: string }>;
  depositToVault: (params: {
    vaultAddress: string;
    amountUsdc: number;
  }) => Promise<{ signature: string }>;
  createVault: (params: {
    nickname: string;
    moonCapBps?: number;
    basket?: Array<{ mint: PublicKey; weightBps: number }>;
    unlockYears?: number;
    initialDepositUsdc?: number;
  }) => Promise<{ vaultAddress: string; signature: string }>;
  updateVaultSettings: (params: {
    vaultAddress: string;
    moonCapBps?: number;
    basket?: Array<{ mint: PublicKey; weightBps: number }>;
    roundupThreshold?: bigint;
  }) => Promise<{ signature: string }>;
  login: () => void;
  logout: () => Promise<void>;
  connection: Connection;
}

const GuardianWalletContext = createContext<GuardianWalletContextType>({
  ready: false,
  authenticated: false,
  connected: false,
  address: null,
  publicKey: null,
  user: null,
  wallets: [],
  primaryWallet: null,
  solBalance: 0,
  usdcBalance: 0,
  isRefreshingBalances: false,
  refreshBalances: async () => {},
  signTransaction: async (tx) => tx,
  signAllTransactions: async (txs) => txs,
  sendTransaction: async () => '',
  transferTokens: async () => ({ signature: '' }),
  depositToVault: async () => ({ signature: '' }),
  createVault: async () => ({ vaultAddress: '', signature: '' }),
  updateVaultSettings: async () => ({ signature: '' }),
  login: () => {},
  logout: async () => {},
  connection: getSolanaConnection(),
});

export const useGuardianWallet = () => useContext(GuardianWalletContext);

// Backwards-compatible hook for components using useConnection
export const useConnection = () => {
  const { connection } = useGuardianWallet();
  return { connection };
};

// Backwards-compatible hook for components previously using useWallet
export const useWallet = () => {
  const {
    connected,
    publicKey,
    ready,
    login,
    logout,
    signTransaction,
    signAllTransactions,
    sendTransaction,
  } = useGuardianWallet();
  return {
    connected,
    publicKey,
    ready,
    connect: login,
    disconnect: logout,
    select: () => {},
    signTransaction,
    signAllTransactions,
    sendTransaction,
  };
};

function GuardianWalletInner({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login: privyLogin, logout } = usePrivy();
  const { wallets } = useWallets();
  const { wallets: standardWallets } = useStandardWallets();
  const { createWallet: createSolanaWallet } = useCreateWallet();
  const { signTransaction: privySignTransaction } = useSignTransaction();
  const connection = useMemo(() => getSolanaConnection(), []);

  // Safe login wrapper: do not call privyLogin if already authenticated
  const login = useCallback(() => {
    if (authenticated) {
      console.warn('[PrivySolanaProvider] User is already authenticated');
      return;
    }
    privyLogin({
      loginMethods: ['email'],
    });
  }, [authenticated, privyLogin]);

  // Resolve the Solana wallet address strictly from Solana accounts or wallets
  const solanaAddress = useMemo(() => {
    if (!user) return null;

    // 1. Check embedded or linked wallets strictly for Solana
    const accounts = user.linkedAccounts || [];
    const solanaWallet = accounts.find(
      (acc: any) => acc.type === 'wallet' && acc.chainType === 'solana'
    ) as any;

    if (solanaWallet?.address) {
      return solanaWallet.address as string;
    }

    // 2. Fallback to standard wallets if available
    if (wallets && wallets.length > 0 && wallets[0]?.address) {
      return wallets[0].address;
    }

    // 3. Fallback to primary wallet only if explicitly Solana
    if (user.wallet?.chainType === 'solana' && user.wallet?.address) {
      return user.wallet.address;
    }

    return null;
  }, [user, wallets]);

  const publicKey = useMemo(() => {
    if (!solanaAddress) return null;
    try {
      return new PublicKey(solanaAddress);
    } catch {
      return null;
    }
  }, [solanaAddress]);

  // Primary active Solana wallet from standard wallets or Privy standard wallet
  const primaryWallet = useMemo<ConnectedStandardSolanaWallet | null>(() => {
    if (wallets && wallets.length > 0) {
      if (solanaAddress) {
        const match = wallets.find((w) => w.address === solanaAddress);
        if (match) return match;
      }
      return wallets[0];
    }

    if (standardWallets && standardWallets.length > 0 && solanaAddress) {
      const privyStandard =
        standardWallets.find((w) => (w as any).isPrivyWallet) || standardWallets[0];
      if (privyStandard) {
        try {
          const account = {
            address: solanaAddress,
            publicKey: new PublicKey(solanaAddress).toBytes(),
            chains: ['solana:mainnet', 'solana:devnet'],
            features: [
              'solana:signTransaction',
              'solana:signAndSendTransaction',
              'solana:signMessage',
            ],
          };
          const fallbackWallet = {
            wallet: privyStandard,
            account,
            address: solanaAddress,
            publicKey: account.publicKey,
            chains: account.chains,
            features: account.features,
            signTransaction: async (args: any) => {
              const signFn = (privyStandard.features as any)?.['solana:signTransaction']?.signTransaction;
              if (!signFn) throw new Error('Wallet does not support solana:signTransaction');
              const [res] = await signFn([{
                ...args,
                account,
                chain: args?.chain || 'solana:mainnet',
              }]);
              return res;
            },
            signAndSendTransaction: async (args: any) => {
              const signFn = (privyStandard.features as any)?.['solana:signAndSendTransaction']?.signAndSendTransaction;
              if (!signFn) throw new Error('Wallet does not support solana:signAndSendTransaction');
              const [res] = await signFn([{
                ...args,
                account,
                chain: args?.chain || 'solana:mainnet',
              }]);
              return res;
            },
            signMessage: async (args: any) => {
              const signFn = (privyStandard.features as any)?.['solana:signMessage']?.signMessage;
              if (!signFn) throw new Error('Wallet does not support solana:signMessage');
              const [res] = await signFn([{
                ...args,
                account,
              }]);
              return res;
            },
          } as unknown as ConnectedStandardSolanaWallet;

          return fallbackWallet;
        } catch (e) {
          console.warn('[PrivySolanaProvider] Fallback ConnectedStandardSolanaWallet notice:', e);
        }
      }
    }

    return null;
  }, [wallets, standardWallets, solanaAddress]);

  // Auto-provision a Solana embedded wallet if user is authenticated but missing one
  useEffect(() => {
    let isCancelled = false;
    if (authenticated && user) {
      const accounts = user.linkedAccounts || [];
      const hasSolana =
        accounts.some((acc: any) => acc.type === 'wallet' && acc.chainType === 'solana') ||
        (wallets && wallets.length > 0);

      if (!hasSolana) {
        createSolanaWallet()
          .then(() => {
            if (!isCancelled) {
              console.log('[PrivySolanaProvider] Created Solana embedded wallet');
            }
          })
          .catch((err) => {
            console.warn('[PrivySolanaProvider] createSolanaWallet notice:', err?.message || err);
          });
      }
    }
    return () => {
      isCancelled = true;
    };
  }, [authenticated, user, wallets, createSolanaWallet]);

  // Stable refs for resolving active wallet without race conditions
  const publicKeyRef = useRef(publicKey);
  publicKeyRef.current = publicKey;

  const primaryWalletRef = useRef(primaryWallet);
  primaryWalletRef.current = primaryWallet;

  const authenticatedRef = useRef(authenticated);
  authenticatedRef.current = authenticated;

  // Helper to ensure active wallet is ready before executing on-chain transactions
  const getActiveWallet = useCallback(async (): Promise<{
    activePublicKey: PublicKey;
    activeWallet: ConnectedStandardSolanaWallet;
  }> => {
    if (!authenticatedRef.current) {
      throw new Error('Please connect your Privy guardian wallet first.');
    }

    let pKey = publicKeyRef.current;
    let pWal = primaryWalletRef.current;

    // If authenticated but wallet is still mounting/syncing, poll briefly (up to 3.5s)
    if (!pKey || !pWal) {
      const startTime = Date.now();
      while (Date.now() - startTime < 3500) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        pKey = publicKeyRef.current;
        pWal = primaryWalletRef.current;
        if (pKey && pWal) break;
      }
    }

    if (!pKey || !pWal) {
      throw new Error('Please connect your Privy guardian wallet first.');
    }

    return { activePublicKey: pKey, activeWallet: pWal };
  }, []);

  // Live on-chain balances for the connected Privy wallet
  const [solBalance, setSolBalance] = useState<number>(0);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [isRefreshingBalances, setIsRefreshingBalances] = useState<boolean>(false);

  const refreshBalances = useCallback(async () => {
    if (!publicKey) {
      setSolBalance(0);
      setUsdcBalance(0);
      return;
    }
    setIsRefreshingBalances(true);
    try {
      // 1. Fetch SOL balance
      const lamports = await connection.getBalance(publicKey, 'confirmed');
      setSolBalance(lamports / 1_000_000_000);

      // 2. Fetch Circle USDC balance
      const ata = getAssociatedTokenAddressSync(
        ACTIVE_USDC_MINT,
        publicKey,
        true,
        TOKEN_PROGRAM_ID
      );
      try {
        const tokenBal = await connection.getTokenAccountBalance(ata, 'confirmed');
        setUsdcBalance(parseFloat(tokenBal.value.uiAmountString || '0'));
      } catch {
        // Account may not be created yet
        setUsdcBalance(0);
      }
    } catch (err) {
      console.warn('Failed to refresh balances:', err);
    } finally {
      setIsRefreshingBalances(false);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (connectedWalletReady(authenticated, publicKey)) {
      refreshBalances();
    }
  }, [authenticated, publicKey, refreshBalances]);

  // Sign transaction using Privy Embedded Wallet
  const signTransaction = useCallback(
    async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
      const { activeWallet } = await getActiveWallet();
      const serialized = tx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      const { signedTransaction } = await privySignTransaction({
        transaction: serialized,
        wallet: activeWallet,
        chain: 'solana:mainnet',
      });

      if ('version' in tx) {
        return VersionedTransaction.deserialize(signedTransaction) as unknown as T;
      } else {
        return Transaction.from(signedTransaction) as unknown as T;
      }
    },
    [getActiveWallet, privySignTransaction]
  );

  const signAllTransactions = useCallback(
    async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
      const results: T[] = [];
      for (const tx of txs) {
        results.push(await signTransaction(tx));
      }
      return results;
    },
    [signTransaction]
  );

  // Send transaction directly to Surfpool / Solana RPC
  const sendTransaction = useCallback(
    async (tx: Transaction, customConnection?: Connection): Promise<string> => {
      const { activePublicKey } = await getActiveWallet();
      const conn = customConnection || connection;

      const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed');
      tx.recentBlockhash = tx.recentBlockhash || blockhash;
      tx.feePayer = tx.feePayer || activePublicKey;

      const signed = await signTransaction(tx);
      const rawTx = signed.serialize();

      const txSig = await conn.sendRawTransaction(rawTx, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      await conn.confirmTransaction(
        { signature: txSig, blockhash, lastValidBlockHeight },
        'confirmed'
      );

      return txSig;
    },
    [getActiveWallet, connection, signTransaction]
  );

  // Transfer tokens (USDC or SOL) directly from Privy wallet
  const transferTokens = useCallback(
    async ({
      recipient,
      amount,
      token,
    }: {
      recipient: string;
      amount: number;
      token: 'USDC' | 'SOL';
    }): Promise<{ signature: string }> => {
      const { activePublicKey } = await getActiveWallet();
      let toPubkey: PublicKey;
      try {
        toPubkey = new PublicKey(recipient.trim());
      } catch {
        throw new Error(`"${recipient}" is not a valid Solana address.`);
      }

      if (amount <= 0) {
        throw new Error('Amount must be greater than 0.');
      }

      const tx = new Transaction();

      if (token === 'SOL') {
        const lamports = Math.round(amount * 1_000_000_000);
        tx.add(
          SystemProgram.transfer({
            fromPubkey: activePublicKey,
            toPubkey,
            lamports,
          })
        );
      } else {
        // USDC (6 decimals)
        const amountUnits = Math.round(amount * 1_000_000);
        const fromAta = getAssociatedTokenAddressSync(
          ACTIVE_USDC_MINT,
          activePublicKey,
          true,
          TOKEN_PROGRAM_ID
        );
        const toAta = getAssociatedTokenAddressSync(
          ACTIVE_USDC_MINT,
          toPubkey,
          true,
          TOKEN_PROGRAM_ID
        );

        // Ensure recipient ATA exists idempotently
        tx.add(
          createAssociatedTokenAccountIdempotentInstruction(
            activePublicKey,
            toAta,
            toPubkey,
            ACTIVE_USDC_MINT,
            TOKEN_PROGRAM_ID
          )
        );

        // Transfer instruction
        tx.add(
          createTransferInstruction(
            fromAta,
            toAta,
            activePublicKey,
            amountUnits,
            [],
            TOKEN_PROGRAM_ID
          )
        );
      }

      const txSig = await sendTransaction(tx);
      await refreshBalances();
      return { signature: txSig };
    },
    [getActiveWallet, sendTransaction, refreshBalances]
  );

  // Deposit USDC directly into a ChildVault on-chain
  const depositToVault = useCallback(
    async ({
      vaultAddress,
      amountUsdc,
    }: {
      vaultAddress: string;
      amountUsdc: number;
    }): Promise<{ signature: string }> => {
      const { activePublicKey } = await getActiveWallet();
      let vaultPda: PublicKey;
      try {
        vaultPda = new PublicKey(vaultAddress.trim());
      } catch {
        throw new Error(`"${vaultAddress}" is not a valid Solana vault address.`);
      }

      if (amountUsdc <= 0) {
        throw new Error('Deposit amount must be greater than $0.');
      }

      const amountLamports = Math.round(amountUsdc * 1_000_000);
      const depositorAta = getAssociatedTokenAddressSync(
        ACTIVE_USDC_MINT,
        activePublicKey,
        true,
        TOKEN_PROGRAM_ID
      );
      const saveJarAta = getAssociatedTokenAddressSync(
        ACTIVE_USDC_MINT,
        vaultPda,
        true,
        TOKEN_PROGRAM_ID
      );

      const tx = new Transaction();

      // Ensure depositor ATA exists
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          activePublicKey,
          depositorAta,
          activePublicKey,
          ACTIVE_USDC_MINT,
          TOKEN_PROGRAM_ID
        ),
        // Ensure Save Jar token account exists for the vault
        createAssociatedTokenAccountIdempotentInstruction(
          activePublicKey,
          saveJarAta,
          vaultPda,
          ACTIVE_USDC_MINT,
          TOKEN_PROGRAM_ID
        )
      );

      // Create pure TransactionInstruction (zero Anchor runtime)
      const depositIx = createDepositInstruction({
        depositor: activePublicKey,
        vault: vaultPda,
        saveJarToken: saveJarAta,
        depositorToken: depositorAta,
        usdcMint: ACTIVE_USDC_MINT,
        amount: BigInt(amountLamports),
      });

      tx.add(depositIx);

      const txSig = await sendTransaction(tx);
      await refreshBalances();
      return { signature: txSig };
    },
    [getActiveWallet, sendTransaction, refreshBalances]
  );

  const createVault = useCallback(
    async ({
      nickname,
      moonCapBps = 2000,
      basket,
      unlockYears = 10,
      initialDepositUsdc,
    }: {
      nickname: string;
      moonCapBps?: number;
      basket?: Array<{ mint: PublicKey; weightBps: number }>;
      unlockYears?: number;
      initialDepositUsdc?: number;
    }): Promise<{ vaultAddress: string; signature: string }> => {
      const { activePublicKey } = await getActiveWallet();
      const childIndex = 0n;
      const [vaultPda] = findVaultPda(activePublicKey, childIndex);

      // Sha256 nickname hash (zero PII on-chain)
      const encoder = new TextEncoder();
      const nickBytes = encoder.encode(nickname.trim() || 'Child');
      const hashBuffer = await crypto.subtle.digest('SHA-256', nickBytes as unknown as BufferSource);
      const nicknameHash = new Uint8Array(hashBuffer);

      const unlockTs = BigInt(Math.floor(Date.now() / 1000) + unlockYears * 365 * 24 * 3600);

      const isDevnet = RPC_URL.includes('devnet');
      const defaultBasket = [
        { mint: new PublicKey(getPreStockMint('SPACEX', isDevnet)), weightBps: 4000 },
        { mint: new PublicKey(getPreStockMint('ANDURIL', isDevnet)), weightBps: 3500 },
        { mint: new PublicKey(getPreStockMint('FIGUREAI', isDevnet)), weightBps: 2500 },
      ];
      const finalBasket = basket && basket.length > 0 ? basket : defaultBasket;

      const createIx = createCreateVaultInstruction({
        guardian: activePublicKey,
        childIndex,
        nicknameHash,
        unlockTs,
        moonCapBps,
        basket: finalBasket,
        roundupThreshold: 5_000_000n,
      });

      const tx = new Transaction().add(createIx);

      if (initialDepositUsdc && initialDepositUsdc > 0) {
        const amountLamports = Math.round(initialDepositUsdc * 1_000_000);
        const depositorAta = getAssociatedTokenAddressSync(
          ACTIVE_USDC_MINT,
          activePublicKey,
          true,
          TOKEN_PROGRAM_ID
        );
        const saveJarAta = getAssociatedTokenAddressSync(
          ACTIVE_USDC_MINT,
          vaultPda,
          true,
          TOKEN_PROGRAM_ID
        );
        tx.add(
          createAssociatedTokenAccountIdempotentInstruction(
            activePublicKey,
            depositorAta,
            activePublicKey,
            ACTIVE_USDC_MINT,
            TOKEN_PROGRAM_ID
          ),
          createDepositInstruction({
            depositor: activePublicKey,
            vault: vaultPda,
            saveJarToken: saveJarAta,
            depositorToken: depositorAta,
            usdcMint: ACTIVE_USDC_MINT,
            amount: BigInt(amountLamports),
          })
        );
      }

      const txSig = await sendTransaction(tx);
      await refreshBalances();
      return { vaultAddress: vaultPda.toBase58(), signature: txSig };
    },
    [getActiveWallet, sendTransaction, refreshBalances]
  );

  const updateVaultSettings = useCallback(
    async ({
      vaultAddress,
      moonCapBps,
      basket,
      roundupThreshold,
    }: {
      vaultAddress: string;
      moonCapBps?: number;
      basket?: Array<{ mint: PublicKey; weightBps: number }>;
      roundupThreshold?: bigint;
    }): Promise<{ signature: string }> => {
      const { activePublicKey } = await getActiveWallet();
      let vaultPda: PublicKey;
      try {
        vaultPda = new PublicKey(vaultAddress.trim());
      } catch {
        throw new Error(`"${vaultAddress}" is not a valid Solana vault address.`);
      }

      const tx = new Transaction();

      // Ensure Moon Jar Token-2022 ATAs exist for all basket assets
      if (basket && basket.length > 0) {
        for (const entry of basket) {
          const tokenAta = getAssociatedTokenAddressSync(
            entry.mint,
            vaultPda,
            true,
            TOKEN_2022_PROGRAM_ID
          );
          tx.add(
            createAssociatedTokenAccountIdempotentInstruction(
              activePublicKey,
              tokenAta,
              vaultPda,
              entry.mint,
              TOKEN_2022_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }

        tx.add(
          createSetBasketInstruction({
            guardian: activePublicKey,
            vault: vaultPda,
            basket,
          })
        );
      }

      if (moonCapBps !== undefined) {
        tx.add(
          createSetCapsInstruction({
            guardian: activePublicKey,
            vault: vaultPda,
            moonCapBps,
            roundupThreshold: roundupThreshold ?? 5_000_000n,
          })
        );
      }

      const txSig = await sendTransaction(tx);
      await refreshBalances();
      return { signature: txSig };
    },
    [getActiveWallet, sendTransaction, refreshBalances]
  );

  const value = useMemo<GuardianWalletContextType>(
    () => ({
      ready,
      authenticated,
      connected: authenticated && !!publicKey,
      address: solanaAddress,
      publicKey,
      user,
      wallets,
      primaryWallet,
      solBalance,
      usdcBalance,
      isRefreshingBalances,
      refreshBalances,
      signTransaction,
      signAllTransactions,
      sendTransaction,
      transferTokens,
      depositToVault,
      createVault,
      updateVaultSettings,
      login,
      logout,
      connection,
    }),
    [
      ready,
      authenticated,
      solanaAddress,
      publicKey,
      user,
      wallets,
      primaryWallet,
      solBalance,
      usdcBalance,
      isRefreshingBalances,
      refreshBalances,
      signTransaction,
      signAllTransactions,
      sendTransaction,
      transferTokens,
      depositToVault,
      createVault,
      updateVaultSettings,
      login,
      logout,
      connection,
    ]
  );

  return (
    <GuardianWalletContext.Provider value={value}>
      {children}
    </GuardianWalletContext.Provider>
  );
}

function connectedWalletReady(authenticated: boolean, publicKey: PublicKey | null): boolean {
  return authenticated && !!publicKey;
}

export const PrivySolanaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmudhs25n004d0bl62a2o8z2j';
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8899';
  const wsUrl = rpcUrl.replace(/^http/, 'ws').replace(':8899', ':8900');

  const solanaRpcs = useMemo(() => {
    try {
      const rpc = createSolanaRpc(rpcUrl);
      const rpcSubscriptions = createSolanaRpcSubscriptions(wsUrl);
      return {
        'solana:mainnet': { rpc, rpcSubscriptions },
        'solana:devnet': { rpc, rpcSubscriptions },
      };
    } catch (e) {
      console.warn('Failed to initialize custom Solana RPC for Privy:', e);
      return undefined;
    }
  }, [rpcUrl, wsUrl]);

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: 'light',
          accentColor: '#F59E0B',
          showWalletLoginFirst: false,
          walletList: [],
        },
        embeddedWallets: {
          solana: {
            createOnLogin: 'all-users',
          },
          ethereum: {
            createOnLogin: 'off',
          },
        },
        solana: solanaRpcs ? { rpcs: solanaRpcs } : undefined,
        loginMethods: ['email'],
        loginMethodsAndOrder: {
          primary: ['email'],
          overflow: [],
        },
      }}
    >
      <GuardianWalletInner>{children}</GuardianWalletInner>
    </PrivyProvider>
  );
};
