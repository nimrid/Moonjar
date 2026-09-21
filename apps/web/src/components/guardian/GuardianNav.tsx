'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { 
  LayoutDashboard, 
  PieChart, 
  ScrollText, 
  Gift, 
  Coins, 
  QrCode, 
  Sparkles,
  ShieldCheck,
  PlusCircle
} from 'lucide-react';

export const GuardianNav: React.FC = () => {
  const pathname = usePathname();
  const { connected, publicKey } = useWallet();

  const links = [
    { href: '/guardian/dashboard', label: 'Vault Cockpit', icon: LayoutDashboard },
    { href: '/guardian/baskets', label: 'PreStocks Baskets', icon: PieChart },
    { href: '/guardian/decisions', label: 'Keeper Engine', icon: ScrollText },
    { href: '/guardian/roundups', label: 'Spare Change Roundups', icon: Coins },
  ];

  return (
    <header className="border-b-3 border-ink bg-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🍯</span>
              <span className="font-display font-extrabold text-xl text-ink">Moonjar</span>
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
              <ShieldCheck className="w-3.5 h-3.5" /> Guardian Mode
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/guardian/onboarding">
              <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-ink bg-amber-100 hover:bg-amber-200 text-xs font-bold text-ink shadow-sticker-sm">
                <PlusCircle className="w-4 h-4" /> New Vault
              </button>
            </Link>
            <Link href="/k/demo-token">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-ink bg-purple-100 hover:bg-purple-200 text-xs font-bold text-purple-900 shadow-sticker-sm">
                <Sparkles className="w-4 h-4" /> Switch to Kid View
              </button>
            </Link>
            <div className="scale-90">
              <WalletMultiButton />
            </div>
          </div>
        </div>

        {/* Subnav links */}
        <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto pb-2 pt-1 scrollbar-none" aria-label="Guardian Tabs">
          {links.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-display font-bold rounded-xl whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-ink text-white shadow-sticker-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
