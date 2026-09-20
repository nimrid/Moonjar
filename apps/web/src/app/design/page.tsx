'use client';

import React, { useState } from 'react';
import { Pip, PipExpression } from '@/components/mascot/Pip';
import { Button } from '@/components/ui/Button';
import { JarCard } from '@/components/ui/JarCard';
import { TokenSticker } from '@/components/ui/TokenSticker';
import { PriceTagPill } from '@/components/ui/PriceTagPill';
import { Slider } from '@/components/ui/Slider';
import { AskChip } from '@/components/ui/AskChip';
import { LearnCard } from '@/components/ui/LearnCard';
import { DecisionLogItem } from '@/components/ui/DecisionLogItem';
import { Modal } from '@/components/ui/Modal';
import { PRESTOCKS_LIST, LESSONS, BuyDecisionLog } from '@moonjar/shared';
import { Smartphone, Tablet, Monitor, Moon, Sun } from 'lucide-react';

export default function DesignSystemPage() {
  const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isNight, setIsNight] = useState(false);
  const [pipMood, setPipMood] = useState<PipExpression>('happy');
  const [saveBalance, setSaveBalance] = useState(65);
  const [moonBalance, setMoonBalance] = useState(40);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);

  const containerWidth = {
    mobile: 'max-w-[390px]',
    tablet: 'max-w-[768px]',
    desktop: 'max-w-6xl',
  }[viewport];

  const sampleDecision: BuyDecisionLog = {
    id: 'dec-1',
    vaultAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    symbol: 'SPACEX',
    action: 'BUY',
    amountInUsdc: 5000000,
    premiumPct: 8.5,
    machineReason: 'PREMIUM_ACCEPTABLE',
    humanReasonKid: 'Pip bought a tiny piece of SpaceX today because the price looked fair!',
    humanReasonGuardian: 'SpaceX is trading at a fair 8.5% premium, well within your 20.0% limit. Executed $5.00 purchase.',
    txSignature: '5Kn7...X9yZ',
    timestamp: new Date().toISOString(),
  };

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors ${isNight ? 'bg-[#12111A] text-slate-100' : 'bg-amber-50/50 text-ink'}`} data-theme={isNight ? 'night' : 'light'}>
      {/* Top Toolbar */}
      <header className="max-w-6xl mx-auto mb-8 p-4 bg-white rounded-2xl border-3 border-ink shadow-sticker flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-ink">Moonjar Design System</h1>
          <p className="text-sm text-slate-500">Living Component Guide • "Soft Sticker" Aesthetic</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Viewport switch */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border-2 border-ink">
            <button
              onClick={() => setViewport('mobile')}
              className={`p-2 rounded-lg flex items-center gap-1 text-xs font-bold ${
                viewport === 'mobile' ? 'bg-white border-2 border-ink shadow-sticker-sm' : 'text-slate-600'
              }`}
              title="Mobile (390px)"
            >
              <Smartphone className="w-4 h-4" /> 390px
            </button>
            <button
              onClick={() => setViewport('tablet')}
              className={`p-2 rounded-lg flex items-center gap-1 text-xs font-bold ${
                viewport === 'tablet' ? 'bg-white border-2 border-ink shadow-sticker-sm' : 'text-slate-600'
              }`}
              title="Tablet (768px)"
            >
              <Tablet className="w-4 h-4" /> 768px
            </button>
            <button
              onClick={() => setViewport('desktop')}
              className={`p-2 rounded-lg flex items-center gap-1 text-xs font-bold ${
                viewport === 'desktop' ? 'bg-white border-2 border-ink shadow-sticker-sm' : 'text-slate-600'
              }`}
              title="Full Desktop"
            >
              <Monitor className="w-4 h-4" /> Desktop
            </button>
          </div>

          {/* Theme switch */}
          <button
            onClick={() => setIsNight(!isNight)}
            className="p-2.5 rounded-xl border-2 border-ink bg-white shadow-sticker-sm hover:bg-slate-100"
            title="Toggle Night Theme"
          >
            {isNight ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-purple-700" />}
          </button>
        </div>
      </header>

      {/* Main Showcase Container */}
      <main className={`mx-auto transition-all duration-300 ${containerWidth}`}>
        {/* Color Palette */}
        <section className="mb-10 bg-white p-6 rounded-3xl border-3 border-ink shadow-sticker">
          <h2 className="text-xl font-bold font-display mb-4">1. Brand Palette & Shadows</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            <div className="p-3 rounded-xl border-2 border-ink bg-[#FFFDF8]">
              <div className="font-bold text-xs text-ink">Cream (#FFFDF8)</div>
              <div className="text-[10px] text-slate-500">Base Canvas</div>
            </div>
            <div className="p-3 rounded-xl border-2 border-ink bg-[#1F1B2E] text-white">
              <div className="font-bold text-xs">Ink (#1F1B2E)</div>
              <div className="text-[10px] text-slate-300">Text & Stroke (3px)</div>
            </div>
            <div className="p-3 rounded-xl border-2 border-ink bg-[#FFD15C] text-ink">
              <div className="font-bold text-xs">Sun (#FFD15C)</div>
              <div className="text-[10px] text-slate-800">Save Jar Accent</div>
            </div>
            <div className="p-3 rounded-xl border-2 border-ink bg-[#8B5CF6] text-white">
              <div className="font-bold text-xs">Grape (#8B5CF6)</div>
              <div className="text-[10px] text-purple-100">Moon Jar & Pip</div>
            </div>
            <div className="p-3 rounded-xl border-2 border-ink bg-[#10B981] text-white">
              <div className="font-bold text-xs">Leaf (#10B981)</div>
              <div className="text-[10px] text-emerald-100">Growth / Success</div>
            </div>
            <div className="p-3 rounded-xl border-2 border-ink bg-[#F43F5E] text-white">
              <div className="font-bold text-xs">Rose (#F43F5E)</div>
              <div className="text-[10px] text-rose-100">Accents / Alert</div>
            </div>
          </div>
        </section>

        {/* Pip Mascot */}
        <section className="mb-10 bg-white p-6 rounded-3xl border-3 border-ink shadow-sticker">
          <h2 className="text-xl font-bold font-display mb-2">2. Mascot: Pip the Otter Astronaut</h2>
          <p className="text-sm text-slate-600 mb-6">Five expressive SVG states used across guidance and learning moments.</p>

          <div className="flex flex-wrap gap-2 mb-6">
            {(['happy', 'curious', 'thinking', 'calm-reassuring', 'cheering'] as PipExpression[]).map((exp) => (
              <Button
                key={exp}
                variant={pipMood === exp ? 'grape' : 'secondary'}
                size="sm"
                onClick={() => setPipMood(exp)}
              >
                {exp}
              </Button>
            ))}
          </div>

          <div className="flex flex-col items-center justify-center p-8 bg-amber-50/50 rounded-2xl border-2 border-dashed border-slate-300">
            <Pip
              expression={pipMood}
              size={180}
              bubbleText={
                pipMood === 'happy'
                  ? "Hi! Let's explore your savings together!"
                  : pipMood === 'curious'
                  ? "Wondering how private companies grow?"
                  : pipMood === 'thinking'
                  ? "Hmm, this stock looks a bit pricey today..."
                  : pipMood === 'calm-reassuring'
                  ? "Markets go up and down. We think long-term!"
                  : "Hooray! Goal unlocked! You're ready to fly!"
              }
            />
          </div>
        </section>

        {/* Dual Jars */}
        <section className="mb-10 bg-white p-6 rounded-3xl border-3 border-ink shadow-sticker">
          <h2 className="text-xl font-bold font-display mb-2">3. The Dual Jars</h2>
          <p className="text-sm text-slate-600 mb-6">Interactive glass jars with animated SVG liquid levels.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <JarCard
              type="save"
              title="Save Jar"
              subtitle="Safe USDC Stablecoin"
              balanceUsd={saveBalance}
              goalUsd={100}
              onClick={() => alert('Save Jar clicked!')}
            />
            <JarCard
              type="moon"
              title="Moon Jar"
              subtitle="Capped PreStocks Companies"
              balanceUsd={moonBalance}
              goalUsd={100}
              tokensCount={4}
              onClick={() => alert('Moon Jar clicked!')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Slider
              label="Save Jar Balance"
              min={0}
              max={100}
              value={saveBalance}
              onChange={setSaveBalance}
              formatValue={(v) => `$${v}`}
              color="sun"
            />
            <Slider
              label="Moon Jar Balance"
              min={0}
              max={100}
              value={moonBalance}
              onChange={setMoonBalance}
              formatValue={(v) => `$${v}`}
              color="grape"
            />
          </div>
        </section>

        {/* PreStocks Token Stickers */}
        <section className="mb-10 bg-white p-6 rounded-3xl border-3 border-ink shadow-sticker">
          <h2 className="text-xl font-bold font-display mb-2">4. PreStocks Token Stickers</h2>
          <p className="text-sm text-slate-600 mb-4">Live badges with calm price tags (no scary charts!).</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PRESTOCKS_LIST.map((token, i) => (
              <TokenSticker
                key={token.symbol}
                symbol={token.symbol}
                name={token.name}
                allocationBps={i < 4 ? 2500 : 0}
                category={i % 3 === 0 ? 'On sale' : i % 3 === 1 ? 'Fair price' : 'A little pricey'}
                valueUsd={i < 4 ? 25 : undefined}
                shares={i < 4 ? 0.35 : undefined}
                onClick={() => setIsModalOpen(true)}
              />
            ))}
          </div>
        </section>

        {/* Interactive Elements & Learn Cards */}
        <section className="mb-10 bg-white p-6 rounded-3xl border-3 border-ink shadow-sticker">
          <h2 className="text-xl font-bold font-display mb-4">5. Ask Chips & Learn Cards</h2>

          <h3 className="font-display font-bold text-md text-slate-700 mb-3">Ask Pip (Conversational Chips)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            <AskChip
              label="Can I buy that toy now?"
              emoji="🧸"
              subtext="Ask guardian to unlock $15 from Save Jar"
              selected={selectedChip === 'toy'}
              onClick={() => setSelectedChip('toy')}
            />
            <AskChip
              label="Why did Pip wait to buy?"
              emoji="⏳"
              subtext="Learn about market prices and patience"
              selected={selectedChip === 'wait'}
              onClick={() => setSelectedChip('wait')}
            />
          </div>

          <h3 className="font-display font-bold text-md text-slate-700 mb-3">Learn Card (Bite-Sized Lesson)</h3>
          <div className="max-w-md mx-auto">
            <LearnCard
              lesson={{
                id: 'shares-slices',
                title: 'What is a Share?',
                icon: '🍕',
                summary: 'Owning a share is like owning a slice of your favorite pizza shop.',
                fullStory: 'Imagine a bakery with 100 slices. If you buy 1 slice, you own a piece of the oven, the flour, and all the tasty cookies!',
                quiz: {
                  question: 'If a company has 100 slices and you have 1, what do you own?',
                  options: ['The whole store', '1 slice of the company', 'Only a cookie'],
                  correctIndex: 1,
                  explanation: 'Right! A share is your own little piece of the company.',
                }
              }}
            />
          </div>
        </section>

        {/* Keeper Decision Log */}
        <section className="mb-10 bg-white p-6 rounded-3xl border-3 border-ink shadow-sticker">
          <h2 className="text-xl font-bold font-display mb-2">6. Transparent Keeper Log</h2>
          <p className="text-sm text-slate-600 mb-4">Every action by the keeper is logged in plain English for parents.</p>
          <DecisionLogItem decision={sampleDecision} />
        </section>

        {/* Modal Demo */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Company Explorer"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 border-2 border-ink flex items-center justify-center text-2xl">
                🚀
              </div>
              <div>
                <h4 className="font-display font-bold text-lg">SpaceX (SPACEX)</h4>
                <p className="text-xs text-slate-500">Commercial Aerospace & Satellite</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              SpaceX builds rockets and sends satellites into space. One day, they hope to help people visit Mars!
            </p>
            <div className="flex justify-between items-center bg-amber-50 p-3 rounded-xl border border-amber-200">
              <span className="text-xs font-bold text-amber-900">Current Status</span>
              <PriceTagPill category="Fair price" />
            </div>
            <Button variant="primary" fullWidth onClick={() => setIsModalOpen(false)}>
              Got it, Pip! 👍
            </Button>
          </div>
        </Modal>
      </main>
    </div>
  );
}
