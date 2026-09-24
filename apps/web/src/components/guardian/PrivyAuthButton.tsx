'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useGuardianWallet } from '@/components/providers/PrivySolanaProvider';
import { 
  Wallet, 
  LogOut, 
  Copy, 
  Check, 
  ExternalLink, 
  ChevronDown, 
  User, 
  Sparkles 
} from 'lucide-react';

export const PrivyAuthButton: React.FC = () => {
  const { ready, authenticated, connected, address, user, login, logout } = useGuardianWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  if (!ready) {
    return (
      <div className="h-9 w-28 bg-amber-50 animate-pulse rounded-xl border-2 border-ink/20" />
    );
  }

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-ink bg-amber-400 hover:bg-amber-300 text-ink text-xs font-display font-black shadow-sticker-sm hover:translate-y-[-1px] active:translate-y-[1px] transition-all whitespace-nowrap"
      >
        <span className="text-sm">🍯</span>
        <span>Guardian Login</span>
      </button>
    );
  }

  const shortAddress = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : 'Connecting...';
  const email = user?.email?.address;
  const displayName = email ? email.split('@')[0] : shortAddress;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border-2 border-ink bg-amber-50 hover:bg-amber-100 text-xs font-display font-bold text-ink shadow-sticker-sm transition-all"
        aria-expanded={isOpen}
      >
        <div className="w-5 h-5 rounded-full bg-amber-200 border border-ink flex items-center justify-center text-[10px] shrink-0 font-black">
          {displayName.slice(0, 1).toUpperCase()}
        </div>
        <span className="hidden sm:inline max-w-[100px] truncate">{displayName}</span>
        <span className="sm:hidden">{shortAddress}</span>
        <span className="px-1.5 py-0.2 rounded-md bg-amber-200 text-[10px] font-black tracking-tight text-amber-900 border border-amber-300 hidden md:inline">
          Privy
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl border-3 border-ink bg-white shadow-sticker p-3 z-50 animate-in fade-in-50 zoom-in-95">
          <div className="border-b border-slate-100 pb-2.5 mb-2.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-xl bg-amber-100 border-2 border-ink flex items-center justify-center text-xs font-black">
                🍯
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-ink truncate">
                  {email || 'Guardian Embedded Wallet'}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Self-Custodial & COPPA Safe
                </div>
              </div>
            </div>

            <div className="mt-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between gap-1 text-[11px] font-mono text-slate-700">
                <span className="truncate">{shortAddress}</span>
                <button
                  onClick={handleCopy}
                  className="p-1 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                  title="Copy Solana Address"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <a
              href={`https://explorer.solana.com/address/${address}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                View on Solana Explorer
              </span>
              <span className="text-[10px] font-medium text-slate-400">Devnet</span>
            </a>

            <button
              onClick={async () => {
                setIsOpen(false);
                await logout();
              }}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-xl hover:bg-rose-50 text-xs font-bold text-rose-600 transition-colors text-left"
            >
              <LogOut className="w-3.5 h-3.5" />
              Disconnect Wallet
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
