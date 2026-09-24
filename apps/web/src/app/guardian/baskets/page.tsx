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
import { BASKET_PRESETS, getPriceCheck, calculatePremiumPct } from '@moonjar/shared';
import { Check, AlertCircle, Save } from 'lucide-react';

export default function BasketsPage() {
  const [vault, setVault] = useState<VaultState | null>(null);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [capPct, setCapPct] = useState(20);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const { tokens, getToken } = usePreStocks();
  const { publicKey } = useGuardianWallet();

  useEffect(() => {
    if (!publicKey) {
      setVault(null);
      return;
    }
    const v = getStoredVault(publicKey.toBase58());
    setVault(v);
    if (v) {
      setCapPct(v.moonCapBps / 100);
      const initialWeights: Record<string, number> = {};
      tokens.forEach((p) => {
        const match = v.allocations.find((a) => a.symbol === p.symbol);
        initialWeights[p.symbol] = match ? match.weightBps / 100 : 0;
      });
      setWeights(initialWeights);
    }
  }, [publicKey, tokens]);

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
    const preset = BASKET_PRESETS.find((p) => p.id === presetId);
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

  const handleSave = () => {
    if (!isValidTotal) return;

    const newAllocations = Object.entries(weights)
      .filter(([_, w]) => w > 0)
      .map(([sym, w]) => {
        const item = getToken(sym);
        const existing = vault.allocations.find((a) => a.symbol === sym);
        return {
          symbol: sym,
          mint: item.contract_address,
          weightBps: w * 100,
          sharesOwned: existing ? existing.sharesOwned : 0,
          currentValueUsd: existing ? existing.currentValueUsd : 0,
        };
      });

    const updated: VaultState = {
      ...vault,
      moonCapBps: capPct * 100,
      allocations: newAllocations,
    };

    setVault(updated);
    saveVault(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 sm:p-6 rounded-3xl border-3 border-ink shadow-sticker">
        <h1 className="text-xl sm:text-2xl font-black font-display text-ink">Baskets & Safety Caps</h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Customize which PreStocks {vault.metadata.nickname}'s Moon Jar can buy, and set the strict overall portfolio cap.
        </p>
      </div>

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
          {BASKET_PRESETS.map((preset) => (
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
            const prem = calculatePremiumPct(token.tokenPrice, token.markPrice);
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
                    <span className="text-xs font-numbers text-slate-600">${token.tokenPrice.toFixed(2)}</span>
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
            disabled={!isValidTotal}
            onClick={handleSave}
            className="flex items-center gap-2"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" /> Changes Saved!
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
