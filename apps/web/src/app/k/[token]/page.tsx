'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getStoredVaultByToken, saveVault, VaultState, DEMO_VAULT } from '@/lib/store';
import { JarCard } from '@/components/ui/JarCard';
import { Pip } from '@/components/mascot/Pip';
import { Button } from '@/components/ui/Button';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  Rocket, 
  Sprout, 
  BookOpen, 
  HelpCircle, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  Heart
} from 'lucide-react';

const COMPANY_ICONS: Record<string, string> = {
  SPACEX: '🚀',
  OPENAI: '🧠',
  ANTHROPIC: '🤝',
  ANDURIL: '🛡️',
  FIGUREAI: '🤖',
  KALSHI: '🎯',
  POLYMARKET: '🔮',
  NEURALINK: '⚡',
};

import { fetchOnChainVaultState } from '@/lib/onchain';

export default function KidHomePage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [vault, setVault] = useState<VaultState>(() => getStoredVaultByToken(token));
  const [pipMood, setPipMood] = useState<'happy' | 'cheering' | 'curious'>('happy');
  const [pipMessage, setPipMessage] = useState(
    "Welcome back! Your jars are safe and snug. Tap a jar to see the coins bounce!"
  );

  useEffect(() => {
    const v = getStoredVaultByToken(token);
    setVault(v);
    if (v?.metadata?.vaultAddress && v.metadata.vaultAddress !== DEMO_VAULT.metadata.vaultAddress) {
      fetchOnChainVaultState(v.metadata.vaultAddress).then((onChain) => {
        if (onChain) {
          const updated = { ...v, ...onChain };
          setVault(updated);
          saveVault(updated);
        }
      });
    }
  }, [token]);

  const handleTapSaveJar = () => {
    setPipMood('cheering');
    setPipMessage("Clink! That's your Save Jar staying rock-solid in safe digital dollars!");
    confetti({
      particleCount: 25,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#38D39F', '#FFE853', '#FFA9E7'],
    });
  };

  const handleTapMoonJar = () => {
    setPipMood('curious');
    setPipMessage("Whoosh! Your Moon Jar holds real pieces of companies building rockets and AI robots!");
    confetti({
      particleCount: 30,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#A084E8', '#6366F1', '#FFE853'],
    });
  };

  const totalValue = (vault.saveBalanceUsdc || 0) + (vault.moonBalanceUsdc || 0);
  const savePct = totalValue > 0 ? Math.round(((vault.saveBalanceUsdc || 0) / totalValue) * 100) : 100;
  const moonPct = 100 - savePct;
  const activeAllocations = vault.allocations.filter((a) => a.sharesOwned > 0);

  return (
    <div className="space-y-6">
      {/* Pip Greeting Speech Bubble */}
      <div className="bg-white rounded-3xl border-3 border-ink p-4 sm:p-5 shadow-sticker flex items-center gap-3 sm:gap-6 relative overflow-hidden">
        <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 cursor-pointer flex items-center justify-center" onClick={() => setPipMood('happy')}>
          <Pip mood={pipMood} size={72} />
        </div>

        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] sm:text-xs font-display font-black text-purple-700 uppercase tracking-wider bg-purple-100 px-2 sm:px-2.5 py-0.5 rounded-full border border-purple-300">
              Pip The Savings Guide
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1 font-bold">
              <Clock className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> Snapshot from earlier today
            </span>
          </div>
          <p className="font-display font-extrabold text-sm sm:text-lg text-ink leading-snug">
            "{pipMessage}"
          </p>
        </div>
      </div>

      {/* Snapshot Note: Calm Psychology */}
      <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between text-xs text-slate-500 font-bold px-2 gap-1">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          Zero price anxiety mode: updated once daily
        </span>
        <span>Total: ${(totalValue ?? 0).toFixed(2)}</span>
      </div>

      {/* Dual Tactile Jars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Save Jar Card */}
        <div className="cursor-pointer transition-transform active:scale-98" onClick={handleTapSaveJar}>
          <JarCard
            type="save"
            balanceUsdc={vault.saveBalanceUsdc}
            totalGoalUsdc={Math.max(100, vault.totalDepositedUsdc)}
            percentageOfPortfolio={savePct}
            status="Safe & Steady (USDC)"
            isPaused={vault.isPaused}
          />
        </div>

        {/* Moon Jar Card */}
        <div className="cursor-pointer transition-transform active:scale-98" onClick={handleTapMoonJar}>
          <JarCard
            type="moon"
            balanceUsdc={vault.moonBalanceUsdc}
            costBasisUsdc={vault.moonCostBasisUsdc}
            percentageOfPortfolio={moonPct}
            capPercentage={vault.moonCapBps / 100}
            status="Growing Companies"
            isPaused={vault.isPaused}
          />
        </div>
      </div>

      {/* Companies Peek inside Moon Jar */}
      <div className="bg-white rounded-3xl border-3 border-ink p-4 sm:p-6 shadow-sticker space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-purple-600" />
            <h2 className="text-base sm:text-lg font-display font-extrabold text-ink">
              Inside Your Moon Jar
            </h2>
          </div>
          <Link 
            href={`/k/${token}/moon`}
            className="text-xs font-display font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1"
          >
            See all companies <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {activeAllocations.length === 0 ? (
          <div className="p-5 sm:p-6 rounded-2xl border-2 border-dashed border-slate-200 text-center py-6 sm:py-8">
            <div className="text-3xl mb-1.5">🚀</div>
            <p className="text-sm font-display font-bold text-ink">Your Moon Jar is ready to explore!</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              As your Save Jar grows, Pip will check valuations and add company slices within your {vault.moonCapBps / 100}% safety cap.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {activeAllocations.map((item) => (
              <Link
                key={item.symbol}
                href={`/k/${token}/company/${item.symbol.toLowerCase()}`}
                className="p-3.5 rounded-2xl border-2 border-ink bg-slate-50 hover:bg-purple-50 transition-all shadow-sticker-sm flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-100 border border-ink flex items-center justify-center font-bold text-sm text-purple-900 shrink-0">
                  {COMPANY_ICONS[item.symbol] || '🏢'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display font-extrabold text-sm text-ink group-hover:text-purple-900 truncate">
                    {item.symbol}
                  </div>
                  <div className="text-[11px] text-slate-500 font-bold truncate">
                    ${(item.currentValueUsd ?? 0).toFixed(2)} • {(item.sharesOwned ?? 0) >= 1 ? (item.sharesOwned ?? 0).toFixed(2) : (item.sharesOwned ?? 0).toFixed(4)} shares
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Kid Exploration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Garden Card */}
        <Link
          href={`/k/${token}/garden`}
          className="p-5 sm:p-6 rounded-3xl border-3 border-ink bg-emerald-50 hover:bg-emerald-100 transition-all shadow-sticker flex flex-col justify-between group"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white border-2 border-ink flex items-center justify-center text-2xl shadow-sticker-sm">
              🌱
            </div>
            <h3 className="font-display font-extrabold text-lg text-ink">The Compound Garden</h3>
            <p className="text-sm text-emerald-950 font-medium leading-relaxed">
              Water your tree with small regular coins and watch patience transform a tiny sprout into a giant guardian oak!
            </p>
          </div>
          <div className="pt-4 font-display font-bold text-sm text-emerald-800 flex items-center gap-1.5">
            Play with the Garden Visualizer <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Company Stories Card */}
        <Link
          href={`/k/${token}/moon`}
          className="p-6 rounded-3xl border-3 border-ink bg-purple-50 hover:bg-purple-100 transition-all shadow-sticker flex flex-col justify-between group"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white border-2 border-ink flex items-center justify-center text-2xl shadow-sticker-sm">
              🚀
            </div>
            <h3 className="font-display font-extrabold text-lg text-ink">Explore Company Stories</h3>
            <p className="text-sm text-purple-950 font-medium leading-relaxed">
              Read how reusable rockets land backwards, how robotic fingers hold delicate eggs, and why prices change like weather.
            </p>
          </div>
          <div className="pt-4 font-display font-bold text-sm text-purple-800 flex items-center gap-1.5">
            Discover Companies & Quizzes <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </div>
    </div>
  );
}
