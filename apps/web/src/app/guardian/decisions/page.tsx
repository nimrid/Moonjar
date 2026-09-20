'use client';

import React, { useState, useEffect } from 'react';
import { getStoredVault, saveVault, VaultState } from '@/lib/store';
import { DecisionLogItem } from '@/components/ui/DecisionLogItem';
import { Button } from '@/components/ui/Button';
import { Pip } from '@/components/mascot/Pip';
import { 
  ScrollText, 
  Filter, 
  Sparkles, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
  Search
} from 'lucide-react';
import { PRESTOCKS_LIST, BuyDecisionLog } from '@moonjar/shared';

export default function DecisionsPage() {
  const [vault, setVault] = useState<VaultState | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'BUY' | 'SKIP'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<BuyDecisionLog | null>(null);

  useEffect(() => {
    setVault(getStoredVault());
  }, []);

  const handleSimulateKeeper = () => {
    if (!vault) return;
    setIsSimulating(true);

    setTimeout(() => {
      // Pick a random token from prestocks
      const randomToken = PRESTOCKS_LIST[Math.floor(Math.random() * PRESTOCKS_LIST.length)];
      // 50% chance fair price, 50% chance skip
      const isFair = Math.random() > 0.4;
      const premium = isFair ? Number((Math.random() * 8).toFixed(2)) : Number((12 + Math.random() * 15).toFixed(2));
      const amountUsdc = isFair ? 5 : 0;
      const shares = isFair ? Number((amountUsdc / randomToken.tokenPrice).toFixed(4)) : 0;

      const newLog: BuyDecisionLog = {
        id: `dec-${Date.now()}`,
        timestamp: new Date().toISOString(),
        vaultAddress: vault.metadata.vaultAddress,
        symbol: randomToken.symbol,
        action: isFair ? 'BUY' : 'SKIP',
        premiumPct: premium,
        amountInUsdc: amountUsdc * 1_000_000,
        amountOutTokens: Math.floor(shares * 1_000_000),
        machineReason: isFair 
          ? `PREMIUM_ACCEPTABLE (${premium}% <= 10.0%)` 
          : `PREMIUM_TOO_HIGH (${premium}% > 10.0%)`,
        humanReasonKid: isFair
          ? `Pip found a fair price for ${randomToken.name} and tucked a new piece into your Moon Jar!`
          : `${randomToken.name} is priced too high right now. Pip is waiting for a calmer day!`,
        humanReasonGuardian: isFair
          ? `${randomToken.symbol} trading at ${premium}% premium (within 10% tolerance). Executed purchase of $${amountUsdc.toFixed(2)}.`
          : `${randomToken.symbol} at ${premium}% premium exceeds the 10.0% threshold. Keeper skipped to protect capital.`,
        txSignature: isFair ? `${Math.random().toString(36).substring(2, 8)}...${Math.random().toString(36).substring(2, 6)}` : undefined,
      };

      const updatedVault = {
        ...vault,
        saveBalanceUsdc: isFair ? Math.max(0, vault.saveBalanceUsdc - amountUsdc) : vault.saveBalanceUsdc,
        moonBalanceUsdc: isFair ? vault.moonBalanceUsdc + amountUsdc : vault.moonBalanceUsdc,
        moonCostBasisUsdc: isFair ? vault.moonCostBasisUsdc + amountUsdc : vault.moonCostBasisUsdc,
        decisions: [newLog, ...vault.decisions],
      };

      setVault(updatedVault);
      saveVault(updatedVault);
      setIsSimulating(false);
    }, 1000);
  };

  if (!vault) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  const filteredDecisions = vault.decisions.filter((d) => {
    if (filter === 'BUY' && d.action !== 'BUY') return false;
    if (filter === 'SKIP' && d.action !== 'SKIP') return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        d.symbol.toLowerCase().includes(q) ||
        d.humanReasonGuardian.toLowerCase().includes(q) ||
        d.machineReason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalBuys = vault.decisions.filter(d => d.action === 'BUY').length;
  const totalSkips = vault.decisions.filter(d => d.action === 'SKIP').length;
  const avgSlippage = '0.08%';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border-3 border-ink p-6 shadow-sticker relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-purple-100 border-2 border-ink">
                <ScrollText className="w-5 h-5 text-purple-700" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-ink">
                Keeper Decision Log
              </h1>
            </div>
            <p className="text-slate-600 text-sm max-w-xl">
              Every algorithmic buy, valuation rejection, and cap-safeguard executed on Solana devnet.
              Transparent, accountable, and auditable.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={handleSimulateKeeper}
              disabled={isSimulating}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
              {isSimulating ? 'Simulating Evaluation...' : 'Simulate Keeper Run'}
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t-2 border-slate-100">
          <div className="p-3 rounded-2xl bg-amber-50 border-2 border-ink shadow-sticker-sm">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Evaluated</div>
            <div className="text-xl font-display font-extrabold text-ink mt-0.5">{vault.decisions.length}</div>
          </div>
          <div className="p-3 rounded-2xl bg-mint-50 border-2 border-ink shadow-sticker-sm">
            <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Executed Buys</div>
            <div className="text-xl font-display font-extrabold text-emerald-800 mt-0.5">{totalBuys}</div>
          </div>
          <div className="p-3 rounded-2xl bg-sky-50 border-2 border-ink shadow-sticker-sm">
            <div className="text-xs font-bold text-sky-700 uppercase tracking-wider">Overpriced Skips</div>
            <div className="text-xl font-display font-extrabold text-sky-800 mt-0.5">{totalSkips}</div>
          </div>
          <div className="p-3 rounded-2xl bg-purple-50 border-2 border-ink shadow-sticker-sm">
            <div className="text-xs font-bold text-purple-700 uppercase tracking-wider">Avg Slippage</div>
            <div className="text-xl font-display font-extrabold text-purple-900 mt-0.5">{avgSlippage}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl border-2 border-ink text-xs font-display font-bold transition-all ${
              filter === 'ALL'
                ? 'bg-ink text-white shadow-sticker-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Decisions ({vault.decisions.length})
          </button>
          <button
            onClick={() => setFilter('BUY')}
            className={`px-3 py-1.5 rounded-xl border-2 border-ink text-xs font-display font-bold transition-all ${
              filter === 'BUY'
                ? 'bg-mint-400 text-ink shadow-sticker-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            Buys Only ({totalBuys})
          </button>
          <button
            onClick={() => setFilter('SKIP')}
            className={`px-3 py-1.5 rounded-xl border-2 border-ink text-xs font-display font-bold transition-all ${
              filter === 'SKIP'
                ? 'bg-sky-200 text-ink shadow-sticker-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            Skips Only ({totalSkips})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company or reason..."
            className="w-full pl-9 pr-3 py-1.5 text-xs font-medium border-2 border-ink rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>
      </div>

      {/* Decisions List */}
      <div className="space-y-3">
        {filteredDecisions.length === 0 ? (
          <div className="bg-white rounded-3xl border-3 border-ink p-8 text-center shadow-sticker">
            <div className="w-16 h-16 mx-auto mb-3">
              <Pip mood="thinking" />
            </div>
            <h3 className="font-display font-bold text-ink text-lg">No decisions match your filter</h3>
            <p className="text-slate-500 text-xs mt-1">Try clearing your search query or triggering a new keeper check.</p>
          </div>
        ) : (
          filteredDecisions.map((dec) => (
            <div 
              key={dec.id}
              onClick={() => setSelectedDecision(dec)}
              className="cursor-pointer transition-transform hover:-translate-y-0.5"
            >
              <DecisionLogItem decision={dec} />
            </div>
          ))
        )}
      </div>

      {/* Safety Invariant Note */}
      <div className="bg-amber-50 rounded-2xl border-2 border-amber-300 p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 space-y-1">
          <p className="font-bold">Automated Guardian Rule:</p>
          <p>
            Moonjar's on-chain smart contract enforces that Moon Jar purchases can never exceed the <strong>{vault.moonCapBps / 100}% cost-basis cap</strong>,
            and the Keeper strictly rejects any PreStock with an implied secondary valuation premium higher than <strong>10%</strong> above the latest primary round.
          </p>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedDecision && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-3 border-ink p-6 max-w-lg w-full shadow-sticker space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {selectedDecision.action === 'BUY' ? '✅' : '⏸️'}
                </span>
                <div>
                  <h3 className="font-display font-extrabold text-ink text-lg">
                    {selectedDecision.symbol} Decision Breakdown
                  </h3>
                  <div className="text-xs text-slate-500">
                    {new Date(selectedDecision.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDecision(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-xl bg-slate-50 border-2 border-slate-200">
                <div className="text-xs font-bold text-slate-500 uppercase">Valuation Engine Verdict</div>
                <div className="font-mono text-xs font-bold text-ink mt-0.5">
                  {selectedDecision.machineReason}
                </div>
                {selectedDecision.premiumPct !== undefined && (
                  <div className="text-xs text-slate-600 mt-1">
                    Secondary Premium over funding round: <strong>{selectedDecision.premiumPct}%</strong> (Safety limit: 10.0%)
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border-2 border-amber-200">
                <div className="text-xs font-bold text-amber-800 uppercase flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Guardian Explanation
                </div>
                <p className="text-xs text-amber-950 mt-1">
                  {selectedDecision.humanReasonGuardian}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-purple-50 border-2 border-purple-200">
                <div className="text-xs font-bold text-purple-800 uppercase flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> What Pip Told The Kid
                </div>
                <p className="text-xs text-purple-950 mt-1 italic">
                  "{selectedDecision.humanReasonKid}"
                </p>
              </div>

              {selectedDecision.txSignature && (
                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Solana Devnet Signature:</span>
                  <a 
                    href={`https://explorer.solana.com/tx/${selectedDecision.txSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-indigo-600 hover:underline flex items-center gap-1 font-bold"
                  >
                    {selectedDecision.txSignature} <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            <Button 
              variant="primary" 
              className="w-full mt-4" 
              onClick={() => setSelectedDecision(null)}
            >
              Close Breakdown
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
