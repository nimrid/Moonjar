'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getStoredVault, saveVault, VaultState } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { JarCard } from '@/components/ui/JarCard';
import { DecisionLogItem } from '@/components/ui/DecisionLogItem';
import { Modal } from '@/components/ui/Modal';
import { Pip } from '@/components/mascot/Pip';
import { 
  ShieldAlert, 
  PauseCircle, 
  PlayCircle, 
  ArrowUpRight, 
  Gift, 
  Coins, 
  Share2, 
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  SlidersHorizontal,
  ExternalLink
} from 'lucide-react';

export default function GuardianDashboard() {
  const [vault, setVault] = useState<VaultState | null>(null);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('25');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setVault(getStoredVault());
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  if (!vault) return null;

  const totalBalance = vault.saveBalanceUsdc + vault.moonBalanceUsdc;
  const currentMoonPct = totalBalance > 0 ? (vault.moonCostBasisUsdc / vault.totalDepositedUsdc) * 100 : 0;
  const maxMoonPct = vault.moonCapBps / 100;

  const handleTogglePause = () => {
    const updated = { ...vault, isPaused: !vault.isPaused };
    setVault(updated);
    saveVault(updated);
    triggerToast(updated.isPaused ? 'Vault paused. Automatic buys are suspended. Withdrawals remain available.' : 'Vault resumed. Automatic buys are now active.');
  };

  const handleDeposit = () => {
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return;

    const updated: VaultState = {
      ...vault,
      saveBalanceUsdc: vault.saveBalanceUsdc + amt,
      totalDepositedUsdc: vault.totalDepositedUsdc + amt,
    };
    setVault(updated);
    saveVault(updated);
    setDepositModalOpen(false);
    triggerToast(`Successfully deposited $${amt.toFixed(2)} USDC into Save Jar!`);
  };

  const handleApproveRequest = (reqId: string, amount?: number) => {
    if (!vault) return;
    const updatedRequests = vault.requests.map((r) => 
      r.id === reqId ? { ...r, status: 'COMPLETED' as const } : r
    );
    let newSave = vault.saveBalanceUsdc;
    if (amount && newSave >= amount) {
      newSave -= amount;
    }
    const updated: VaultState = {
      ...vault,
      saveBalanceUsdc: newSave,
      requests: updatedRequests,
    };
    setVault(updated);
    saveVault(updated);
    triggerToast('Request approved! Balance updated.');
  };

  const handleRunKeeper = () => {
    // Simulate keeper evaluation
    const newDecision = {
      id: `dec-${Date.now()}`,
      timestamp: new Date().toISOString(),
      vaultAddress: vault.metadata.vaultAddress,
      symbol: 'SPACEX',
      action: 'BUY' as const,
      premiumPct: 7.8,
      amountInUsdc: 5000000,
      amountOutTokens: 413223,
      machineReason: 'PREMIUM_ACCEPTABLE (7.8% <= 10.0%)',
      humanReasonKid: 'Pip found another great deal for SpaceX! A small slice was added to your Moon Jar.',
      humanReasonGuardian: 'Keeper triggered: SpaceX premium evaluated at 7.8%, within 20% cap. Bought $5.00 of shares.',
      txSignature: 'SimulatedOnchainTx_' + Math.random().toString(36).substring(7),
    };
    const updated: VaultState = {
      ...vault,
      saveBalanceUsdc: Math.max(0, vault.saveBalanceUsdc - 5),
      moonBalanceUsdc: vault.moonBalanceUsdc + 5,
      moonCostBasisUsdc: vault.moonCostBasisUsdc + 5,
      decisions: [newDecision, ...vault.decisions],
    };
    setVault(updated);
    saveVault(updated);
    triggerToast('Keeper cycle executed! 1 buy performed within cap.');
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-white px-5 py-3 rounded-2xl border-2 border-sun shadow-sticker flex items-center gap-3 animate-slide-in">
          <Sparkles className="w-5 h-5 text-sun" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner with Kid Overview */}
      <div className="bg-white p-6 rounded-3xl border-3 border-ink shadow-sticker flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border-3 border-ink flex items-center justify-center text-3xl shadow-sticker-sm">
            🦦
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black font-display text-ink">{vault.metadata.nickname}'s Vault</h1>
              <span className="bg-purple-100 text-purple-900 border border-purple-300 text-xs font-bold px-2 py-0.5 rounded-full uppercase">
                {vault.metadata.ageBand} kid
              </span>
            </div>
            <p className="text-sm text-slate-500 font-medium">
              Vault: <span className="font-mono text-xs">{vault.metadata.vaultAddress.slice(0, 8)}...{vault.metadata.vaultAddress.slice(-6)}</span>
              {' '}• Unlocks on {new Date(vault.metadata.unlockDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button variant="primary" size="sm" onClick={() => setDepositModalOpen(true)}>
            <ArrowUpRight className="w-4 h-4 mr-1.5" /> Add Deposit
          </Button>

          <Button
            variant={vault.isPaused ? 'leaf' : 'secondary'}
            size="sm"
            onClick={handleTogglePause}
            className="border-2"
          >
            {vault.isPaused ? (
              <>
                <PlayCircle className="w-4 h-4 mr-1.5 text-emerald-600" /> Resume Buys
              </>
            ) : (
              <>
                <PauseCircle className="w-4 h-4 mr-1.5 text-amber-600" /> Pause Buys
              </>
            )}
          </Button>

          <Link href={`/k/${vault.metadata.capabilityToken}`} target="_blank">
            <Button variant="secondary" size="sm" className="border-2">
              <ExternalLink className="w-4 h-4 mr-1.5 text-purple-600" /> View Kid App
            </Button>
          </Link>
        </div>
      </div>

      {/* Paused Warning Banner if applicable */}
      {vault.isPaused && (
        <div className="bg-amber-100 border-3 border-amber-800 p-4 rounded-2xl flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-amber-800 shrink-0" />
          <div className="text-sm text-amber-900">
            <strong>Vault is currently paused:</strong> Automated PreStock purchases are temporarily stopped. You can still deposit, withdraw, or adjust allocations at any time.
          </div>
        </div>
      )}

      {/* Dual Jars Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <JarCard
          type="save"
          title="Save Jar (Cash)"
          subtitle="Stable liquid balance in USDC"
          balanceUsd={vault.saveBalanceUsdc}
          goalUsd={250}
        />
        <JarCard
          type="moon"
          title="Moon Jar (PreStocks)"
          subtitle="Capped growth in SpaceX, Anduril, Figure"
          balanceUsd={vault.moonBalanceUsdc}
          goalUsd={250}
          tokensCount={vault.allocations.length}
        />
      </div>

      {/* Moon Cap Risk Guardrail Meter */}
      <div className="bg-white p-6 rounded-3xl border-3 border-ink shadow-sticker">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-bold font-display text-ink flex items-center gap-2">
              🛡️ Moon Jar Cost-Basis Cap Guardrail
            </h2>
            <p className="text-xs text-slate-500">
              On-chain constraint enforcing that cumulative PreStock purchases cannot exceed {maxMoonPct}% of all net deposits.
            </p>
          </div>
          <Link href="/guardian/baskets">
            <button className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Adjust Cap
            </button>
          </Link>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 h-6 rounded-full border-2 border-ink overflow-hidden relative">
          <div
            className="bg-purple-500 h-full transition-all duration-500"
            style={{ width: `${Math.min(currentMoonPct, 100)}%` }}
          />
          {/* Target marker */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-red-500 z-10"
            style={{ left: `${maxMoonPct}%` }}
            title={`Max Cap: ${maxMoonPct}%`}
          />
        </div>

        <div className="flex justify-between items-center text-xs mt-2 text-slate-600 font-medium">
          <span>Current Moon Basis: <strong>${vault.moonCostBasisUsdc.toFixed(2)}</strong> ({currentMoonPct.toFixed(1)}%)</span>
          <span className="text-amber-700 font-bold">Max Allowed: {maxMoonPct}% (${(vault.totalDepositedUsdc * (maxMoonPct / 100)).toFixed(2)})</span>
        </div>
      </div>

      {/* Grid of Two Columns: Pending Kid Requests & Automated Keeper Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Kid Requests */}
        <div className="bg-white p-6 rounded-3xl border-3 border-ink shadow-sticker space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-display text-ink flex items-center gap-2">
              📬 Kid Requests
            </h2>
            <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
              {vault.requests.filter(r => r.status === 'PENDING').length} pending
            </span>
          </div>

          {vault.requests.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No pending requests right now.</p>
          ) : (
            <div className="space-y-3">
              {vault.requests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl border-2 border-ink bg-slate-50 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-ink">
                        {req.type === 'ADD_MONEY' ? `💰 Ask for $${req.amount}` : '📖 Learning Question'}
                      </span>
                      {req.status === 'COMPLETED' ? (
                        <span className="text-[10px] bg-green-200 text-green-800 font-bold px-1.5 py-0.5 rounded">Approved</span>
                      ) : (
                        <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded">Pending</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{req.topic}</p>
                    <span className="text-[10px] text-slate-400">
                      {new Date(req.timestamp).toLocaleDateString()}
                    </span>
                  </div>

                  {req.status === 'PENDING' && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleApproveRequest(req.id, req.amount)}
                        className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl border border-ink shadow-sticker-sm"
                        title="Approve"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Automated Keeper Feed */}
        <div className="bg-white p-6 rounded-3xl border-3 border-ink shadow-sticker space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-display text-ink flex items-center gap-2">
                🤖 Autonomous Keeper
              </h2>
              <p className="text-xs text-slate-500">Evaluates valuations & executes buys safely</p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleRunKeeper}>
              Run Check
            </Button>
          </div>

          <div className="space-y-3">
            {vault.decisions.slice(0, 3).map((dec) => (
              <DecisionLogItem key={dec.id} decision={dec} audience="guardian" />
            ))}
          </div>

          <div className="text-center pt-2">
            <Link href="/guardian/decisions" className="text-xs font-bold text-purple-700 hover:underline">
              View All Decisions & On-Chain Proofs →
            </Link>
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      <Modal
        isOpen={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        title="Deposit USDC to Save Jar"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Funds deposited go straight into {vault.metadata.nickname}'s <strong>Save Jar</strong>. The autonomous keeper will gradually buy into the Moon Jar over time according to your allocation and maximum cap.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select or Enter Amount
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {['10', '25', '50', '100'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDepositAmount(preset)}
                  className={`py-2 text-sm font-bold rounded-xl border-2 border-ink ${
                    depositAmount === preset ? 'bg-sun shadow-sticker-sm' : 'bg-white hover:bg-slate-100'
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border-2 border-ink bg-white font-numbers font-bold text-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="25.00"
              />
            </div>
          </div>

          <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 text-xs text-purple-900">
            🎁 <strong>Sponsor Match:</strong> This deposit qualifies for a 1% protocol match added automatically to the vault!
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setDepositModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleDeposit}>
              Confirm Deposit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
