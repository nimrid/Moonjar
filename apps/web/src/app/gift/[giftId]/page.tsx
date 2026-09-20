'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { getStoredVault, saveVault } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Pip } from '@/components/mascot/Pip';
import confetti from 'canvas-confetti';
import { 
  Gift, 
  Sparkles, 
  HeartHandshake, 
  ShieldCheck, 
  Check, 
  Send, 
  ArrowLeft,
  Coins
} from 'lucide-react';

export default function PublicGiftPage({ params }: { params: { giftId: string } }) {
  const { giftId } = params;
  const [amount, setAmount] = useState('25');
  const [donorName, setDonorName] = useState('');
  const [note, setNote] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🚀');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const numAmount = parseFloat(amount) || 0;
  const saveSplit = (numAmount * 0.8).toFixed(2);
  const moonSplit = (numAmount * 0.2).toFixed(2);
  const matchBonus = (numAmount * 0.5).toFixed(2); // 50% match pool bonus!

  const handleSendGift = () => {
    if (numAmount <= 0) return;
    setIsSubmitting(true);

    setTimeout(() => {
      const vault = getStoredVault();
      if (vault) {
        const updated = {
          ...vault,
          saveBalanceUsdc: Number((vault.saveBalanceUsdc + parseFloat(saveSplit)).toFixed(2)),
          moonBalanceUsdc: Number((vault.moonBalanceUsdc + parseFloat(moonSplit)).toFixed(2)),
          totalDepositedUsdc: Number((vault.totalDepositedUsdc + numAmount).toFixed(2)),
          matchBalanceUsdc: Math.max(0, Number((vault.matchBalanceUsdc - parseFloat(matchBonus)).toFixed(2))),
        };
        saveVault(updated);
      }

      setIsSubmitting(false);
      setIsSuccess(true);

      confetti({
        particleCount: 75,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FF6584', '#FFE853', '#38D39F', '#A084E8'],
      });
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-ink font-body selection:bg-pink-200 py-10 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Back navigation */}
        <div>
          <Link
            href="/guardian/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-ink bg-white hover:bg-slate-100 text-xs font-bold text-ink shadow-sticker-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
        </div>

        {/* Main Gift Container */}
        <div className="bg-white rounded-3xl border-3 border-ink p-6 sm:p-8 shadow-sticker space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-pink-100 border-3 border-ink flex items-center justify-center text-3xl mx-auto shadow-sticker-sm">
              🎁
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-ink">
              Gift to Leo's Moonjar
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-sm mx-auto">
              Your gift deposits directly into Leo's verified smart vault on Solana, teaching patient savings and responsible growth.
            </p>
          </div>

          {!isSuccess ? (
            <div className="space-y-5">
              {/* Amount Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                  Gift Amount (USDC)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {['10', '25', '50', '100'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(amt)}
                      className={`py-2 rounded-xl border-2 border-ink text-sm font-display font-black transition-all ${
                        amount === amt
                          ? 'bg-amber-300 text-ink shadow-sticker-sm'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    min="5"
                    max="1000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border-2 border-ink rounded-xl text-base font-bold text-ink focus:outline-none focus:ring-2 focus:ring-pink-300"
                    placeholder="Custom amount"
                  />
                </div>
              </div>

              {/* Automatic Split Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-50 border-2 border-ink space-y-2">
                <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>How your gift is allocated:</span>
                  <span className="text-[11px] text-slate-500 font-normal">Parent Preset</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-700 flex items-center gap-1">
                    🍯 80% Save Jar (Safe USDC):
                  </span>
                  <span className="font-mono">${saveSplit}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-purple-700 flex items-center gap-1">
                    🚀 20% Moon Jar (PreStocks):
                  </span>
                  <span className="font-mono">${moonSplit}</span>
                </div>

                {/* Match Pool Alert */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-amber-900 font-bold">
                  <span className="flex items-center gap-1 text-amber-800">
                    <HeartHandshake className="w-3.5 h-3.5 text-amber-600" /> Family Match Pool Bonus:
                  </span>
                  <span className="font-mono text-emerald-700">+${matchBonus} unlocked!</span>
                </div>
              </div>

              {/* Donor Note */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                  Your Name & Note to Leo
                </label>
                <input
                  type="text"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="e.g. Grandma Helen, Aunt Sarah"
                  className="w-full px-3 py-2 border-2 border-ink rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pink-300"
                />

                {/* Emoji Sticker Picker */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-slate-500 font-bold">Pick a sticker:</span>
                  {['🚀', '🎂', '🌟', '🎁', '🧸', '📚'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`w-8 h-8 rounded-xl border-2 border-ink text-sm flex items-center justify-center transition-all ${
                        selectedEmoji === emoji ? 'bg-pink-200 shadow-sticker-sm scale-110' : 'bg-slate-50'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Leave an encouraging note..."
                  rows={3}
                  className="w-full px-3 py-2 border-2 border-ink rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
                />
              </div>

              {/* Submit Button */}
              <Button
                variant="primary"
                onClick={handleSendGift}
                disabled={isSubmitting || numAmount <= 0}
                className="w-full gap-2 py-3 text-sm shadow-sticker"
              >
                {isSubmitting ? <Coins className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                {isSubmitting ? 'Sending Gift on Solana...' : `Send $${numAmount.toFixed(2)} Gift`}
              </Button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Verified Non-Guardian Deposit Program on Solana Devnet
              </div>
            </div>
          ) : (
            /* Success State */
            <div className="text-center space-y-4 py-4 animate-in fade-in">
              <div className="w-24 h-24 mx-auto">
                <Pip mood="cheering" />
              </div>
              <h2 className="text-2xl font-display font-black text-ink">
                Thank You, {donorName || 'Generous Friend'}!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-sm mx-auto">
                Your gift of <strong>${numAmount.toFixed(2)} USDC</strong> has been deposited into Leo's vault!
                Plus, <strong>+${matchBonus}</strong> was added from the Family Match Pool.
              </p>

              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-ink text-left max-w-sm mx-auto text-xs text-slate-800 space-y-1">
                <div className="font-bold flex items-center gap-1 text-ink">
                  {selectedEmoji} Note attached:
                </div>
                <div className="italic">
                  "{note || 'Happy savings, Leo!'}"
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  variant="secondary" 
                  onClick={() => setIsSuccess(false)}
                  className="text-xs"
                >
                  Send Another Gift
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
