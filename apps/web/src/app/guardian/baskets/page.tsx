'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getStoredVault, getOrCreateStoredVault, saveVault, VaultState } from '@/lib/store';
import { usePreStocks } from '@/lib/usePreStocks';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { PriceTagPill } from '@/components/ui/PriceTagPill';
import { Pip } from '@/components/mascot/Pip';
import { useGuardianWallet } from '@/components/providers/PrivySolanaProvider';
import { getBasketPresets, getPreStockMint, getPriceCheck, calculatePremiumPct } from '@moonjar/shared';
import { RPC_URL, fetchAllOnChainVaults, fetchOnChainVaultState } from '@/lib/onchain';
import { PublicKey } from '@solana/web3.js';
import { Check, AlertCircle, Save, Loader2, ExternalLink } from 'lucide-react';

export default function BasketsPage() {
  const isDevnet = RPC_URL.includes('devnet');
  const basketPresets = getBasketPresets(isDevnet);

  const [vault, setVault] = useState<VaultState | null>(null);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [capPct, setCapPct] = useState(20);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveTx, setSaveTx] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoadingVault, setIsLoadingVault] = useState(true);

  const { tokens, getToken } = usePreStocks();
  const { connected, authenticated, publicKey, updateVaultSettings, login } = useGuardianWallet();

  // Load and sync live on-chain vault state
  useEffect(() => {
    let isMounted = true;

    async function loadVault() {
      if (!publicKey) {
        setVault(null);
        setIsLoadingVault(false);
        return;
      }

      setIsLoadingVault(true);

      try {
        // 1. Resolve on-chain vault address for the connected guardian
        const all = await fetchAllOnChainVaults();
        const myVault = all.find((v) => v.guardian === publicKey.toBase58());
        const vaultAddress =
          myVault?.address ||
          getStoredVault(publicKey.toBase58())?.metadata?.vaultAddress;

        if (vaultAddress) {
          const onChain = await fetchOnChainVaultState(vaultAddress, tokens);
          const local =
            getStoredVault(publicKey.toBase58()) ||
            getOrCreateStoredVault(publicKey.toBase58(), vaultAddress);

          if (onChain && isMounted) {
            const merged: VaultState = {
              ...local,
              ...onChain,
              metadata: {
                ...local.metadata,
                vaultAddress,
                guardianWallet: publicKey.toBase58(),
              },
            };

            setVault(merged);
            setCapPct(Math.round(merged.moonCapBps / 100));

            const initialWeights: Record<string, number> = {};
            tokens.forEach((p) => {
              const match = merged.allocations.find((a) => a.symbol === p.symbol);
              initialWeights[p.symbol] = match ? match.weightBps / 100 : 0;
            });
            setWeights(initialWeights);
            saveVault(merged);
            setIsLoadingVault(false);
            return;
          }
        }

        // Fallback to local stored vault if on-chain fetch is empty
        const local = getStoredVault(publicKey.toBase58());
        if (isMounted) {
          setVault(local);
          if (local) {
            setCapPct(Math.round(local.moonCapBps / 100));
            const initialWeights: Record<string, number> = {};
            tokens.forEach((p) => {
              const match = local.allocations.find((a) => a.symbol === p.symbol);
              initialWeights[p.symbol] = match ? match.weightBps / 100 : 0;
            });
            setWeights(initialWeights);
          }
        }
      } catch (err) {
        console.warn('[BasketsPage] Failed to fetch live on-chain vault:', err);
      } finally {
        if (isMounted) setIsLoadingVault(false);
      }
    }

    loadVault();

    return () => {
      isMounted = false;
    };
  }, [publicKey, tokens]);

  if (isLoadingVault) {
    return (
      <div className="bg-white rounded-3xl border-3 border-ink p-8 shadow-sticker text-center max-w-xl mx-auto my-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
        <p className="text-sm font-bold text-slate-600">Reading on-chain vault settings...</p>
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="bg-white rounded-3xl border-3 border-ink p-8 shadow-sticker text-center max-w-xl mx-auto my-12 space-y-4">
        <div className="w-20 h-20 mx-auto">
          <Pip mood="curious" size={80} />
        </div>
        <h2 className="text-2xl font-display font-extrabold text-ink">No Active Vault Configured</h2>
        <p className="text-sm text-slate-600">
          Basket allocations and safety caps are configured on a per-vault basis. Please create a vault first.
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

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const isValidTotal = totalWeight === 100;

  const applyPreset = (presetId: string) => {
    const preset = basketPresets.find((p) => p.id === presetId);
    if (!preset) return;
    const newWeights: Record<string, number> = {};
    tokens.forEach((p) => {
      const entry = preset.entries.find((e) => e.symbol === p.symbol);
      newWeights[p.symbol] = entry ? entry.weightBps / 100 : 0;
    });
    setWeights(newWeights);
  };

  const handleWeightChange = (symbol: string, val: number) => {
    setWeights((prev) => ({
      ...prev,
      [symbol]: val,
    }));
  };

  const handleSave = async () => {
    if (!isValidTotal || !vault?.metadata?.vaultAddress) return;

    if (!authenticated) {
      login();
      return;
    }

    if (!connected || !publicKey) {
      setSaveError('Guardian wallet is still initializing. Please wait a few moments.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveTx(null);
    setSavedSuccess(false);

    try {
      const basketEntries: Array<{ mint: PublicKey; weightBps: number }> = [];
      const newAllocations = Object.entries(weights)
        .filter(([_, w]) => w > 0)
        .map(([sym, w]) => {
          const item = getToken(sym);
          const existing = vault.allocations.find((a) => a.symbol === sym);
          const weightBps = Math.round(w * 100);
          const mintAddress = getPreStockMint(sym, isDevnet);
          basketEntries.push({
            mint: new PublicKey(mintAddress),
            weightBps,
          });
          return {
            symbol: sym,
            mint: mintAddress,
            weightBps,
            sharesOwned: existing ? existing.sharesOwned : 0,
            currentValueUsd: existing ? existing.currentValueUsd : 0,
          };
        });

      // 1. Submit on-chain transaction calling set_basket and set_caps
      const { signature } = await updateVaultSettings({
        vaultAddress: vault.metadata.vaultAddress,
        moonCapBps: capPct * 100,
        basket: basketEntries,
      });

      // 2. Update local state
      const updated: VaultState = {
        ...vault,
        moonCapBps: capPct * 100,
        allocations: newAllocations,
      };

      setVault(updated);
      saveVault(updated);
      setSaveTx(signature);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 5000);
    } catch (err: any) {
      console.error('[BasketsPage] Failed to save basket on-chain:', err);
      setSaveError(err?.message || 'Transaction failed. Please ensure your guardian wallet is funded.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 sm:p-6 rounded-3xl border-3 border-ink shadow-sticker">
        <h1 className="text-xl sm:text-2xl font-black font-display text-ink">Baskets & Safety Caps</h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Customize which PreStocks {vault.metadata.nickname}&apos;s Moon Jar can buy, and set the strict overall portfolio cap.
        </p>
      </div>

      {saveError && (
        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 flex items-start gap-2.5 text-xs font-bold">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold">Failed to update settings on-chain:</p>
            <p className="font-normal mt-0.5 break-all">{saveError}</p>
          </div>
        </div>
      )}

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 flex items-center justify-between text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Successfully updated basket and safety cap on Solana!</span>
          </div>
          {saveTx && (
            <a
              href={`https://explorer.solana.com/tx/${saveTx}?cluster=custom&customUrl=http%3A%2F%2F127.0.0.1%3A8899`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-emerald-700 underline hover:text-emerald-800"
            >
              <span>View Tx</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Cap Configuration */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border-3 border-ink shadow-sticker space-y-4">
        <h2 className="text-base sm:text-lg font-bold font-display text-ink">Maximum Moon Jar Allocation</h2>
        <p className="text-xs text-slate-500">
          The smart contract enforces that cumulative spending on PreStocks will never exceed this percentage of total deposits. The remainder always stays safe in USDC.
        </p>
        <Slider
          label="Safety Cap"
          min={5}
          max={50}
          value={capPct}
          onChange={setCapPct}
          color="grape"
          formatValue={(v) => `${v}% of Total Savings`}
        />
      </div>

      {/* Preset Baskets */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border-3 border-ink shadow-sticker space-y-4">
        <h2 className="text-base sm:text-lg font-bold font-display text-ink">Preset Baskets</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {basketPresets.map((preset) => (
            <div
              key={preset.id}
              className="p-3.5 sm:p-4 rounded-2xl border-2 border-ink bg-slate-50 flex flex-col justify-between"
            >
              <div>
                <h3 className="font-display font-bold text-base text-ink">{preset.name}</h3>
                <p className="text-xs text-slate-600 mt-1">{preset.description}</p>
                <div className="mt-3 space-y-1">
                  {preset.entries.map((e) => (
                    <div key={e.symbol} className="text-xs flex justify-between text-slate-500 font-medium">
                      <span>{e.symbol}</span>
                      <span>{e.weightBps / 100}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4 text-xs py-1.5"
                onClick={() => applyPreset(preset.id)}
              >
                Apply Preset
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Weight Allocations */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border-3 border-ink shadow-sticker space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold font-display text-ink">Token Allocation Weights</h2>
            <p className="text-xs text-slate-500">Weights must sum up to exactly 100%.</p>
          </div>
          <div
            className={`px-3 py-1 rounded-xl border-2 border-ink font-display font-bold text-xs sm:text-sm self-start sm:self-auto ${
              isValidTotal ? 'bg-green-100 text-green-900' : 'bg-rose-100 text-rose-900'
            }`}
          >
            Total: {totalWeight}%
          </div>
        </div>

        <div className="space-y-4 divide-y divide-slate-100">
          {tokens.map((token) => {
            const tokenPrice = Number(token.tokenPrice ?? 0);
            const markPrice = Number(token.markPrice ?? 0);
            const prem = calculatePremiumPct(tokenPrice, markPrice);
            const status = getPriceCheck(prem);
            const val = weights[token.symbol] || 0;

            return (
              <div key={token.symbol} className="pt-4 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                <div className="w-full md:w-64">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-base text-ink">{token.name}</span>
                    <span className="text-xs text-slate-400 font-mono">({token.symbol})</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-numbers text-slate-600">${tokenPrice.toFixed(2)}</span>
                    <PriceTagPill category={status.tag} />
                  </div>
                </div>

                <div className="w-full md:flex-1 max-w-md">
                  <Slider
                    label={`${token.symbol} Target Weight`}
                    min={0}
                    max={100}
                    step={5}
                    value={val}
                    onChange={(n) => handleWeightChange(token.symbol, n)}
                    color="sun"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {!isValidTotal && (
          <div className="p-3 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 flex items-center gap-2 text-xs font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Please adjust weights so the sum is exactly 100% (currently {totalWeight}%).
          </div>
        )}

        <div className="pt-4 flex justify-end">
          <Button
            variant="primary"
            size="md"
            disabled={!isValidTotal || isSaving || (authenticated && !connected)}
            onClick={!authenticated ? login : handleSave}
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving on Solana...
              </>
            ) : savedSuccess ? (
              <>
                <Check className="w-4 h-4" /> Changes Saved!
              </>
            ) : !authenticated ? (
              <>
                <span>🍯</span> Connect Guardian Wallet to Save
              </>
            ) : !connected ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Initializing Wallet...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Basket & Caps
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
