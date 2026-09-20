'use client';

import React, { useState, useEffect } from 'react';
import { getStoredVault, saveVault, VaultState } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Pip } from '@/components/mascot/Pip';
import { 
  Coins, 
  CreditCard, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  ArrowRight, 
  Plus, 
  Zap,
  Info,
  Sliders
} from 'lucide-react';

interface SimulatedSwipe {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  roundedUp: number;
  timestamp: string;
}

export default function RoundupsPage() {
  const [vault, setVault] = useState<VaultState | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const [weeklyCap, setWeeklyCap] = useState(25);
  const [isSaved, setIsSaved] = useState(false);

  const [swipes, setSwipes] = useState<SimulatedSwipe[]>([
    {
      id: 'sw-1',
      merchant: 'Blue Bottle Coffee',
      category: 'Café',
      amount: 4.65,
      roundedUp: 0.35,
      timestamp: '2 hours ago',
    },
    {
      id: 'sw-2',
      merchant: 'Trader Joe\'s',
      category: 'Groceries',
      amount: 32.18,
      roundedUp: 0.82,
      timestamp: 'Yesterday',
    },
    {
      id: 'sw-3',
      merchant: 'Barnes & Noble Books',
      category: 'Books',
      amount: 14.10,
      roundedUp: 0.90,
      timestamp: '2 days ago',
    },
    {
      id: 'sw-4',
      merchant: 'Subway Ride',
      category: 'Transit',
      amount: 2.90,
      roundedUp: 0.10,
      timestamp: '3 days ago',
    },
  ]);

  useEffect(() => {
    setVault(getStoredVault());
  }, []);

  const totalSavedThisWeek = swipes.reduce((acc, s) => acc + (s.roundedUp * multiplier), 0);

  const handleSimulateSwipe = () => {
    if (!vault) return;
    const merchants = [
      { name: 'Local Farmers Market', cat: 'Groceries' },
      { name: 'Corner Bakery', cat: 'Bakery' },
      { name: 'School Supply Depot', cat: 'Supplies' },
      { name: 'Smoothie King', cat: 'Snacks' },
    ];
    const randomM = merchants[Math.floor(Math.random() * merchants.length)];
    const randomCost = Number((2 + Math.random() * 15).toFixed(2));
    const nextWhole = Math.ceil(randomCost);
    const roundDiff = Number((nextWhole - randomCost).toFixed(2));
    const finalRound = roundDiff === 0 ? 1.00 : roundDiff;

    const newSwipe: SimulatedSwipe = {
      id: `sw-${Date.now()}`,
      merchant: randomM.name,
      category: randomM.cat,
      amount: randomCost,
      roundedUp: finalRound,
      timestamp: 'Just now',
    };

    setSwipes([newSwipe, ...swipes]);

    // Also increment save jar balance!
    const addAmt = finalRound * multiplier;
    const updated = {
      ...vault,
      saveBalanceUsdc: Number((vault.saveBalanceUsdc + addAmt).toFixed(2)),
      totalDepositedUsdc: Number((vault.totalDepositedUsdc + addAmt).toFixed(2)),
    };
    setVault(updated);
    saveVault(updated);
  };

  const handleSaveSettings = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  if (!vault) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border-3 border-ink p-6 shadow-sticker relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-amber-100 border-2 border-ink">
                <Coins className="w-5 h-5 text-amber-700" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-ink">
                Spare Change Round-ups
              </h1>
            </div>
            <p className="text-slate-600 text-sm max-w-xl">
              Turn everyday purchases into micro-savings for {vault.metadata.nickname}.
              Spare change is swept directly into the child's Save Jar on Solana.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border-2 border-ink px-3 py-1.5 rounded-2xl shadow-sticker-sm">
              <span className="text-xs font-bold text-slate-700">Auto Round-ups:</span>
              <button
                onClick={() => setIsEnabled(!isEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative border-2 border-ink ${
                  isEnabled ? 'bg-emerald-400' : 'bg-slate-300'
                }`}
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

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t-2 border-slate-100">
          <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-ink shadow-sticker-sm">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Saved This Week</div>
            <div className="text-2xl font-display font-extrabold text-ink mt-0.5">
              ${totalSavedThisWeek.toFixed(2)} <span className="text-xs text-slate-500 font-bold">/ ${weeklyCap}.00 cap</span>
            </div>
            {/* Progress bar */}
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
              {multiplier}x <span className="text-xs font-bold text-emerald-700 font-sans">({multiplier === 1 ? 'Standard' : multiplier === 2 ? 'Double boost' : 'Triple boost'})</span>
            </div>
            <div className="text-[11px] text-emerald-800 mt-1">
              Spare change is multiplied before depositing
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50 border-2 border-ink shadow-sticker-sm">
            <div className="text-xs font-bold text-purple-800 uppercase tracking-wider">Target Destination</div>
            <div className="text-2xl font-display font-extrabold text-purple-950 mt-0.5">
              Save Jar <span className="text-sm font-sans font-bold text-purple-700">(100% USDC)</span>
            </div>
            <div className="text-[11px] text-purple-800 mt-1">
              Zero market risk on daily round-ups
            </div>
          </div>
        </div>
      </div>

      {/* Settings & Simulator Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Settings Box */}
        <div className="bg-white rounded-3xl border-3 border-ink p-6 shadow-sticker space-y-6">
          <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-3">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-display font-bold text-ink">Round-up Rules</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">Round-up Multiplier</label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMultiplier(m as 1 | 2 | 3)}
                    className={`p-3 rounded-2xl border-2 border-ink text-center transition-all ${
                      multiplier === m
                        ? 'bg-amber-300 text-ink shadow-sticker-sm font-bold'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <div className="text-base font-extrabold">{m}x</div>
                    <div className="text-[10px] text-slate-600">
                      {m === 1 ? '1x Round' : m === 2 ? 'Double' : 'Triple'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Weekly Round-up Cap</label>
                <span className="text-sm font-display font-bold text-ink">${weeklyCap}.00 / week</span>
              </div>
              <input
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

            <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-amber-700" /> Solana Delegation Security
              </div>
              <p>
                Round-ups execute through an SPL Token Delegate approval capped strictly at your weekly limit.
                Your master keys remain secure in your custody.
              </p>
            </div>

            <Button 
              variant="primary" 
              className="w-full gap-2"
              onClick={handleSaveSettings}
            >
              {isSaved ? <Check className="w-4 h-4" /> : null}
              {isSaved ? 'Preferences Saved!' : 'Save Round-up Preferences'}
            </Button>
          </div>
        </div>

        {/* Transaction Simulator */}
        <div className="bg-white rounded-3xl border-3 border-ink p-6 shadow-sticker flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-display font-bold text-ink">Recent Card Activity</h2>
              </div>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={handleSimulateSwipe}
                className="gap-1.5 text-xs"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Simulate Card Swipe
              </Button>
            </div>

            <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-1">
              {swipes.map((s) => (
                <div 
                  key={s.id}
                  className="p-3 rounded-2xl border-2 border-ink bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-700">
                      ☕
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink">{s.merchant}</div>
                      <div className="text-[10px] text-slate-500">{s.category} • {s.timestamp}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-mono text-slate-500">${s.amount.toFixed(2)}</div>
                    <div className="text-xs font-display font-bold text-emerald-700">
                      +${(s.roundedUp * multiplier).toFixed(2)} saved
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t-2 border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Linked to Mock Debit Account</span>
            <span className="font-mono font-bold text-ink">•••• 4242</span>
          </div>
        </div>
      </div>
    </div>
  );
}
