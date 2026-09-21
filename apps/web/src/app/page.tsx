'use client';

import React from 'react';
import Link from 'next/link';
import { Pip } from '@/components/mascot/Pip';
import { Button } from '@/components/ui/Button';
import { Shield, Sparkles, Heart, Rocket } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b-3 border-ink bg-white px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🍯</span>
          <span className="font-display font-extrabold text-2xl tracking-tight text-ink">Moonjar</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/design">
            <Button variant="secondary" size="sm">Styleguide</Button>
          </Link>
          <Link href="/guardian/dashboard">
            <Button variant="primary" size="sm">Guardian App</Button>
          </Link>
          <Link href="/k/demo-token">
            <Button variant="grape" size="sm">Kid Portal</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 flex flex-col items-center text-center justify-center">
        <Pip expression="happy" size={160} bubbleText="Hi there! Ready to start saving for the stars?" />
        
        <h1 className="mt-8 text-4xl sm:text-5xl font-black text-ink tracking-tight font-display">
          The Autonomous Pre-IPO <br />
          <span className="text-grape underline decoration-wavy decoration-sun">Savings Vault on Solana</span>.
        </h1>

        <p className="mt-4 text-lg text-slate-600 max-w-2xl font-body">
          Moonjar combines a bedrock savings vault in USDC with algorithmic micro-investing into tokenized private equities (SpaceX, OpenAI, Anduril) powered by PreStocks. Built with mathematical risk caps parents trust.
        </p>

        {/* Action CTAs */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Link href="/guardian/dashboard">
            <Button variant="primary" size="lg" className="flex items-center gap-2">
              <Shield className="w-5 h-5" /> Launch Guardian Vault
            </Button>
          </Link>
          <Link href="/k/demo-token">
            <Button variant="grape" size="lg" className="flex items-center gap-2">
              <Rocket className="w-5 h-5" /> Explore Kid Experience
            </Button>
          </Link>
          <Link href="/guardian/baskets">
            <Button variant="secondary" size="lg" className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" /> PreStocks Baskets
            </Button>
          </Link>
        </div>

        {/* Features callout */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 text-left w-full">
          <div className="p-6 rounded-3xl bg-white border-3 border-ink shadow-sticker">
            <div className="text-3xl mb-2">🏺</div>
            <h3 className="font-display font-bold text-lg mb-1">Dual-Jar Structure</h3>
            <p className="text-sm text-slate-600">The <strong>Save Jar</strong> stays in cash (USDC). The <strong>Moon Jar</strong> buys fractions of pioneering private companies with strict percentage caps.</p>
          </div>
          <div className="p-6 rounded-3xl bg-white border-3 border-ink shadow-sticker">
            <div className="text-3xl mb-2">🛡️</div>
            <h3 className="font-display font-bold text-lg mb-1">Guardian Protection</h3>
            <p className="text-sm text-slate-600">Guardian retains full key control and emergency instant-freeze authority. Kids get view-only access with zero PII stored.</p>
          </div>
          <div className="p-6 rounded-3xl bg-white border-3 border-ink shadow-sticker">
            <div className="text-3xl mb-2">✨</div>
            <h3 className="font-display font-bold text-lg mb-1">Smart Automation</h3>
            <p className="text-sm text-slate-600">Automated keeper avoids market peaks by checking valuation multiples before buying. Micro-investing with built-in patience.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-3 border-ink bg-white py-6 text-center text-xs text-slate-500 font-medium">
        <p>Moonjar • Designed for curious kids and caring families on Solana • Built with ❤️ and PreStocks</p>
      </footer>
    </div>
  );
}
