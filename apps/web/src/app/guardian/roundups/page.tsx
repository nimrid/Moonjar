'use client';

import React, { useState, useEffect } from 'react';
import { getStoredVault, saveVault, VaultState } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Pip } from '@/components/mascot/Pip';
import { useWallet } from '@solana/wallet-adapter-react';
import confetti from 'canvas-confetti';
import { 
  Coins, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  ArrowRight, 
  Zap, 
  ArrowLeftRight, 
  Send, 
  Sliders, 
  Layers, 
  CheckCircle2 
} from 'lucide-react';

interface OnChainRoundupTx {
  id: string;
  type: 'JUPITER_DEX' | 'SPL_TRANSFER' | 'RAYDIUM_AMM' | 'DEFI_DEPOSIT';
  protocol: string;
  badgeColor: string;
  icon: string;
  description: string;
  volumeUsd: number;
  roundedUpUsdc: number;
  txHash: string;
  timestamp: string;
}

export default function RoundupsPage() {
  const { publicKey } = useWallet();
  const [vault, setVault] = useState<VaultState | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [multiplier, setMultiplier] = useState<1 | 2 | 5>(1);
  const [weeklyCap, setWeeklyCap] = useState(25);
  const [isSaved, setIsSaved] = useState(false);
  const [includeJupiter, setIncludeJupiter] = useState(true);
  const [includeSpl, setIncludeSpl] = useState(true);
  const [includeDeFi, setIncludeDeFi] = useState(true);

  const [transactions, setTransactions] = useState<OnChainRoundupTx[]>([
    {
      id: 'tx-1',
      type: 'JUPITER_DEX',
      protocol: 'Jupiter Aggregator',
      badgeColor: 'bg-orange-100 text-orange-900 border-orange-300',
      icon: '🪐',
      description: 'Swap 1.25 SOL → 184.35 USDC',
      volumeUsd: 184.35,
      roundedUpUsdc: 0.65,
      txHash: '5xPt9nK2aLv18WmQmK3e...',
      timestamp: '45 mins ago',
    },
    {
      id: 'tx-2',
      type: 'SPL_TRANSFER',
      protocol: 'Solana SPL Transfer',
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
      icon: '💸',
      description: 'Transfer 32.18 USDC to alex.sol',
      volumeUsd: 32.18,
      roundedUpUsdc: 0.82,
      txHash: '4zKt8mPx9vL12QeRmK4a...',
      timestamp: '3 hours ago',
    },
    {
      id: 'tx-3',
      type: 'RAYDIUM_AMM',
      protocol: 'Raydium AMM',
      badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300',
      icon: '⚡',
      description: 'Swap 50.40 USDC → 0.34 SOL',
      volumeUsd: 50.40,
      roundedUpUsdc: 0.60,
      txHash: '3yNm7pQx2wK81ZeRmK5b...',
      timestamp: 'Yesterday',
    },
    {
      id: 'tx-4',
      type: 'DEFI_DEPOSIT',
      protocol: 'Kamino Finance',
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      icon: '🏦',
      description: 'Lend 74.10 USDC into J-USDC Pool',
      volumeUsd: 74.10,
      roundedUpUsdc: 0.90,
      txHash: '2xJm6oPw1vL70QdPmK6c...',
      timestamp: '2 days ago',
    },
  ]);

  useEffect(() => {
    setVault(getStoredVault());
  }, []);

  const totalSavedThisWeek = transactions.reduce((acc, s) => acc + (s.roundedUpUsdc * multiplier), 0);

  const executeRoundupDeposit = (roundDiff: number, tx: OnChainRoundupTx) => {
    if (!vault) return;
    const totalAdd = roundDiff * multiplier;
    const saveShare = Number((totalAdd * 0.8).toFixed(2));
    const moonShare = Number((totalAdd * 0.2).toFixed(2));

    const updated: VaultState = {
      ...vault,
      saveBalanceUsdc: Number((vault.saveBalanceUsdc + saveShare).toFixed(2)),
      moonBalanceUsdc: Number((vault.moonBalanceUsdc + moonShare).toFixed(2)),
      totalDepositedUsdc: Number((vault.totalDepositedUsdc + totalAdd).toFixed(2)),
    };

    setVault(updated);
    saveVault(updated);
    setTransactions([tx, ...transactions]);

    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#FFE853', '#38D39F', '#A084E8'],
    });
  };

  const handleSimulateJupiterSwap = () => {
    const solAmounts = [0.85, 1.20, 2.45, 0.60, 1.75];
    const chosenSol = solAmounts[Math.floor(Math.random() * solAmounts.length)];
    const solPrice = 148.20;
    const totalUsd = Number((chosenSol * solPrice).toFixed(2));
    const nextWhole = Math.ceil(totalUsd);
    const roundDiff = Number((nextWhole - totalUsd).toFixed(2)) || 0.50;

    const randomSig = `${Math.random().toString(36).substring(2, 6)}...${Math.random().toString(36).substring(2, 6)}`;

    const newTx: OnChainRoundupTx = {
      id: `tx-${Date.now()}`,
      type: 'JUPITER_DEX',
      protocol: 'Jupiter Aggregator',
      badgeColor: 'bg-orange-100 text-orange-900 border-orange-300',
      icon: '🪐',
      description: `Swap ${chosenSol} SOL → ${totalUsd.toFixed(2)} USDC`,
      volumeUsd: totalUsd,
      roundedUpUsdc: roundDiff,
      txHash: `5x${randomSig}`,
      timestamp: 'Just now',
    };

    executeRoundupDeposit(roundDiff, newTx);
  };

  const handleSimulateSplTransfer = () => {
    const recipients = ['sarah.sol', 'coffee-shop.sol', 'hardware-store.sol', 'devs.sol'];
    const recipient = recipients[Math.floor(Math.random() * recipients.length)];
    const transferAmts = [14.35, 27.80, 8.65, 42.15, 19.90];
    const totalUsd = transferAmts[Math.floor(Math.random() * transferAmts.length)];
    const nextWhole = Math.ceil(totalUsd);
    const roundDiff = Number((nextWhole - totalUsd).toFixed(2)) || 0.45;

    const randomSig = `${Math.random().toString(36).substring(2, 6)}...${Math.random().toString(36).substring(2, 6)}`;

    const newTx: OnChainRoundupTx = {
      id: `tx-${Date.now()}`,
      type: 'SPL_TRANSFER',
      protocol: 'Solana SPL Transfer',
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
      icon: '💸',
      description: `Transfer ${totalUsd.toFixed(2)} USDC to ${recipient}`,
      volumeUsd: totalUsd,
      roundedUpUsdc: roundDiff,
      txHash: `4z${randomSig}`,
      timestamp: 'Just now',
    };

    executeRoundupDeposit(roundDiff, newTx);
  };

  const handleSaveSettings = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  if (!vault) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  const walletDisplay = publicKey 
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : `${vault.metadata.guardianWallet.slice(0, 4)}...${vault.metadata.guardianWallet.slice(-4)}`;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border-3 border-ink p-6 shadow-sticker relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-amber-100 border-2 border-ink">
                <Coins className="w-5 h-5 text-amber-700" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-ink">
                On-Chain Activity Round-ups
              </h1>
            </div>
            <p className="text-slate-600 text-sm max-w-2xl">
              Turn your everyday Solana trading and transfers into micro-investments for {vault.metadata.nickname}.
              Whenever your guardian wallet executes a swap on Jupiter or sends an SPL transfer, odd cents are swept automatically into the dual vault.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border-2 border-ink px-3 py-1.5 rounded-2xl shadow-sticker-sm">
              <span className="text-xs font-bold text-slate-700">Auto Sweep:</span>
              <button
                onClick={() => setIsEnabled(!isEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative border-2 border-ink ${
                  isEnabled ? 'bg-emerald-400' : 'bg-slate-300'
                }`}
                title="Toggle Auto Roundups"
              >
                <div 
                  className={`w-4 h-4 rounded-full bg-white border border-ink absolute top-0.5 transition-transform ${
                    isEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} 
                />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t-2 border-slate-100">
          <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-ink shadow-sticker-sm">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Swept This Week</div>
            <div className="text-2xl font-display font-extrabold text-ink mt-0.5">
              ${totalSavedThisWeek.toFixed(2)} <span className="text-xs text-slate-500 font-bold">/ ${weeklyCap}.00 cap</span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-200 rounded-full mt-2 overflow-hidden border border-ink">
              <div 
                className="h-full bg-amber-400 rounded-full" 
                style={{ width: `${Math.min(100, (totalSavedThisWeek / weeklyCap) * 100)}%` }} 
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-mint-50 border-2 border-ink shadow-sticker-sm">
            <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Active Multiplier</div>
            <div className="text-2xl font-display font-extrabold text-emerald-900 mt-0.5">
              {multiplier}x <span className="text-xs font-bold text-emerald-700 font-sans">({multiplier === 1 ? 'Standard Cents' : multiplier === 2 ? 'Double Boost' : '5x Turbo Boost'})</span>
            </div>
            <div className="text-[11px] text-emerald-800 mt-1">
              Micro-cents multiplied before on-chain deposit
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50 border-2 border-ink shadow-sticker-sm">
            <div className="text-xs font-bold text-purple-800 uppercase tracking-wider">Dual Jar Routing</div>
            <div className="text-2xl font-display font-extrabold text-purple-950 mt-0.5">
              80% <span className="text-sm font-sans font-bold text-emerald-700">Save</span> / 20% <span className="text-sm font-sans font-bold text-purple-700">Moon</span>
            </div>
            <div className="text-[11px] text-purple-800 mt-1">
              Hard cost-basis cap enforced on all inflows
            </div>
          </div>
        </div>
      </div>

      {/* Settings & On-Chain Activity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Settings Box */}
        <div className="bg-white rounded-3xl border-3 border-ink p-6 shadow-sticker space-y-6">
          <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-3">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-display font-bold text-ink">Web3 Round-up Rules</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">Round-up Multiplier</label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 5].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMultiplier(m as 1 | 2 | 5)}
                    className={`p-3 rounded-2xl border-2 border-ink text-center transition-all ${
                      multiplier === m
                        ? 'bg-amber-300 text-ink shadow-sticker-sm font-bold'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <div className="text-base font-extrabold">{m}x</div>
                    <div className="text-[10px] text-slate-600">
                      {m === 1 ? '1x Round' : m === 2 ? '2x Double' : '5x Turbo'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Weekly Round-up Cap</label>
                <span className="text-sm font-display font-bold text-ink">${weeklyCap}.00 / week</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={weeklyCap}
                onChange={(e) => setWeeklyCap(Number(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
                <span>$5</span>
                <span>$25 (recommended)</span>
                <span>$100</span>
              </div>
            </div>

            {/* Protocol Trigger Checkboxes */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Monitored On-Chain Activities</label>
              
              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span>🪐</span> Jupiter DEX Swaps
                </span>
                <input 
                  type="checkbox" 
                  checked={includeJupiter} 
                  onChange={(e) => setIncludeJupiter(e.target.checked)} 
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span>💸</span> SPL USDC & SOL Transfers
                </span>
                <input 
                  type="checkbox" 
                  checked={includeSpl} 
                  onChange={(e) => setIncludeSpl(e.target.checked)} 
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span>🏦</span> DeFi Yield & Lending Claims
                </span>
                <input 
                  type="checkbox" 
                  checked={includeDeFi} 
                  onChange={(e) => setIncludeDeFi(e.target.checked)} 
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
              </label>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-amber-700" /> Non-Custodial SPL Delegation
              </div>
              <p>
                Round-ups are executed via an SPL Token Delegate approval capped strictly at your weekly limit.
                Your guardian private keys never leave your device.
              </p>
            </div>

            <Button 
              variant="primary" 
              className="w-full gap-2"
              onClick={handleSaveSettings}
            >
              {isSaved ? <Check className="w-4 h-4" /> : null}
              {isSaved ? 'Preferences Saved!' : 'Save On-Chain Rules'}
            </Button>
          </div>
        </div>

        {/* On-Chain Transaction Feed & Simulators */}
        <div className="bg-white rounded-3xl border-3 border-ink p-6 shadow-sticker flex flex-col justify-between space-y-4">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-100 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-display font-bold text-ink">Recent Wallet Activity</h2>
              </div>

              {/* Web3 Simulators */}
              <div className="flex items-center gap-1.5">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={handleSimulateJupiterSwap}
                  className="gap-1 text-xs px-2.5 py-1"
                  title="Simulate a Jupiter Swap and round up odd cents"
                >
                  <ArrowLeftRight className="w-3 h-3 text-orange-600" /> Jupiter
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={handleSimulateSplTransfer}
                  className="gap-1 text-xs px-2.5 py-1"
                  title="Simulate an SPL Transfer and round up odd cents"
                >
                  <Send className="w-3 h-3 text-purple-600" /> SPL Send
                </Button>
              </div>
            </div>

            <div className="space-y-2.5 mt-4 max-h-[340px] overflow-y-auto pr-1">
              {transactions.map((tx) => {
                const totalAdded = (tx.roundedUpUsdc * multiplier).toFixed(2);
                const savePortion = (parseFloat(totalAdded) * 0.8).toFixed(2);
                const moonPortion = (parseFloat(totalAdded) * 0.2).toFixed(2);

                return (
                  <div 
                    key={tx.id}
                    className="p-3.5 rounded-2xl border-2 border-ink bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-300 flex items-center justify-center font-bold text-base shadow-sticker-sm">
                        {tx.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${tx.badgeColor}`}>
                            {tx.protocol}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                            {tx.txHash} <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                          </span>
                        </div>
                        <div className="text-xs font-bold text-ink mt-0.5">{tx.description}</div>
                        <div className="text-[10px] text-slate-400">{tx.timestamp}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono text-slate-500">${tx.volumeUsd.toFixed(2)}</div>
                      <div className="text-xs font-display font-extrabold text-emerald-700">
                        +${totalAdded} swept
                      </div>
                      <div className="text-[9px] text-slate-400">
                        +${savePortion} save / +${moonPortion} moon
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t-2 border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Connected Guardian: <span className="font-mono font-bold text-ink">{walletDisplay}</span>
            </span>
            <span className="text-[11px] font-bold text-purple-700">Solana Mainnet & Devnet</span>
          </div>
        </div>
      </div>
    </div>
  );
}
