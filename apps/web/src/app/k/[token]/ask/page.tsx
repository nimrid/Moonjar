'use client';

import React, { useState, useEffect } from 'react';
import { getStoredVault, saveVault, VaultState } from '@/lib/store';
import { Pip } from '@/components/mascot/Pip';
import { Button } from '@/components/ui/Button';
import confetti from 'canvas-confetti';
import { 
  MessageCircleQuestion, 
  Send, 
  Sparkles, 
  Check, 
  ShieldCheck, 
  Clock, 
  HelpCircle 
} from 'lucide-react';
import { KidRequest } from '@moonjar/shared';

const PRESET_CHIPS = [
  {
    type: 'ADD_MONEY' as const,
    topic: 'I finished all my chores! (Cleaned room & washed dishes)',
    amount: 10,
    icon: '🧹',
  },
  {
    type: 'ADD_MONEY' as const,
    topic: 'Can I add $5 from my piggy bank allowance into my Save Jar?',
    amount: 5,
    icon: '🪙',
  },
  {
    type: 'LEARN' as const,
    topic: 'Can we read about how SpaceX rockets land backwards together?',
    icon: '🚀',
  },
  {
    type: 'LEARN' as const,
    topic: 'Why do Figure AI robots have rubber fingers?',
    icon: '🤖',
  },
  {
    type: 'STATUS' as const,
    topic: 'Can we check how big my Compound Garden tree grew this week?',
    icon: '🌳',
  },
  {
    type: 'STATUS' as const,
    topic: 'Thank you for helping me build my savings treasure!',
    icon: '❤️',
  },
];

export default function AskPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [vault, setVault] = useState<VaultState | null>(null);
  const [selectedChip, setSelectedChip] = useState<typeof PRESET_CHIPS[0] | null>(null);
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    setVault(getStoredVault());
  }, []);

  const handleSendRequest = () => {
    if (!selectedChip || !vault) return;

    const newReq: KidRequest = {
      id: `req-${Date.now()}`,
      vaultAddress: vault.metadata.vaultAddress,
      timestamp: new Date().toISOString(),
      type: selectedChip.type,
      amount: selectedChip.amount,
      topic: selectedChip.topic,
      status: 'PENDING',
    };

    const updatedVault = {
      ...vault,
      requests: [newReq, ...vault.requests],
    };

    setVault(updatedVault);
    saveVault(updatedVault);
    setSentSuccess(true);

    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#A084E8', '#FFE853', '#38D39F'],
    });

    setTimeout(() => {
      setSelectedChip(null);
      setSentSuccess(false);
    }, 3500);
  };

  if (!vault) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-4xl animate-bounce">💬</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border-3 border-ink p-6 shadow-sticker flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-200 border-2 border-ink text-xs font-display font-extrabold text-purple-900 shadow-sticker-sm">
            <MessageCircleQuestion className="w-3.5 h-3.5" /> Safe Curated Messenger
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-ink">
            Ask Mom & Dad Anything
          </h1>
          <p className="text-xs sm:text-sm text-slate-700 font-medium max-w-lg">
            Pick a question chip below. Pip will deliver it straight to your parent's Guardian Dashboard!
          </p>
        </div>

        <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
          <Pip mood={sentSuccess ? 'cheering' : 'curious'} />
        </div>
      </div>

      {/* Chips Selection Grid */}
      <div className="bg-white rounded-3xl border-3 border-ink p-6 shadow-sticker space-y-4">
        <h2 className="text-lg font-display font-extrabold text-ink">
          Choose a Request Chip
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PRESET_CHIPS.map((chip, idx) => {
            const isSelected = selectedChip?.topic === chip.topic;
            return (
              <button
                key={idx}
                onClick={() => setSelectedChip(chip)}
                className={`p-4 rounded-2xl border-2 border-ink text-left transition-all flex items-start gap-3.5 ${
                  isSelected
                    ? 'bg-amber-200 shadow-sticker font-bold translate-y-[-2px]'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-ink flex items-center justify-center text-xl flex-shrink-0 shadow-sticker-sm">
                  {chip.icon}
                </div>
                <div className="space-y-1">
                  <div className="text-xs sm:text-sm leading-snug">
                    {chip.topic}
                  </div>
                  {chip.amount && (
                    <span className="inline-block text-[11px] font-display font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                      Request: ${chip.amount}.00
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Send Action */}
        <div className="pt-4 border-t-2 border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Zero free-form text: protects your online safety
          </div>

          <Button
            variant="primary"
            disabled={!selectedChip || sentSuccess}
            onClick={handleSendRequest}
            className="w-full sm:w-auto gap-2"
          >
            {sentSuccess ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {sentSuccess ? 'Delivered to Parents!' : 'Send Note to Parents'}
          </Button>
        </div>
      </div>

      {/* Success Banner */}
      {sentSuccess && (
        <div className="p-4 rounded-2xl bg-mint-200 border-2 border-ink shadow-sticker text-emerald-950 font-bold flex items-center gap-3 animate-in fade-in">
          <span className="text-2xl">🎉</span>
          <div className="text-xs sm:text-sm">
            Pip delivered your note! Mom and Dad can approve or review it on their dashboard.
          </div>
        </div>
      )}

      {/* Past Requests History */}
      <div className="bg-white rounded-3xl border-3 border-ink p-6 shadow-sticker space-y-3">
        <h2 className="text-lg font-display font-extrabold text-ink">
          Notes Sent to Parents
        </h2>

        <div className="space-y-2">
          {vault.requests.map((req) => (
            <div 
              key={req.id}
              className="p-3.5 rounded-2xl border-2 border-ink bg-slate-50 flex items-center justify-between"
            >
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-ink">{req.topic}</div>
                <div className="text-[10px] text-slate-500">
                  Sent {new Date(req.timestamp).toLocaleDateString()}
                </div>
              </div>

              <div>
                {req.status === 'PENDING' ? (
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                    ⏳ Waiting for Mom/Dad
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-mint-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold">
                    ✅ Approved & Celebrated!
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
