'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getStoredVault, VaultState } from '@/lib/store';
import { PRESTOCKS_LIST } from '@moonjar/shared';
import { Pip } from '@/components/mascot/Pip';
import { Button } from '@/components/ui/Button';
import { 
  Rocket, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  ExternalLink, 
  HelpCircle,
  TrendingUp,
  Heart
} from 'lucide-react';

export default function MoonJarPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [vault, setVault] = useState<VaultState | null>(null);

  useEffect(() => {
    setVault(getStoredVault());
  }, []);

  if (!vault) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-4xl animate-bounce">🚀</div>
      </div>
    );
  }

  // Map owned shares
  const ownedMap = new Map(vault.allocations.map(a => [a.symbol, a]));

  return (
    <div className="space-y-6">
      {/* Pip Speech Hero */}
      <div className="bg-gradient-to-br from-purple-100 via-indigo-50 to-pink-50 rounded-3xl border-3 border-ink p-6 shadow-sticker flex flex-col sm:flex-row items-center gap-6">
        <div className="w-24 h-24 flex-shrink-0">
          <Pip mood="curious" />
        </div>

        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-200 border-2 border-ink text-xs font-display font-extrabold text-purple-900 shadow-sticker-sm">
            <Rocket className="w-3.5 h-3.5" /> What is the Moon Jar?
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-ink">
            You Own Slices of Big Dreams
          </h1>
          <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed max-w-xl">
            When people start exciting companies to build starships or walking robots, you usually have to be a giant bank to invest. 
            Your Moon Jar lets you hold tiny pieces of these real-world inventors!
          </p>
        </div>
      </div>

      {/* Reassuring Invariant Badge */}
      <div className="bg-mint-50 rounded-2xl border-2 border-ink p-4 flex items-center gap-3 shadow-sticker-sm">
        <div className="w-10 h-10 rounded-xl bg-white border-2 border-ink flex items-center justify-center text-xl flex-shrink-0">
          🛡️
        </div>
        <div className="text-xs text-emerald-950">
          <strong>The Moonjar Safety Shield:</strong> Even if a rocket trips or takes longer to reach orbit, your Moon Jar can never exceed <strong>{vault.moonCapBps / 100}%</strong> of what you put in. Your Save Jar protects the rest!
        </div>
      </div>

      {/* Companies Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-extrabold text-ink">
            Companies in Your World
          </h2>
          <span className="text-xs font-bold text-slate-500">
            {PRESTOCKS_LIST.length} frontier pioneers
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PRESTOCKS_LIST.map((item) => {
            const owned = ownedMap.get(item.symbol);
            const isHeld = !!owned && owned.sharesOwned > 0;

            const companyIcons: Record<string, string> = {
              SPACEX: '🚀',
              OPENAI: '🧠',
              ANTHROPIC: '🤝',
              ANDURIL: '🛡️',
              FIGUREAI: '🤖',
              KALSHI: '🎯',
              POLYMARKET: '🔮',
              NEURALINK: '⚡',
            };

            return (
              <div 
                key={item.symbol}
                className={`p-5 rounded-3xl border-3 border-ink shadow-sticker flex flex-col justify-between transition-all hover:-translate-y-1 ${
                  isHeld ? 'bg-white' : 'bg-slate-50 opacity-90'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-purple-100 border-2 border-ink flex items-center justify-center text-2xl shadow-sticker-sm">
                        {companyIcons[item.symbol] || '🏢'}
                      </div>
                      <div>
                        <div className="font-display font-extrabold text-base text-ink">
                          {item.name}
                        </div>
                        <div className="text-xs font-mono font-bold text-purple-700">
                          ${item.symbol}
                        </div>
                      </div>
                    </div>

                    {isHeld ? (
                      <span className="px-2.5 py-1 rounded-full bg-mint-200 border-2 border-ink text-[11px] font-display font-extrabold text-emerald-950 shadow-sticker-sm">
                        ✨ In Your Jar!
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
                        In Wishlist
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {item.symbol === 'SPACEX' && 'Building gigantic reusable Starships to take explorers to Mars!'}
                    {(item.symbol === 'OPENAI' || item.symbol === 'ANTHROPIC') && 'Creating super-smart computer helpers that can write and solve math!'}
                    {item.symbol === 'ANDURIL' && 'Inventing smart sensors and autonomous flying guards to keep people safe.'}
                    {item.symbol === 'FIGUREAI' && 'Teaching two-legged humanoid robots how to lift boxes and do chores!'}
                    {(item.symbol === 'KALSHI' || item.symbol === 'POLYMARKET') && 'Helping people forecast future events using clever probability games.'}
                    {item.symbol === 'NEURALINK' && 'Inventing tiny brain sensors to help people with paralysis control computers.'}
                  </p>

                  {isHeld && (
                    <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-500 font-bold">You own: </span>
                        <span className="font-display font-extrabold text-ink">{owned.sharesOwned} shares</span>
                      </div>
                      <div className="font-display font-extrabold text-purple-800">
                        ${owned.currentValueUsd.toFixed(2)} value
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t-2 border-slate-100 flex items-center justify-between mt-3">
                  <div className="text-[11px] text-slate-400 font-bold">
                    Primary Valuation: ${(item.markValuation / 1_000_000_000).toFixed(0)}B
                  </div>
                  <Link href={`/k/${token}/company/${item.symbol.toLowerCase()}`}>
                    <Button variant="secondary" size="sm" className="text-xs gap-1.5 py-1">
                      Read Story <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
