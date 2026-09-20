'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getStoredVault, saveVault, VaultState } from '@/lib/store';
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

export default function KidHomePage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [vault, setVault] = useState<VaultState | null>(null);
  const [pipMood, setPipMood] = useState<'happy' | 'cheering' | 'curious'>('happy');
  const [pipMessage, setPipMessage] = useState(
    "Welcome back! Your jars are safe and snug. Tap a jar to see the coins bounce!"
  );

  useEffect(() => {
    setVault(getStoredVault());
  }, []);

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

  if (!vault) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-4xl animate-bounce">🦦</div>
      </div>
    );
  }

  const totalValue = vault.saveBalanceUsdc + vault.moonBalanceUsdc;
  const savePct = Math.round((vault.saveBalanceUsdc / totalValue) * 100) || 80;
  const moonPct = 100 - savePct;

  return (
    <div className="space-y-6">
      {/* Pip Greeting Speech Bubble */}
      <div className="bg-white rounded-3xl border-3 border-ink p-5 shadow-sticker flex items-center gap-4 sm:gap-6 relative overflow-hidden">
        <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 cursor-pointer" onClick={() => setPipMood('happy')}>
          <Pip mood={pipMood} />
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-display font-black text-purple-700 uppercase tracking-wider bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-300">
              Pip The Savings Guide
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1 font-bold">
              <Clock className="w-3.5 h-3.5" /> Snapshot from earlier today
            </span>
          </div>
          <p className="font-display font-extrabold text-base sm:text-lg text-ink leading-snug">
            "{pipMessage}"
          </p>
        </div>
      </div>

      {/* Snapshot Note: Calm Psychology */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-2">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Zero price anxiety mode: updated once daily
        </span>
        <span>Total: ${totalValue.toFixed(2)}</span>
      </div>

      {/* Dual Tactile Jars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Save Jar Card */}
        <div className="cursor-pointer transition-transform active:scale-98" onClick={handleTapSaveJar}>
          <JarCard
            type="save"
            balanceUsdc={vault.saveBalanceUsdc}
            totalGoalUsdc={250}
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
      <div className="bg-white rounded-3xl border-3 border-ink p-6 shadow-sticker space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-display font-extrabold text-ink">
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {vault.allocations.map((item) => (
            <Link
              key={item.symbol}
              href={`/k/${token}/company/${item.symbol.toLowerCase()}`}
              className="p-3.5 rounded-2xl border-2 border-ink bg-slate-50 hover:bg-purple-50 transition-all shadow-sticker-sm flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-100 border border-ink flex items-center justify-center font-bold text-sm text-purple-900">
                {item.symbol === 'SPACEX' ? '🚀' : item.symbol === 'ANDURIL' ? '🛡️' : '🤖'}
              </div>
              <div>
                <div className="font-display font-extrabold text-sm text-ink group-hover:text-purple-900">
                  {item.symbol}
                </div>
                <div className="text-[11px] text-slate-500 font-bold">
                  ${item.currentValueUsd.toFixed(2)} • {item.sharesOwned} shares
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Fun Kid Exploration Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Garden Card */}
        <Link
          href={`/k/${token}/garden`}
          className="p-5 rounded-3xl border-3 border-ink bg-emerald-50 hover:bg-emerald-100 transition-all shadow-sticker flex flex-col justify-between group"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-white border-2 border-ink flex items-center justify-center text-xl shadow-sticker-sm">
              🌱
            </div>
            <h3 className="font-display font-extrabold text-base text-ink">Compound Garden</h3>
            <p className="text-xs text-emerald-950 font-medium leading-relaxed">
              Water your tree with $5 every week and watch it grow into a giant oak!
            </p>
          </div>
          <div className="pt-3 font-display font-bold text-xs text-emerald-800 flex items-center gap-1">
            Play with the Garden <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Learn Hub */}
        <Link
          href={`/k/${token}/learn`}
          className="p-5 rounded-3xl border-3 border-ink bg-amber-50 hover:bg-amber-100 transition-all shadow-sticker flex flex-col justify-between group"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-white border-2 border-ink flex items-center justify-center text-xl shadow-sticker-sm">
              📚
            </div>
            <h3 className="font-display font-extrabold text-base text-ink">Money Academy</h3>
            <p className="text-xs text-amber-950 font-medium leading-relaxed">
              Earn sticker badges by solving quick 1-minute puzzles about saving!
            </p>
          </div>
          <div className="pt-3 font-display font-bold text-xs text-amber-800 flex items-center gap-1">
            Collect Stickers <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Ask Chip Card */}
        <Link
          href={`/k/${token}/ask`}
          className="p-5 rounded-3xl border-3 border-ink bg-purple-50 hover:bg-purple-100 transition-all shadow-sticker flex flex-col justify-between group"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-white border-2 border-ink flex items-center justify-center text-xl shadow-sticker-sm">
              💬
            </div>
            <h3 className="font-display font-extrabold text-base text-ink">Ask Mom & Dad</h3>
            <p className="text-xs text-purple-950 font-medium leading-relaxed">
              Send safe notes about chores or ask Pip why prices change like the weather.
            </p>
          </div>
          <div className="pt-3 font-display font-bold text-xs text-purple-800 flex items-center gap-1">
            Send a Question <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </div>
    </div>
  );
}
