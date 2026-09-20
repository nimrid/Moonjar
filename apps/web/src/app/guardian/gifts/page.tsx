'use client';

import React, { useState, useEffect } from 'react';
import { getStoredVault, saveVault, VaultState } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Pip } from '@/components/mascot/Pip';
import { 
  Gift, 
  Sparkles, 
  Copy, 
  Check, 
  PlusCircle, 
  ExternalLink, 
  QrCode, 
  Coins, 
  HeartHandshake,
  MessageSquareHeart,
  Share2
} from 'lucide-react';
import Link from 'next/link';

interface MockGiftHistory {
  id: string;
  donorName: string;
  amount: number;
  matchBonus: number;
  note: string;
  timestamp: string;
  occasion: string;
}

export default function GiftsPage() {
  const [vault, setVault] = useState<VaultState | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchAmount, setMatchAmount] = useState('25');
  const [occasion, setOccasion] = useState('Birthday');
  const [customSlug, setCustomSlug] = useState('leo-birthday');
  
  const [giftsList, setGiftsList] = useState<MockGiftHistory[]>([
    {
      id: 'g-1',
      donorName: 'Grandma Helen',
      amount: 50,
      matchBonus: 10,
      note: 'Happy 10th Birthday Leo! Pip told me you love space! 🚀✨',
      timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      occasion: '10th Birthday',
    },
    {
      id: 'g-2',
      donorName: 'Uncle David',
      amount: 25,
      matchBonus: 5,
      note: 'Keep exploring those robotics companies! 🤖',
      timestamp: new Date(Date.now() - 18 * 24 * 3600 * 1000).toISOString(),
      occasion: 'Science Fair Prize',
    }
  ]);

  useEffect(() => {
    setVault(getStoredVault());
  }, []);

  const giftUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/gift/${customSlug}`
    : `https://moonjar.app/gift/${customSlug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(giftUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleAddMatchPool = () => {
    if (!vault) return;
    const addVal = parseFloat(matchAmount) || 0;
    if (addVal <= 0) return;

    const updated = {
      ...vault,
      matchBalanceUsdc: vault.matchBalanceUsdc + addVal,
    };
    setVault(updated);
    saveVault(updated);
    setShowMatchModal(false);
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
              <span className="p-2 rounded-xl bg-pink-100 border-2 border-ink">
                <Gift className="w-5 h-5 text-pink-700" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-ink">
                Gift Links & Match Pool
              </h1>
            </div>
            <p className="text-slate-600 text-sm max-w-xl">
              Family and friends can gift allowance or birthday money directly into {vault.metadata.nickname}'s Save Jar.
              Optionally sponsor a matching bonus to reward their savings habits!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="gap-2"
            >
              <PlusCircle className="w-4 h-4" /> Create New Gift Link
            </Button>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Gift Link + Match Pool */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Gift Link Card */}
        <div className="bg-white rounded-3xl border-3 border-ink p-6 shadow-sticker flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-pink-100 border-2 border-ink text-xs font-bold text-pink-800">
                Active Link: {occasion}
              </span>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                ● Live on Devnet
              </span>
            </div>

            <div>
              <h2 className="text-lg font-display font-bold text-ink">Shareable Gift Page</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Send this link via WhatsApp, iMessage, or email. Relatives can deposit with USDC or debit card onramp.
              </p>
            </div>

            {/* Link Box */}
            <div className="p-3 rounded-2xl bg-slate-50 border-2 border-ink flex items-center justify-between gap-2">
              <code className="text-xs font-mono text-slate-700 truncate">
                {giftUrl}
              </code>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border-2 border-ink bg-white hover:bg-slate-100 text-xs font-bold text-ink shadow-sticker-sm flex-shrink-0 transition-transform active:scale-95"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Link href={`/gift/${customSlug}`} target="_blank" className="flex-1">
                <Button variant="secondary" size="sm" className="w-full gap-1.5 text-xs">
                  <ExternalLink className="w-3.5 h-3.5" /> Preview Page
                </Button>
              </Link>
              <Button 
                variant="neutral" 
                size="sm" 
                onClick={handleCopyLink}
                className="gap-1.5 text-xs"
              >
                <Share2 className="w-3.5 h-3.5" /> Share
              </Button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border-2 border-ink flex items-center justify-center flex-shrink-0">
              <QrCode className="w-5 h-5 text-amber-800" />
            </div>
            <div className="text-xs text-slate-600">
              Includes printable QR code for physical birthday cards.
            </div>
          </div>
        </div>

        {/* Family Match Pool Card */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border-3 border-ink p-6 shadow-sticker flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-amber-200 border-2 border-ink text-xs font-bold text-amber-900 flex items-center gap-1">
                <HeartHandshake className="w-3.5 h-3.5" /> Family Sponsor Pool
              </span>
              <span className="text-xs font-mono font-bold text-amber-800">
                Smart Contract PDA
              </span>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Available Match Balance</div>
              <div className="text-3xl sm:text-4xl font-display font-extrabold text-ink mt-1">
                ${vault.matchBalanceUsdc.toFixed(2)} <span className="text-lg font-bold text-slate-500">USDC</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border-2 border-ink shadow-sticker-sm text-xs text-slate-700 space-y-1.5">
              <div className="font-bold flex items-center gap-1 text-amber-900">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> 50% Savings Match Rule
              </div>
              <p>
                Every $10 saved from gifts or allowance automatically unlocks <strong>+$5.00</strong> from this pool!
                This gamifies saving and motivates children to keep funds in the Save Jar.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-amber-200 flex items-center justify-between gap-3">
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => setShowMatchModal(true)}
              className="w-full gap-2"
            >
              <Coins className="w-4 h-4" /> Deposit to Match Pool
            </Button>
          </div>
        </div>
      </div>

      {/* Gift History Section */}
      <div className="bg-white rounded-3xl border-3 border-ink p-6 shadow-sticker space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquareHeart className="w-5 h-5 text-pink-600" />
            <h2 className="text-xl font-display font-extrabold text-ink">
              Recent Gift Messages
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {giftsList.length} gifts received
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {giftsList.map((g) => (
            <div 
              key={g.id}
              className="p-4 rounded-2xl border-2 border-ink bg-slate-50 shadow-sticker-sm space-y-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display font-bold text-ink text-sm">{g.donorName}</div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {g.occasion} • {new Date(g.timestamp).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display font-extrabold text-emerald-700 text-sm">
                    +${g.amount.toFixed(2)} USDC
                  </div>
                  {g.matchBonus > 0 && (
                    <div className="text-[10px] font-bold text-amber-700">
                      +${g.matchBonus.toFixed(2)} match bonus
                    </div>
                  )}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 italic">
                "{g.note}"
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Create Gift Link */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-3 border-ink p-6 max-w-md w-full shadow-sticker space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
              <h3 className="font-display font-extrabold text-ink text-lg flex items-center gap-2">
                <Gift className="w-5 h-5 text-pink-600" /> New Gift Link
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Occasion / Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Birthday', 'Chores', 'Holiday', 'Graduation'].map((occ) => (
                    <button
                      key={occ}
                      onClick={() => {
                        setOccasion(occ);
                        setCustomSlug(`leo-${occ.toLowerCase()}`);
                      }}
                      className={`p-2 rounded-xl border-2 border-ink text-xs font-bold text-center transition-all ${
                        occasion === occ ? 'bg-amber-300 text-ink shadow-sticker-sm' : 'bg-slate-50 text-slate-700'
                      }`}
                    >
                      {occ}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Custom Link URL</label>
                <div className="flex items-center border-2 border-ink rounded-xl px-3 py-2 bg-slate-50 text-xs">
                  <span className="text-slate-400">moonjar.app/gift/</span>
                  <input
                    type="text"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="bg-transparent font-bold text-ink focus:outline-none flex-1 ml-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                variant="neutral" 
                className="flex-1"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                className="flex-1"
                onClick={() => setShowCreateModal(false)}
              >
                Generate Link
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Deposit Match Pool */}
      {showMatchModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-3 border-ink p-6 max-w-md w-full shadow-sticker space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
              <h3 className="font-display font-extrabold text-ink text-lg flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-amber-600" /> Fund Match Pool
              </h3>
              <button 
                onClick={() => setShowMatchModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Deposit USDC to match your child's savings automatically on-chain.
              </p>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Amount (USDC)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={matchAmount}
                    onChange={(e) => setMatchAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border-2 border-ink rounded-xl text-lg font-bold text-ink focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {['10', '25', '50', '100'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setMatchAmount(amt)}
                    className="flex-1 py-1.5 rounded-xl border-2 border-ink bg-slate-50 hover:bg-amber-100 text-xs font-bold text-ink"
                  >
                    +${amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                variant="neutral" 
                className="flex-1"
                onClick={() => setShowMatchModal(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                className="flex-1"
                onClick={handleAddMatchPool}
              >
                Confirm Deposit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
