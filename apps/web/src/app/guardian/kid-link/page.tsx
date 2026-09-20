'use client';

import React, { useState, useEffect } from 'react';
import { getStoredVault, saveVault, VaultState } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Pip } from '@/components/mascot/Pip';
import { 
  QrCode, 
  Copy, 
  Check, 
  Sparkles, 
  RefreshCw, 
  ShieldCheck, 
  ExternalLink, 
  Smartphone, 
  Lock, 
  Eye, 
  FileCheck
} from 'lucide-react';
import Link from 'next/link';

export default function KidLinkPage() {
  const [vault, setVault] = useState<VaultState | null>(null);
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState('demo-token');
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    const v = getStoredVault();
    setVault(v);
    if (v?.metadata?.capabilityToken) {
      setToken(v.metadata.capabilityToken);
    }
  }, []);

  const kidUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/k/${token}`
    : `https://moonjar.app/k/${token}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(kidUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    if (!vault) return;
    setIsRegenerating(true);
    setTimeout(() => {
      const newToken = `tok-${Math.random().toString(36).substring(2, 10)}`;
      setToken(newToken);
      const updated = {
        ...vault,
        metadata: {
          ...vault.metadata,
          capabilityToken: newToken,
        },
      };
      setVault(updated);
      saveVault(updated);
      setIsRegenerating(false);
    }, 600);
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
              <span className="p-2 rounded-xl bg-purple-100 border-2 border-ink">
                <QrCode className="w-5 h-5 text-purple-700" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-ink">
                Kid Link & Tablet Setup
              </h1>
            </div>
            <p className="text-slate-600 text-sm max-w-xl">
              Set up {vault.metadata.nickname}'s iPad or phone in under 30 seconds.
              No seed phrases, no private keys, zero third-party trackers, and read-only safety.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/k/${token}`} target="_blank">
              <Button variant="primary" size="sm" className="gap-2">
                <Sparkles className="w-4 h-4" /> Open Kid App View
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: QR & Capability Link */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: QR Code Card */}
        <div className="bg-white rounded-3xl border-3 border-ink p-6 shadow-sticker flex flex-col items-center text-center space-y-4">
          <div className="p-2 rounded-full bg-purple-100 border-2 border-ink">
            <Smartphone className="w-6 h-6 text-purple-700" />
          </div>

          <div>
            <h2 className="text-lg font-display font-bold text-ink">Scan with Kid's Tablet</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Open the camera on your child's iPad or phone and point it at this sticker.
            </p>
          </div>

          {/* QR Box Visual */}
          <div className="p-4 rounded-3xl bg-slate-50 border-3 border-ink shadow-sticker-sm inline-block">
            {/* High visual quality styled QR code mock using SVG */}
            <div className="w-48 h-48 bg-white p-3 rounded-2xl border-2 border-ink flex flex-col items-center justify-center relative">
              <div className="grid grid-cols-6 gap-1 w-full h-full p-2 bg-slate-100 rounded-lg">
                {Array.from({ length: 36 }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-sm transition-colors ${
                      (i % 2 === 0 && i % 3 === 0) || i === 0 || i === 5 || i === 30 || i === 35
                        ? 'bg-ink'
                        : i % 5 === 0
                        ? 'bg-purple-600'
                        : 'bg-transparent'
                    }`}
                  />
                ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-200 border-2 border-ink shadow-sticker-sm flex items-center justify-center text-xl">
                  🍯
                </div>
              </div>
            </div>
            <div className="text-[10px] font-mono font-bold text-slate-400 mt-2">
              CAPABILITY: {token.substring(0, 14)}...
            </div>
          </div>

          <div className="w-full pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="gap-2 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              {isRegenerating ? 'Regenerating...' : 'Regenerate Capability Link'}
            </Button>
          </div>
        </div>

        {/* Right: URL & COPPA Safety Guarantees */}
        <div className="space-y-6">
          {/* Link box */}
          <div className="bg-white rounded-3xl border-3 border-ink p-6 shadow-sticker space-y-4">
            <h2 className="text-lg font-display font-bold text-ink">Capability Link</h2>
            <p className="text-xs text-slate-500">
              Bookmark this link on the child's browser or add it to their home screen as a web app.
            </p>

            <div className="p-3 rounded-2xl bg-slate-50 border-2 border-ink flex items-center justify-between gap-2">
              <code className="text-xs font-mono text-slate-700 truncate">
                {kidUrl}
              </code>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border-2 border-ink bg-white hover:bg-slate-100 text-xs font-bold text-ink shadow-sticker-sm flex-shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="flex gap-2">
              <Link href={`/k/${token}`} target="_blank" className="flex-1">
                <Button variant="primary" size="sm" className="w-full gap-2">
                  <ExternalLink className="w-4 h-4" /> Open Kid App Directly
                </Button>
              </Link>
            </div>
          </div>

          {/* COPPA & Security Card */}
          <div className="bg-mint-50 rounded-3xl border-3 border-ink p-6 shadow-sticker space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <h3 className="font-display font-extrabold text-ink text-sm">
                Children's Online Privacy & Safety (COPPA)
              </h3>
            </div>

            <ul className="space-y-2 text-xs text-emerald-950 font-medium">
              <li className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold">✓</span>
                <span><strong>Zero Private Keys:</strong> The child's device has zero signing authority. They can never accidentally send tokens or drain funds.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold">✓</span>
                <span><strong>Zero Third-Party Trackers:</strong> No Google Analytics, no Facebook Pixels, no external fonts loaded at runtime. Completely self-hosted.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold">✓</span>
                <span><strong>No Real-World Names:</strong> Nicknames are hashed on-chain. Avatars are playful animals to keep their identity anonymous.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold">✓</span>
                <span><strong>Curated Communication:</strong> Kids communicate using pre-authored request chips (e.g. "I washed dishes!"), avoiding free-form chat risks.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
