'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getStoredVaultByToken, VaultState } from '@/lib/store';
import { 
  Sparkles, 
  Home, 
  Rocket, 
  Sprout, 
  BookOpen, 
  MessageCircleQuestion, 
  GraduationCap, 
  ShieldCheck,
  Award
} from 'lucide-react';
import { Pip } from '@/components/mascot/Pip';

export default function KidLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { token: string };
}) {
  const pathname = usePathname();
  const token = params.token;
  const [vault, setVault] = useState<VaultState | null>(() => getStoredVaultByToken(token));

  useEffect(() => {
    setVault(getStoredVaultByToken(token));
  }, [token]);

  const avatarEmoji: Record<string, string> = {
    otter: '🦦',
    panda: '🐼',
    fox: '🦊',
    owl: '🦉',
    koala: '🐨',
    badger: '🦡',
  };

  const currentAvatar = vault?.metadata.avatar ? avatarEmoji[vault.metadata.avatar] || '🦦' : '🦦';
  const childName = vault?.metadata.nickname || 'Explorer';
  const ageLabel = vault?.metadata.ageBand === 'big' ? 'Ages 10-17' : 'Ages 6-9';

  const navItems = [
    { href: `/k/${token}`, label: 'My Jars', icon: Home },
    { href: `/k/${token}/moon`, label: 'Inside Moon Jar', icon: Rocket },
    { href: `/k/${token}/garden`, label: 'Compound Garden', icon: Sprout },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-ink font-body selection:bg-amber-200">
      {/* Kid Top Header */}
      <header className="border-b-3 border-ink bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-2">
            {/* Child Profile & Pip Greeting */}
            <Link href={`/k/${token}`} className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-100 border-2 border-ink flex items-center justify-center text-xl sm:text-2xl shadow-sticker-sm shrink-0">
                {currentAvatar}
              </div>
              <div className="min-w-0">
                <div className="font-display font-extrabold text-sm sm:text-base text-ink leading-tight flex items-center gap-1 sm:gap-1.5">
                  <span className="truncate">{childName}</span>
                  <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300 font-bold shrink-0">
                    {ageLabel}
                  </span>
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-500 font-bold flex items-center gap-1">
                  <span>Pip is with you</span>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                </div>
              </div>
            </Link>

            {/* Quick Switcher for Guardian / Parents */}
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/guardian/dashboard">
                <button className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl border-2 border-ink bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 shadow-sticker-sm transition-transform active:scale-95 whitespace-nowrap">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span className="hidden sm:inline">Parent Mode</span>
                  <span className="sm:hidden text-[11px]">Parent</span>
                </button>
              </Link>
            </div>
          </div>

          {/* Kid Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-2.5 pt-1 scrollbar-none touch-pan-x -mx-3 px-3 sm:mx-0 sm:px-0" aria-label="Kid Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-display font-bold rounded-2xl whitespace-nowrap transition-all shrink-0 ${
                    isActive
                      ? 'bg-ink text-white shadow-sticker-sm translate-y-[-1px]'
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
      </header>

      {/* Main Kid Content Area (Max width 4xl, mobile optimized) */}
      <main className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-20">
        {children}
      </main>
    </div>
  );
}
