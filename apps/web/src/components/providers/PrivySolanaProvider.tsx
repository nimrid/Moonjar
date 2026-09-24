'use client';

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import {
  useWallets,
  useSignTransaction,
  ConnectedStandardSolanaWallet,
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
  getAssociatedTokenAddressSync,
  createTransferInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
} from '@solana/spl-token';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import { RPC_URL, MAINNET_USDC_MINT, getSolanaConnection } from '@/lib/onchain';
import {
  createDepositInstruction,
  createCreateVaultInstruction,
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
  const { signTransaction: privySignTransaction } = useSignTransaction();
  const connection = useMemo(() => getSolanaConnection(), []);

  // Enforce email-only login at runtime
  const login = useCallback(() => {
    privyLogin({
      loginMethods: ['email'],
    });
  }, [privyLogin]);

  // Resolve the Solana wallet address from Privy embedded or linked accounts
  const solanaAddress = useMemo(() => {
    if (!user) return null;

    // Check embedded or linked wallets for Solana
    const accounts = user.linkedAccounts || [];
    const solanaWallet = accounts.find(
      (acc: any) =>
        acc.type === 'wallet' &&
        (acc.chainType === 'solana' || acc.walletClientType === 'privy')
    ) as any;

    if (solanaWallet?.address) {
      return solanaWallet.address as string;
    }

    // Fallback to primary wallet if present
    if (user.wallet?.address) {
      return user.wallet.address;
    }

    return null;
  }, [user]);

  const publicKey = useMemo(() => {
    if (!solanaAddress) return null;
    try {
      return new PublicKey(solanaAddress);
    } catch {
      return null;
    }
  }, [solanaAddress]);

  // Primary active Solana wallet from standard wallets
  const primaryWallet = useMemo<ConnectedStandardSolanaWallet | null>(() => {
    if (!wallets || wallets.length === 0) return null;
    if (solanaAddress) {
      const match = wallets.find((w) => w.address === solanaAddress);
      if (match) return match;
    }
    return wallets[0];
  }, [wallets, solanaAddress]);

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
        MAINNET_USDC_MINT,
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
      if (!primaryWallet) {
        throw new Error('No Privy Solana embedded wallet available to sign.');
      }
      const serialized = tx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      const { signedTransaction } = await privySignTransaction({
        transaction: serialized,
        wallet: primaryWallet,
        chain: 'solana:mainnet',
      });

      if ('version' in tx) {
        return VersionedTransaction.deserialize(signedTransaction) as unknown as T;
      } else {
        return Transaction.from(signedTransaction) as unknown as T;
      }
    },
    [primaryWallet, privySignTransaction]
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
      if (!primaryWallet || !publicKey) {
        throw new Error('Privy wallet not ready for transaction signing.');
      }
      const conn = customConnection || connection;

      const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed');
      tx.recentBlockhash = tx.recentBlockhash || blockhash;
      tx.feePayer = tx.feePayer || publicKey;

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
    [primaryWallet, publicKey, connection, signTransaction]
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
      if (!publicKey || !primaryWallet) {
        throw new Error('Please connect your Privy guardian wallet first.');
      }
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
            fromPubkey: publicKey,
            toPubkey,
            lamports,
          })
        );
      } else {
        // USDC (6 decimals)
        const amountUnits = Math.round(amount * 1_000_000);
        const fromAta = getAssociatedTokenAddressSync(
          MAINNET_USDC_MINT,
          publicKey,
          true,
          TOKEN_PROGRAM_ID
        );
        const toAta = getAssociatedTokenAddressSync(
          MAINNET_USDC_MINT,
          toPubkey,
          true,
          TOKEN_PROGRAM_ID
        );

        // Ensure recipient ATA exists idempotently
        tx.add(
          createAssociatedTokenAccountIdempotentInstruction(
            publicKey,
            toAta,
            toPubkey,
            MAINNET_USDC_MINT,
            TOKEN_PROGRAM_ID
          )
        );

        // Transfer instruction
        tx.add(
          createTransferInstruction(
            fromAta,
            toAta,
            publicKey,
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
    [publicKey, primaryWallet, sendTransaction, refreshBalances]
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
      if (!publicKey || !primaryWallet) {
        throw new Error('Please connect your Privy guardian wallet first.');
      }
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
        MAINNET_USDC_MINT,
        publicKey,
        true,
        TOKEN_PROGRAM_ID
      );
      const saveJarAta = getAssociatedTokenAddressSync(
        MAINNET_USDC_MINT,
        vaultPda,
        true,
        TOKEN_PROGRAM_ID
      );

      const tx = new Transaction();

      // Ensure depositor ATA exists
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          publicKey,
          depositorAta,
          publicKey,
          MAINNET_USDC_MINT,
          TOKEN_PROGRAM_ID
        ),
        // Ensure Save Jar token account exists for the vault
        createAssociatedTokenAccountIdempotentInstruction(
          publicKey,
          saveJarAta,
          vaultPda,
          MAINNET_USDC_MINT,
          TOKEN_PROGRAM_ID
        )
      );

      // Create pure TransactionInstruction (zero Anchor runtime)
      const depositIx = createDepositInstruction({
        depositor: publicKey,
        vault: vaultPda,
        saveJarToken: saveJarAta,
        depositorToken: depositorAta,
        usdcMint: MAINNET_USDC_MINT,
        amount: BigInt(amountLamports),
      });

      tx.add(depositIx);

      const txSig = await sendTransaction(tx);
      await refreshBalances();
      return { signature: txSig };
    },
    [
      publicKey,
      primaryWallet,
      sendTransaction,
      refreshBalances,
    ]
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
      if (!publicKey || !primaryWallet) {
        throw new Error('Please connect your Privy guardian wallet first.');
      }
      const childIndex = 0n;
      const [vaultPda] = findVaultPda(publicKey, childIndex);

      // Sha256 nickname hash (zero PII on-chain)
      const encoder = new TextEncoder();
      const nickBytes = encoder.encode(nickname.trim() || 'Child');
      const hashBuffer = await crypto.subtle.digest('SHA-256', nickBytes as unknown as BufferSource);
      const nicknameHash = new Uint8Array(hashBuffer);

      const unlockTs = BigInt(Math.floor(Date.now() / 1000) + unlockYears * 365 * 24 * 3600);

      const defaultBasket = [
        { mint: new PublicKey('PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh'), weightBps: 4000 },
        { mint: new PublicKey('PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB'), weightBps: 3500 },
        { mint: new PublicKey('PreZad18qfPtbxNpMtMuAuX2zVpvkEU8DnJx56faCWd'), weightBps: 2500 },
      ];
      const finalBasket = basket && basket.length > 0 ? basket : defaultBasket;

      const createIx = createCreateVaultInstruction({
        guardian: publicKey,
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
          MAINNET_USDC_MINT,
          publicKey,
          true,
          TOKEN_PROGRAM_ID
        );
        const saveJarAta = getAssociatedTokenAddressSync(
          MAINNET_USDC_MINT,
          vaultPda,
          true,
          TOKEN_PROGRAM_ID
        );
        tx.add(
          createAssociatedTokenAccountIdempotentInstruction(
            publicKey,
            depositorAta,
            publicKey,
            MAINNET_USDC_MINT,
            TOKEN_PROGRAM_ID
          ),
          createDepositInstruction({
            depositor: publicKey,
            vault: vaultPda,
            saveJarToken: saveJarAta,
            depositorToken: depositorAta,
            usdcMint: MAINNET_USDC_MINT,
            amount: BigInt(amountLamports),
          })
        );
      }

      const txSig = await sendTransaction(tx);
      await refreshBalances();
      return { vaultAddress: vaultPda.toBase58(), signature: txSig };
    },
    [publicKey, primaryWallet, sendTransaction, refreshBalances]
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
            createOnLogin: 'users-without-wallets',
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
        externalWallets: {
          disableAllExternalWallets: true,
        },
      }}
    >
      <GuardianWalletInner>{children}</GuardianWalletInner>
    </PrivyProvider>
  );
};
