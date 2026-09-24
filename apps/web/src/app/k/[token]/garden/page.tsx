'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Pip } from '@/components/mascot/Pip';
import { Button } from '@/components/ui/Button';
import confetti from 'canvas-confetti';
import { 
  Sprout, 
  Droplets, 
  Sun, 
  Sparkles, 
  Info, 
  Calendar, 
  TrendingUp, 
  ShieldCheck 
} from 'lucide-react';

export default function CompoundGardenPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [weeklyDeposit, setWeeklyDeposit] = useState(5);
  const [selectedHorizon, setSelectedHorizon] = useState<1 | 3 | 5 | 8>(3);
  const [isWatering, setIsWatering] = useState(false);

  // Compound growth calculation (assuming conservative 5% APY in stable yield)
  const annualRate = 0.05;
  const totalWeeks = selectedHorizon * 52;
  const principal = weeklyDeposit * totalWeeks;
  // Future value of weekly annuity: PMT * (((1 + r/52)^n - 1) / (r/52))
  const weeklyRate = annualRate / 52;
  const futureVal = weeklyDeposit * ((Math.pow(1 + weeklyRate, totalWeeks) - 1) / weeklyRate);
  const interestEarned = Math.max(0, futureVal - principal);

  const handleWaterGarden = () => {
    setIsWatering(true);
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#38D39F', '#70D6FF', '#FFE853'],
    });
    setTimeout(() => setIsWatering(false), 1200);
  };

  // Tree visual stage depending on horizon
  const getGardenVisual = () => {
    if (selectedHorizon === 1) {
      return {
        stage: 'Sprout',
        icon: '🌱',
        description: 'A tiny green sprout pushes up through the rich soil! Every drop counts.',
        heightClass: 'h-24',
      };
    }
    if (selectedHorizon === 3) {
      return {
        stage: 'Young Sapling',
        icon: '🌿',
        description: 'Your sapling has sturdy branches and fresh green leaves blooming in the sun.',
        heightClass: 'h-36',
      };
    }
    if (selectedHorizon === 5) {
      return {
        stage: 'Fruit Tree',
        icon: '🌳',
        description: 'A strong fruit tree bearing delicious golden apples of patience!',
        heightClass: 'h-48',
      };
    }
    return {
      stage: 'Grand Guardian Oak',
      icon: '🌲',
      description: 'A gigantic ancient oak providing shade, wisdom, and a forest of savings for adulthood!',
      heightClass: 'h-60',
    };
  };

  const visual = getGardenVisual();

  return (
    <div className="space-y-6">
      {/* Garden Header */}
      <div className="bg-gradient-to-br from-emerald-100 via-teal-50 to-amber-50 rounded-3xl border-3 border-ink p-6 shadow-sticker flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-200 border-2 border-ink text-xs font-display font-extrabold text-emerald-950 shadow-sticker-sm">
            <Sprout className="w-3.5 h-3.5" /> Interactive Money Garden
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-ink">
            Watch Small Drops Grow Into Giants
          </h1>
          <p className="text-xs sm:text-sm text-slate-700 font-medium max-w-lg">
            Money in your Save Jar is like a garden: if you water it with a few coins each week,
            time and patience turn it into a majestic forest!
          </p>
        </div>

        <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 flex items-center justify-center">
          <Pip mood={isWatering ? 'cheering' : 'happy'} size={80} />
        </div>
      </div>

      {/* Main Interactive Garden Viewport */}
      <div className="bg-gradient-to-b from-sky-100 to-emerald-100 rounded-3xl border-3 border-ink p-6 sm:p-8 shadow-sticker relative overflow-hidden flex flex-col items-center justify-center min-h-[340px]">
        {/* Sun & Clouds */}
        <div className="absolute top-4 right-6 flex items-center gap-2">
          <div className="text-4xl animate-spin-slow">☀️</div>
          <div className="text-2xl opacity-80">☁️</div>
        </div>

        {/* Dynamic Tree / Plant */}
        <div className="flex flex-col items-center justify-center z-10 space-y-3">
          <div className="text-7xl sm:text-8xl transition-all transform hover:scale-110 cursor-pointer">
            {visual.icon}
          </div>
          <div className="p-2 px-4 rounded-2xl bg-white/90 border-2 border-ink shadow-sticker-sm text-center">
            <span className="font-display font-extrabold text-sm text-ink">{visual.stage}</span>
            <p className="text-[11px] text-slate-600 font-medium max-w-xs">{visual.description}</p>
          </div>
        </div>

        {/* Ground and Flowers */}
        <div className="w-full mt-4 flex items-center justify-around text-2xl border-t-2 border-emerald-400/50 pt-2">
          <span>🌼</span>
          <span>🍄</span>
          <span>🌻</span>
          <span>🦋</span>
          <span>🌸</span>
        </div>

        {/* Water Action Button */}
        <button
          onClick={handleWaterGarden}
          className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-2xl border-3 border-ink bg-sky-300 hover:bg-sky-400 text-ink font-display font-black text-sm shadow-sticker transition-transform active:scale-95"
        >
          <Droplets className="w-4 h-4 text-sky-800" />
          Water the Garden!
        </button>
      </div>

      {/* Interactive Controls */}
      <div className="bg-white rounded-3xl border-3 border-ink p-6 shadow-sticker space-y-6">
        {/* Weekly Water Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-display font-extrabold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-sky-500" /> Weekly Water Drop
            </label>
            <span className="text-lg font-display font-extrabold text-ink bg-sky-100 px-3 py-1 rounded-xl border border-sky-300">
              ${weeklyDeposit}.00 / week
            </span>
          </div>

          <input
            type="range"
            min="1"
            max="25"
            step="1"
            value={weeklyDeposit}
            onChange={(e) => setWeeklyDeposit(Number(e.target.value))}
            className="w-full accent-sky-500 h-2.5 bg-slate-200 rounded-lg cursor-pointer"
          />

          <div className="flex justify-between text-[11px] font-bold text-slate-400">
            <span>$1 (a piece of candy)</span>
            <span>$5 (allowance)</span>
            <span>$25 (big chore)</span>
          </div>
        </div>

        {/* Time Horizon Tabs */}
        <div className="space-y-2">
          <label className="text-xs font-display font-extrabold text-ink uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-purple-500" /> Time in the Garden
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { val: 1, label: '1 Year' },
              { val: 3, label: '3 Years' },
              { val: 5, label: '5 Years' },
              { val: 8, label: 'Graduation (18)' },
            ].map((item) => (
              <button
                key={item.val}
                onClick={() => setSelectedHorizon(item.val as 1 | 3 | 5 | 8)}
                className={`p-3 rounded-2xl border-2 border-ink text-center transition-all ${
                  selectedHorizon === item.val
                    ? 'bg-amber-300 text-ink shadow-sticker-sm font-display font-extrabold'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 font-bold'
                }`}
              >
                <div className="text-sm">{item.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Math Results Box */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-ink shadow-sticker-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">You Put In</div>
            <div className="text-xl sm:text-2xl font-display font-extrabold text-ink mt-0.5">
              ${principal.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500">Your allowance drops</div>
          </div>

          <div>
            <div className="text-xs font-bold text-emerald-700 uppercase">Patience Bonus</div>
            <div className="text-xl sm:text-2xl font-display font-extrabold text-emerald-800 mt-0.5">
              +${interestEarned.toFixed(0)}
            </div>
            <div className="text-[10px] text-emerald-700">Coins earned while sleeping!</div>
          </div>

          <div>
            <div className="text-xs font-bold text-purple-700 uppercase">Total Harvest</div>
            <div className="text-2xl sm:text-3xl font-display font-black text-purple-950 mt-0.5">
              ${futureVal.toFixed(0)}
            </div>
            <div className="text-[10px] text-purple-700 font-bold">Waiting for your 18th birthday!</div>
          </div>
        </div>

        {/* Mandatory Educational Disclaimer */}
        <div className="p-3.5 rounded-2xl bg-slate-100 border-2 border-slate-300 flex items-start gap-2.5 text-xs text-slate-700">
          <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed font-medium">
            <strong>Important rule of money:</strong> Real-world investments have sunny days and rainy days. 
            Money in the Moon Jar can grow or shrink like the weather. Money in your Save Jar stays protected and steady.
          </p>
        </div>
      </div>
    </div>
  );
}
