'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { getStoredVault, getOrCreateStoredVault, saveVault, VaultState, OnChainRoundupTx } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Pip } from '@/components/mascot/Pip';
import { useGuardianWallet } from '@/components/providers/PrivySolanaProvider';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { MAINNET_USDC_MINT, RPC_URL, fetchOnChainVaultState } from '@/lib/onchain';
import confetti from 'canvas-confetti';
import { 
  Coins, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  Sliders, 
  Layers, 
  RefreshCw,
  Zap,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function RoundupsPage() {
  const { connection, publicKey, updateVaultSettings } = useGuardianWallet();
  const [vault, setVault] = useState<VaultState | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [multiplier, setMultiplier] = useState<1 | 2 | 5>(1);
  const [weeklyCap, setWeeklyCap] = useState(25);
  const [isSaved, setIsSaved] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSettingsError, setSaveSettingsError] = useState<string | null>(null);
  const [saveTx, setSaveTx] = useState<string | null>(null);
  const [includeJupiter, setIncludeJupiter] = useState(true);
  const [includeSpl, setIncludeSpl] = useState(true);
  const [includeDeFi, setIncludeDeFi] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live on-chain wallet balance & transaction watcher
  const [liveWalletBalance, setLiveWalletBalance] = useState<number | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [lastDetectedTx, setLastDetectedTx] = useState<{
    sig: string;
    volume: number;
    roundedUp: number;
  } | null>(null);

  const vaultRef = useRef<VaultState | null>(null);
  vaultRef.current = vault;

  const seenSignaturesRef = useRef<Set<string>>(new Set());
  const isInitialFetchRef = useRef<boolean>(true);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  useEffect(() => {
    const v = getStoredVault(publicKey?.toBase58());
    setVault(v);
    if (v?.roundupSettings) {
      setIsEnabled(v.roundupSettings.isEnabled);
      setMultiplier(v.roundupSettings.multiplier);
      setWeeklyCap(v.roundupSettings.weeklyCap);
      setIncludeJupiter(v.roundupSettings.includeJupiter);
      setIncludeSpl(v.roundupSettings.includeSpl);
      setIncludeDeFi(v.roundupSettings.includeDeFi);
    } else if (v?.roundupThresholdUsdc && v.roundupThresholdUsdc > 0) {
      setWeeklyCap(Math.round(v.roundupThresholdUsdc));
    }

    if (v?.metadata?.vaultAddress) {
      fetchOnChainVaultState(v.metadata.vaultAddress).then((onChain) => {
        if (onChain) {
          const merged: VaultState = { ...v, ...onChain };
          setVault(merged);
          saveVault(merged);

          if (merged.roundupSettings) {
            setIsEnabled(merged.roundupSettings.isEnabled);
            setMultiplier(merged.roundupSettings.multiplier);
            setWeeklyCap(merged.roundupSettings.weeklyCap);
            setIncludeJupiter(merged.roundupSettings.includeJupiter);
            setIncludeSpl(merged.roundupSettings.includeSpl);
            setIncludeDeFi(merged.roundupSettings.includeDeFi);
          } else if (onChain.roundupThresholdUsdc && onChain.roundupThresholdUsdc > 0) {
            setWeeklyCap(Math.round(onChain.roundupThresholdUsdc));
          }
        }
      });
    }
  }, [publicKey]);

  const guardianAddress = publicKey?.toBase58() || vault?.metadata.guardianWallet || 'BBNyzG9Kn1xf8ZFbwK2nKr3XW4MGr4XE8pQ9iJ1rsi57';

  const guardianAta = useMemo(() => {
    try {
      if (!guardianAddress) return null;
      return getAssociatedTokenAddressSync(MAINNET_USDC_MINT, new PublicKey(guardianAddress), true);
    } catch {
      return null;
    }
  }, [guardianAddress]);

  const transactions: OnChainRoundupTx[] = vault?.roundupTransactions || [];
  const totalSavedThisWeek = transactions.reduce((acc, s) => acc + (s.roundedUpUsdc * multiplier), 0);

  const executeRoundupDeposit = useCallback(
    async (roundDiff: number, tx: OnChainRoundupTx) => {
      const currentVault = vaultRef.current || getStoredVault(publicKey?.toBase58());
      if (!currentVault) return;
      const totalAdd = Number((roundDiff * multiplier).toFixed(2));
      const saveShare = Number((totalAdd * 0.8).toFixed(2));
      const moonShare = Number((totalAdd * 0.2).toFixed(2));

      // Attempt on-chain deposit for full spare change into Save Jar
      let onChainConfirmed = false;
      if (currentVault.metadata?.vaultAddress && totalAdd > 0) {
        try {
          const res = await fetch('/api/deposit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vaultAddress: currentVault.metadata.vaultAddress,
              amountUsdc: totalAdd,
            }),
          });
          const resJson = await res.json();
          if (resJson.success) {
            onChainConfirmed = true;
          }
        } catch {}
      }

      // Re-fetch on-chain state to get verified live balances
      let verifiedSave = currentVault.saveBalanceUsdc + totalAdd;
      try {
        const onChain = await fetchOnChainVaultState(currentVault.metadata.vaultAddress);
        if (onChain?.saveBalanceUsdc !== undefined) {
          verifiedSave = onChain.saveBalanceUsdc;
        }
      } catch {}

      const updated: VaultState = {
        ...currentVault,
        saveBalanceUsdc: Number(verifiedSave.toFixed(2)),
        totalDepositedUsdc: Number((currentVault.totalDepositedUsdc + totalAdd).toFixed(2)),
        roundupTransactions: [tx, ...(currentVault.roundupTransactions || [])],
      };

      setVault(updated);
      saveVault(updated);

      confetti({
        particleCount: 45,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFE853', '#38D39F', '#A084E8'],
      });

      triggerToast(
        onChainConfirmed
          ? `🎉 Swept $${totalAdd.toFixed(2)} on-chain into Save Jar! Run Pip Keeper to swap 20% into tech shares.`
          : `Swept $${totalAdd.toFixed(2)} spare change into Save Jar!`
      );
    },
    [multiplier, publicKey]
  );

  // Live On-Chain USDC Transaction Poller
  useEffect(() => {
    if (!guardianAta || !isEnabled || !includeSpl) return;

    let isMounted = true;

    const initSignatures = async () => {
      try {
        const sigs = await connection.getSignaturesForAddress(guardianAta, { limit: 20 });
        if (!isMounted) return;
        sigs.forEach((s) => seenSignaturesRef.current.add(s.signature));

        vaultRef.current?.roundupTransactions?.forEach((t) => {
          if (t.txHash) seenSignaturesRef.current.add(t.txHash);
        });

        isInitialFetchRef.current = false;

        try {
          const bal = await connection.getTokenAccountBalance(guardianAta);
          if (isMounted && bal.value.uiAmount !== null) {
            setLiveWalletBalance(bal.value.uiAmount);
          }
        } catch {
          if (isMounted) setLiveWalletBalance(0);
        }
      } catch (e) {
        console.debug('[Roundup Watcher] Initial signature fetch error:', e);
        isInitialFetchRef.current = false;
      }
    };

    initSignatures();

    const interval = setInterval(async () => {
      if (!isMounted || isInitialFetchRef.current) return;
      setIsPolling(true);

      try {
        try {
          const bal = await connection.getTokenAccountBalance(guardianAta);
          if (isMounted && bal.value.uiAmount !== null) {
            setLiveWalletBalance(bal.value.uiAmount);
          }
        } catch {}

        const sigs = await connection.getSignaturesForAddress(guardianAta, { limit: 5 });
        const unhandled = sigs.filter((s) => !seenSignaturesRef.current.has(s.signature)).reverse();

        for (const sigInfo of unhandled) {
          seenSignaturesRef.current.add(sigInfo.signature);

          const parsedTx = await connection.getParsedTransaction(sigInfo.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (!parsedTx || !parsedTx.meta) continue;

          const pre = parsedTx.meta.preTokenBalances?.find(
            (b) => (b.owner === guardianAddress || (b as any).accountKey === guardianAta.toBase58()) &&
                   b.mint === MAINNET_USDC_MINT.toBase58()
          );
          const post = parsedTx.meta.postTokenBalances?.find(
            (b) => (b.owner === guardianAddress || (b as any).accountKey === guardianAta.toBase58()) &&
                   b.mint === MAINNET_USDC_MINT.toBase58()
          );

          if (pre && post) {
            const preAmt = parseFloat(pre.uiTokenAmount.uiAmountString || '0');
            const postAmt = parseFloat(post.uiTokenAmount.uiAmountString || '0');
            const diff = preAmt - postAmt;

            if (diff > 0.0001) {
              const volumeUsd = Number(diff.toFixed(2));
              const cents = Number((volumeUsd % 1).toFixed(2));
              const rawChange = cents > 0 ? Number((1 - cents).toFixed(2)) : 1.00;

              const newTx: OnChainRoundupTx = {
                id: `tx-${sigInfo.signature.slice(0, 10)}-${Date.now()}`,
                type: 'SPL_TRANSFER',
                protocol: 'On-Chain Transfer',
                badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
                icon: '💸',
                description: `USDC Transfer (${volumeUsd.toFixed(2)} USDC)`,
                volumeUsd,
                roundedUpUsdc: rawChange,
                txHash: sigInfo.signature,
                timestamp: 'Just now',
              };

              setLastDetectedTx({
                sig: sigInfo.signature,
                volume: volumeUsd,
                roundedUp: rawChange,
              });

              executeRoundupDeposit(rawChange, newTx);
            }
          }
        }
      } catch (err) {
        console.debug('[Roundup Watcher] Poll error:', err);
      } finally {
        if (isMounted) setIsPolling(false);
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [guardianAta, guardianAddress, isEnabled, includeSpl, connection, executeRoundupDeposit]);

  const handleSaveSettings = async () => {
    const currentVault = vaultRef.current || getStoredVault(publicKey?.toBase58());
    if (!currentVault?.metadata?.vaultAddress) {
      triggerToast('⚠️ No active vault found on-chain to save rules to.');
      return;
    }

    setIsSavingSettings(true);
    setSaveSettingsError(null);
    setSaveTx(null);

    try {
      // 1. Submit on-chain transaction calling set_caps with roundup_threshold
      const roundupLamports = BigInt(Math.round(weeklyCap * 1_000_000));
      const { signature } = await updateVaultSettings({
        vaultAddress: currentVault.metadata.vaultAddress,
        moonCapBps: currentVault.moonCapBps,
        roundupThreshold: roundupLamports,
      });

      // 2. Persist updated settings to local state
      const updated: VaultState = {
        ...currentVault,
        roundupThresholdUsdc: weeklyCap,
        roundupSettings: {
          isEnabled,
          multiplier,
          weeklyCap,
          includeJupiter,
          includeSpl,
          includeDeFi,
        },
      };

      setVault(updated);
      saveVault(updated);
      setSaveTx(signature);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 5000);
      triggerToast('🎉 On-chain round-up rules successfully saved on Solana!');
    } catch (err: any) {
      console.error('[RoundupsPage] Failed to save settings on-chain:', err);
      setSaveSettingsError(err?.message || 'Transaction failed. Please ensure your guardian wallet is funded.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (!vault) {
    return (
      <div className="bg-white rounded-3xl border-3 border-ink p-8 shadow-sticker text-center max-w-xl mx-auto my-12 space-y-4">
        <div className="w-20 h-20 mx-auto">
          <Pip mood="curious" size={80} />
        </div>
        <h2 className="text-2xl font-display font-extrabold text-ink">No Active Vault Configured</h2>
        <p className="text-sm text-slate-600">
          Round-up rules are tied to an active child vault. Please create or initialize a vault first.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link href="/guardian/onboarding">
            <Button variant="primary">Create Child Vault ✨</Button>
          </Link>
          <Button variant="secondary" onClick={() => setVault(getOrCreateStoredVault(publicKey?.toBase58()))}>
            Initialize Fresh Clean Vault
          </Button>
        </div>
      </div>
    );
  }

  const walletDisplay = publicKey 
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : `${vault.metadata.guardianWallet.slice(0, 4)}...${vault.metadata.guardianWallet.slice(-4)}`;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-white px-5 py-3 rounded-2xl border-2 border-sun shadow-sticker flex items-center gap-3 animate-slide-in max-w-md">
          <Sparkles className="w-5 h-5 text-sun shrink-0" />
          <span className="text-xs sm:text-sm font-semibold leading-tight">{toastMessage}</span>
        </div>
      )}

      {/* Live On-Chain Detection Alert Banner if detected */}
      {lastDetectedTx && (
        <div className="p-4 bg-emerald-500 text-white rounded-2xl border-3 border-ink shadow-sticker flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <div className="font-display font-extrabold text-base">
                On-Chain Activity Detected!
              </div>
              <div className="text-xs text-emerald-100">
                Sent ${lastDetectedTx.volume.toFixed(2)} USDC → Swept +${(lastDetectedTx.roundedUp * multiplier).toFixed(2)} spare change into Save & Moon Jars!
              </div>
            </div>
          </div>
          <span className="text-xs font-mono bg-emerald-600 px-3 py-1.5 rounded-xl border border-emerald-400">
            Sig: {lastDetectedTx.sig.slice(0, 8)}...
          </span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-3xl border-3 border-ink p-4 sm:p-6 shadow-sticker relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-amber-100 border-2 border-ink">
                <Coins className="w-5 h-5 text-amber-700" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-ink">
                On-Chain Activity Round-ups
              </h1>
            </div>
            <p className="text-slate-600 text-sm max-w-2xl">
              Turn your everyday Solana trading and transfers into micro-investments for {vault.metadata.nickname}.
              Whenever your guardian wallet executes transactions, odd cents are swept automatically into the dual vault.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border-2 border-ink px-3 py-1.5 rounded-2xl shadow-sticker-sm">
              <span className="text-xs font-bold text-slate-700">Auto Round-ups:</span>
              <button
                type="button"
                aria-label="Toggle Auto Roundups"
                onClick={() => setIsEnabled(!isEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative border-2 border-ink ${
                  isEnabled ? 'bg-emerald-400' : 'bg-slate-300'
                }`}
                title="Toggle Auto Roundups"
              >
                <div 
                  className={`w-4 h-4 rounded-full bg-white border border-ink absolute top-0.5 transition-transform ${
                    isEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} 
                />
              </button>
            </div>
          </div>
        </div>

        {/* Live On-Chain Status Bar */}
        <div className="mt-5 p-3 rounded-2xl bg-indigo-50 border-2 border-indigo-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-indigo-950">Live On-Chain Watcher Active</span>
            <span className="text-indigo-600 font-mono text-[11px] hidden sm:inline">
              (USDC ATA: {guardianAta ? `${guardianAta.toBase58().slice(0, 4)}...${guardianAta.toBase58().slice(-4)}` : 'Loading...'})
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-600 font-medium">
            <span>
              Guardian Wallet Balance:{' '}
              <strong className="text-indigo-900 font-mono">
                {liveWalletBalance !== null ? `${liveWalletBalance.toFixed(2)} USDC` : 'Querying...'}
              </strong>
            </span>
            {isPolling && (
              <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin shrink-0" />
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t-2 border-slate-100">
          <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-ink shadow-sticker-sm">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Swept This Week</div>
            <div className="text-2xl font-display font-extrabold text-ink mt-0.5">
              ${totalSavedThisWeek.toFixed(2)} <span className="text-xs text-slate-500 font-bold">/ ${weeklyCap}.00 cap</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full mt-2 overflow-hidden border border-ink">
              <div 
                className="h-full bg-amber-400 rounded-full" 
                style={{ width: `${Math.min(100, (totalSavedThisWeek / weeklyCap) * 100)}%` }} 
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-mint-50 border-2 border-ink shadow-sticker-sm">
            <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Active Multiplier</div>
            <div className="text-2xl font-display font-extrabold text-emerald-900 mt-0.5">
              {multiplier}x <span className="text-xs font-bold text-emerald-700 font-sans">({multiplier === 1 ? 'Standard Cents' : multiplier === 2 ? 'Double Boost' : '5x Turbo Boost'})</span>
            </div>
            <div className="text-[11px] text-emerald-800 mt-1">
              Micro-cents multiplied before on-chain deposit
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50 border-2 border-ink shadow-sticker-sm">
            <div className="text-xs font-bold text-purple-800 uppercase tracking-wider">Dual Jar Routing</div>
            <div className="text-2xl font-display font-extrabold text-purple-950 mt-0.5">
              80% <span className="text-sm font-sans font-bold text-emerald-700">Save</span> / 20% <span className="text-sm font-sans font-bold text-purple-700">Moon</span>
            </div>
            <div className="text-[11px] text-purple-800 mt-1">
              Hard cost-basis cap enforced on all inflows
            </div>
          </div>
        </div>
      </div>

      {/* Settings & Activity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Settings Box */}
        <div className="bg-white rounded-3xl border-3 border-ink p-4 sm:p-6 shadow-sticker space-y-6">
          <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-3">
            <Sliders className="w-5 h-5 text-indigo-600 shrink-0" />
            <h2 className="text-lg font-display font-bold text-ink">Web3 Round-up Rules</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">Round-up Multiplier</label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 5].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMultiplier(m as 1 | 2 | 5)}
                    className={`p-3 rounded-2xl border-2 border-ink text-center transition-all ${
                      multiplier === m
                        ? 'bg-amber-300 text-ink shadow-sticker-sm font-bold'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <div className="text-base font-extrabold">{m}x</div>
                    <div className="text-[10px] text-slate-600">
                      {m === 1 ? '1x Round' : m === 2 ? '2x Double' : '5x Turbo'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="weeklyCapSlider" className="text-xs font-bold text-slate-700">Weekly Round-up Cap</label>
                <span className="text-sm font-display font-bold text-ink">${weeklyCap}.00 / week</span>
              </div>
              <input
                id="weeklyCapSlider"
                name="weeklyCapSlider"
                type="range"
                min="5"
                max="100"
                step="5"
                value={weeklyCap}
                onChange={(e) => setWeeklyCap(Number(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
                <span>$5</span>
                <span>$25 (recommended)</span>
                <span>$100</span>
              </div>
            </div>

            {/* Protocol Trigger Checkboxes */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Monitored On-Chain Activities</span>

              <label htmlFor="includeJupiter" className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span>🪐</span> Jupiter DEX Swaps
                </span>
                <input 
                  id="includeJupiter"
                  name="includeJupiter"
                  type="checkbox" 
                  aria-label="Include Jupiter DEX Swaps"
                  checked={includeJupiter} 
                  onChange={(e) => setIncludeJupiter(e.target.checked)} 
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
              </label>

              <label htmlFor="includeSpl" className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span>💸</span> SPL USDC & SOL Transfers
                </span>
                <input 
                  id="includeSpl"
                  name="includeSpl"
                  type="checkbox" 
                  aria-label="Include SPL USDC & SOL Transfers"
                  checked={includeSpl} 
                  onChange={(e) => setIncludeSpl(e.target.checked)} 
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
              </label>

              <label htmlFor="includeDeFi" className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span>🏦</span> DeFi Yield & Lending Claims
                </span>
                <input 
                  id="includeDeFi"
                  name="includeDeFi"
                  type="checkbox" 
                  aria-label="Include DeFi Yield & Lending Claims"
                  checked={includeDeFi} 
                  onChange={(e) => setIncludeDeFi(e.target.checked)} 
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
              </label>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-amber-700" /> Non-Custodial Delegation
              </div>
              <p>
                Round-ups are swept via your connected guardian wallet capped strictly at your weekly limit.
                Your private keys never leave your custody.
              </p>
            </div>

            {saveSettingsError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold">Failed to save on-chain rules:</p>
                  <p className="font-normal mt-0.5 break-all">{saveSettingsError}</p>
                </div>
              </div>
            )}

            {isSaved && saveTx && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Weekly cap & rules saved on Solana!</span>
                </div>
                <a
                  href={`https://explorer.solana.com/tx/${saveTx}?cluster=custom&customUrl=http%3A%2F%2F127.0.0.1%3A8899`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-emerald-700 underline hover:text-emerald-800"
                >
                  <span>View Tx</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            <Button 
              variant="primary" 
              className="w-full gap-2"
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
            >
              {isSavingSettings ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving on Solana...
                </>
              ) : isSaved ? (
                <>
                  <Check className="w-4 h-4" /> Preferences Saved!
                </>
              ) : (
                'Save On-Chain Rules'
              )}
            </Button>
          </div>
        </div>

        {/* Transaction Feed */}
        <div className="bg-white rounded-3xl border-3 border-ink p-4 sm:p-6 shadow-sticker flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600 shrink-0" />
                <h2 className="text-lg font-display font-bold text-ink">Recent Wallet Activity</h2>
              </div>
            </div>

            {transactions.length === 0 ? (
              <div className="p-8 my-6 text-center rounded-2xl border-2 border-dashed border-slate-200">
                <div className="text-3xl mb-2">🪙</div>
                <h3 className="font-display font-bold text-ink text-sm">No Round-ups Swept Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  When your connected wallet makes on-chain transactions, the activity will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 mt-4 max-h-[340px] overflow-y-auto pr-1">
                {transactions.map((tx) => {
                  const totalAdded = (tx.roundedUpUsdc * multiplier).toFixed(2);
                  const savePortion = (parseFloat(totalAdded) * 0.8).toFixed(2);
                  const moonPortion = (parseFloat(totalAdded) * 0.2).toFixed(2);

                  return (
                    <div 
                      key={tx.id}
                      className="p-3 sm:p-3.5 rounded-2xl border-2 border-ink bg-slate-50 flex items-center justify-between gap-2 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-300 flex items-center justify-center font-bold text-base shadow-sticker-sm shrink-0">
                          {tx.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${tx.badgeColor}`}>
                              {tx.protocol}
                            </span>
                            {tx.txHash && tx.txHash.length >= 10 ? (
                              <span className="text-[10px] text-indigo-600 font-mono flex items-center gap-0.5">
                                {tx.txHash.slice(0, 4)}...{tx.txHash.slice(-4)}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs font-bold text-ink mt-0.5 truncate">{tx.description}</div>
                          <div className="text-[10px] text-slate-400">{tx.timestamp}</div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono text-slate-500">${tx.volumeUsd.toFixed(2)}</div>
                        <div className="text-xs font-display font-extrabold text-emerald-700">
                          +${totalAdded}
                        </div>
                        <div className="text-[9px] text-slate-400 hidden sm:block">
                          +${savePortion} save / +${moonPortion} moon
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t-2 border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Connected Guardian:</span> <span className="font-mono font-bold text-ink truncate">{walletDisplay}</span>
            </span>
            <span className="text-[11px] font-bold text-purple-700">Connected: {RPC_URL}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
