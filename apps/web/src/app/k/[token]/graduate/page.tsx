'use client';

import React, { useState, useEffect } from 'react';
import { getStoredVault, saveVault, VaultState } from '@/lib/store';
import { Pip } from '@/components/mascot/Pip';
import { Button } from '@/components/ui/Button';
import confetti from 'canvas-confetti';
import { 
  GraduationCap, 
  Sparkles, 
  Printer, 
  Key, 
  ShieldCheck, 
  Clock, 
  Award,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export default function GraduatePage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [vault, setVault] = useState<VaultState | null>(null);
  const [isGraduating, setIsGraduating] = useState(false);

  useEffect(() => {
    setVault(getStoredVault());
  }, []);

  const handleSimulateGraduation = () => {
    if (!vault) return;
    setIsGraduating(true);

    confetti({
      particleCount: 100,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#FFE853', '#A084E8', '#38D39F', '#FFA9E7'],
    });

    const updated = {
      ...vault,
      isGraduated: true,
    };
    setVault(updated);
    saveVault(updated);
    setTimeout(() => setIsGraduating(false), 800);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (!vault) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-4xl animate-bounce">🎓</div>
      </div>
    );
  }

  const unlockDate = new Date(vault.metadata.unlockDate);
  const daysUntil = Math.max(0, Math.ceil((unlockDate.getTime() - Date.now()) / (1000 * 3600 * 24)));
  const totalWealth = vault.saveBalanceUsdc + vault.moonBalanceUsdc;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-amber-100 via-purple-50 to-pink-50 rounded-3xl border-3 border-ink p-6 shadow-sticker flex flex-col sm:flex-row items-center justify-between gap-6 print:hidden">
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-200 border-2 border-ink text-xs font-display font-extrabold text-amber-950 shadow-sticker-sm">
            <GraduationCap className="w-3.5 h-3.5" /> Milestone 8: Graduation
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-ink">
            The Great Graduation Day
          </h1>
          <p className="text-xs sm:text-sm text-slate-700 font-medium max-w-lg">
            On your 18th birthday, the smart contract unlocks and transfers full ownership of your Save Jar and Moon Jar directly to you.
          </p>
        </div>

        <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
          <Pip mood={vault.isGraduated ? 'cheering' : 'curious'} />
        </div>
      </div>

      {/* Countdown Card */}
      <div className="bg-white rounded-3xl border-3 border-ink p-6 shadow-sticker space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Countdown to Adulthood
            </div>
            <div className="text-3xl sm:text-4xl font-display font-black text-ink mt-1">
              {vault.isGraduated ? 'Graduated! 🎓' : `${daysUntil.toLocaleString()} Days`}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">
              Unlock Date: {unlockDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!vault.isGraduated ? (
              <Button
                variant="primary"
                onClick={handleSimulateGraduation}
                disabled={isGraduating}
                className="gap-2 shadow-sticker"
              >
                <Sparkles className="w-4 h-4" /> Simulate 18th Birthday Unlock
              </Button>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-mint-200 border-2 border-ink text-xs font-bold text-emerald-950 flex items-center gap-1.5 shadow-sticker-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Training Wheels Removed!
              </span>
            )}
          </div>
        </div>

        {vault.isGraduated && (
          <div className="p-4 rounded-2xl bg-mint-50 border-2 border-ink text-xs sm:text-sm text-emerald-950 space-y-2 animate-in fade-in">
            <div className="font-display font-extrabold flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-700" /> Self-Custody Transfer Unlocked
            </div>
            <p>
              Your Moonjar vault is ready for primary ownership transfer. You can connect your personal Solana wallet (Phantom, Solflare) to withdraw <strong>${vault.saveBalanceUsdc.toFixed(2)} USDC</strong> and claim your tokenized shares of SpaceX, Anduril, and Figure AI directly to your custody!
            </p>
          </div>
        )}
      </div>

      {/* Official Moonjar Certificate (Printable!) */}
      <div className="bg-white rounded-3xl border-4 border-ink p-8 sm:p-12 shadow-sticker relative overflow-hidden space-y-6 text-center">
        {/* Certificate Watermark / Seals */}
        <div className="absolute top-4 left-4 text-4xl opacity-20">🍯</div>
        <div className="absolute top-4 right-4 text-4xl opacity-20">🚀</div>
        <div className="absolute bottom-4 left-4 text-4xl opacity-20">🌱</div>
        <div className="absolute bottom-4 right-4 text-4xl opacity-20">🎓</div>

        <div className="space-y-2">
          <div className="inline-block px-4 py-1 rounded-full bg-amber-200 border-2 border-ink text-xs font-display font-extrabold text-amber-950 uppercase tracking-widest">
            Solana On-Chain Vault Certificate
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-black text-ink tracking-tight">
            Certificate of Financial Prudence
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Awarded for demonstrating extraordinary patience, disciplined saving, and frontier curiosity.
          </p>
        </div>

        <div className="py-6 border-y-2 border-ink/20 space-y-2 max-w-md mx-auto">
          <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">This certifies that</div>
          <div className="text-2xl sm:text-3xl font-display font-black text-purple-900">
            {vault.metadata.nickname}
          </div>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Has successfully accumulated <strong>${totalWealth.toFixed(2)}</strong> across the Save Jar and Moon Jar, mastering the fundamental laws of compound interest and long-term private equity.
          </p>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-6 max-w-md mx-auto pt-2">
          <div className="border-t-2 border-ink pt-2 text-center">
            <div className="font-display font-bold text-xs text-ink">Pip The Mascot</div>
            <div className="text-[10px] text-slate-500">Chief Guardian of Jars</div>
          </div>
          <div className="border-t-2 border-ink pt-2 text-center">
            <div className="font-mono text-xs font-bold text-ink">
              {vault.metadata.vaultAddress.substring(0, 8)}...
            </div>
            <div className="text-[10px] text-slate-500">Solana Program Authority</div>
          </div>
        </div>

        {/* Print Button (Hidden during print) */}
        <div className="pt-4 print:hidden">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="w-4 h-4" /> Print Commemorative Certificate
          </Button>
        </div>
      </div>
    </div>
  );
}
