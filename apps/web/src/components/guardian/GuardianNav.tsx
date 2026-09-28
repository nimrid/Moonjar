'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGuardianWallet } from '@/components/providers/PrivySolanaProvider';
import { PrivyAuthButton } from '@/components/guardian/PrivyAuthButton';
import { getStoredVault } from '@/lib/store';
import { 
  LayoutDashboard, 
  PieChart, 
  ScrollText, 
  Gift, 
  Coins, 
  QrCode, 
  Sparkles,
  ShieldCheck,
  PlusCircle,
  ArrowRightLeft
} from 'lucide-react';
import { WalletTransferModal } from '@/components/guardian/WalletTransferModal';

export const GuardianNav: React.FC = () => {
  const pathname = usePathname();
  const { connected, publicKey } = useGuardianWallet();
  const [kidLink, setKidLink] = useState<string>('/k/demo');
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  useEffect(() => {
    const walletAddress = publicKey ? publicKey.toBase58() : undefined;
    const vault = getStoredVault(walletAddress);
    if (vault?.metadata?.capabilityToken) {
      setKidLink(`/k/${vault.metadata.capabilityToken}`);
    } else {
      setKidLink('/k/demo');
    }
  }, [publicKey, connected]);

  const links = [
    { href: '/guardian/dashboard', label: 'Vault Cockpit', icon: LayoutDashboard },
    { href: '/guardian/baskets', label: 'PreStocks Baskets', icon: PieChart },
    { href: '/guardian/decisions', label: 'Keeper Engine', icon: ScrollText },
    { href: '/guardian/roundups', label: 'Spare Change Roundups', icon: Coins },
  ];

  return (
    <header className="border-b-3 border-ink bg-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xl sm:text-2xl">🍯</span>
              <span className="font-display font-extrabold text-lg sm:text-xl text-ink">Moonjar</span>
            </Link>
            <span className="hidden md:inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
              <ShieldCheck className="w-3.5 h-3.5" /> Guardian Mode
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {connected && (
              <button
                type="button"
                onClick={() => setIsTransferOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-ink bg-emerald-100 hover:bg-emerald-200 text-xs font-bold text-emerald-950 shadow-sticker-sm transition-transform active:scale-95"
                title="Transfer USDC or SOL on Surfpool"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">Transfer</span>
              </button>
            )}
            <Link href="/guardian/onboarding">
              <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-ink bg-amber-100 hover:bg-amber-200 text-xs font-bold text-ink shadow-sticker-sm">
                <PlusCircle className="w-4 h-4" /> New Vault
              </button>
            </Link>
            <Link href={kidLink}>
              <button className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border-2 border-ink bg-purple-100 hover:bg-purple-200 text-xs font-bold text-purple-900 shadow-sticker-sm whitespace-nowrap">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-700" />
                <span className="hidden sm:inline">Switch to Kid View</span>
                <span className="sm:hidden">Kid View</span>
              </button>
            </Link>
            <div className="shrink-0 flex items-center">
              <PrivyAuthButton />
            </div>
          </div>
        </div>

        {/* Subnav links */}
        <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto pb-2 pt-1 scrollbar-none touch-pan-x -mx-3 px-3 sm:mx-0 sm:px-0" aria-label="Guardian Tabs">
          {links.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-display font-bold rounded-xl whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? 'bg-ink text-white shadow-sticker-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <WalletTransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
      />
    </header>
  );
};
