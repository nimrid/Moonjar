'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getStoredVault, getOrCreateStoredVault, saveVault, VaultState } from '@/lib/store';
import { usePreStocks } from '@/lib/usePreStocks';
import {
  fetchOnChainVaultState,
  fetchAllOnChainVaults,
  OnChainVaultSummary,
  RPC_URL,
  getNetworkLabel,
} from '@/lib/onchain';
import { Button } from '@/components/ui/Button';
import { JarCard } from '@/components/ui/JarCard';
import { DecisionLogItem } from '@/components/ui/DecisionLogItem';
import { Modal } from '@/components/ui/Modal';
import { Pip } from '@/components/mascot/Pip';
import { useGuardianWallet } from '@/components/providers/PrivySolanaProvider';
import { WalletTransferModal } from '@/components/guardian/WalletTransferModal';
import { 
  ShieldAlert, 
  PauseCircle, 
  PlayCircle, 
  ArrowUpRight, 
  Coins, 
  Sparkles,
  SlidersHorizontal,
  ExternalLink,
  RefreshCw,
  Zap,
  CheckCircle2,
  ArrowRightLeft,
} from 'lucide-react';

export default function GuardianDashboard() {
  const [vault, setVault] = useState<VaultState | null>(null);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('25');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSyncingOnChain, setIsSyncingOnChain] = useState(false);
  const [isKeeperRunning, setIsKeeperRunning] = useState(false);
  const [availableVaults, setAvailableVaults] = useState<OnChainVaultSummary[]>([]);
  const { tokens, getToken } = usePreStocks();
  const { connected, publicKey, depositToVault, usdcBalance } = useGuardianWallet();

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const syncOnChain = useCallback(
    async (targetAddress?: string) => {
      setIsSyncingOnChain(true);
      try {
        const all = await fetchAllOnChainVaults();
        setAvailableVaults(all);

        // Find vault belonging to connected guardian wallet
        let addr = targetAddress;
        if (!addr && publicKey) {
          const myVault = all.find((v) => v.guardian === publicKey.toBase58());
          if (myVault) {
            addr = myVault.address;
          }
        }

        // Check local store for this wallet if not found on cluster
        if (!addr && publicKey) {
          const stored = getStoredVault(publicKey.toBase58());
          if (stored && stored.metadata.guardianWallet === publicKey.toBase58()) {
            addr = stored.metadata.vaultAddress;
          }
        }

        if (addr) {
          const onChain = await fetchOnChainVaultState(addr, tokens);
          const currentVault = vault || getStoredVault(publicKey?.toBase58()) || getOrCreateStoredVault(publicKey?.toBase58());
          if (onChain) {
            const updated: VaultState = {
              ...currentVault,
              ...onChain,
              metadata: {
                ...currentVault.metadata,
                vaultAddress: addr,
                guardianWallet: publicKey ? publicKey.toBase58() : currentVault.metadata.guardianWallet,
              },
            };
            setVault(updated);
            saveVault(updated);
            triggerToast(`Synced live on-chain state for vault ${addr.slice(0, 8)}...`);
          }
        } else if (publicKey) {
          // Connected wallet has no vault yet
          setVault(null);
        }
      } catch (err: any) {
        console.warn('Sync failed:', err);
      } finally {
        setIsSyncingOnChain(false);
      }
    },
    [vault, tokens, publicKey]
  );

  useEffect(() => {
    const v = getStoredVault(publicKey?.toBase58());
    setVault(v);
    syncOnChain(v?.metadata?.vaultAddress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey]);

  if (!vault) {
    return (
      <div className="bg-white rounded-3xl border-3 border-ink p-8 shadow-sticker text-center max-w-xl mx-auto my-12 space-y-4">
        <div className="w-20 h-20 mx-auto">
          <Pip mood="curious" size={80} />
        </div>
        <h2 className="text-2xl font-display font-extrabold text-ink">No Active Vault Found</h2>
        <p className="text-sm text-slate-600">
          You haven't configured a child savings vault yet. Set up a vault with custom safety caps, reading level, and friendly animal avatar.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link href="/guardian/onboarding">
            <Button variant="primary">Create Child Vault ✨</Button>
          </Link>
          <Button variant="secondary" onClick={() => setVault(getOrCreateStoredVault(publicKey?.toBase58()))}>
            Initialize Fresh Clean Vault
          </Button>
        </div>
      </div>
    );
  }

  const totalBalance = vault.saveBalanceUsdc + vault.moonBalanceUsdc;
  const currentMoonPct = vault.totalDepositedUsdc > 0 ? (vault.moonCostBasisUsdc / vault.totalDepositedUsdc) * 100 : 0;
  const maxMoonPct = vault.moonCapBps / 100;

  const handleTogglePause = () => {
    const updated = { ...vault, isPaused: !vault.isPaused };
    setVault(updated);
    saveVault(updated);
    triggerToast(updated.isPaused ? 'Vault paused. Automatic buys are suspended. Withdrawals remain available.' : 'Vault resumed. Automatic buys are now active.');
  };

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return;

    setDepositModalOpen(false);

    // If guardian is connected via Privy and has funds, try signing directly on-chain!
    if (connected && usdcBalance >= amt && vault?.metadata?.vaultAddress) {
      triggerToast(`Signing $${amt.toFixed(2)} deposit on-chain with Privy wallet...`);
      try {
        const res = await depositToVault({
          vaultAddress: vault.metadata.vaultAddress,
          amountUsdc: amt,
        });
        triggerToast(`🎉 On-chain deposit confirmed via Privy! Tx: ${res.signature.slice(0, 8)}...`);
        await syncOnChain(vault.metadata.vaultAddress);
        return;
      } catch (err: any) {
        console.warn('Direct Privy deposit failed, attempting server route fallback:', err);
      }
    }

    triggerToast(`Submitting $${amt.toFixed(2)} deposit on-chain to ${getNetworkLabel()}...`);

    try {
      const res = await fetch('/api/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaultAddress: vault.metadata.vaultAddress,
          amountUsdc: amt,
        }),
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`🎉 On-chain deposit confirmed! Tx: ${data.txSignature?.slice(0, 8)}...`);
        await syncOnChain(vault.metadata.vaultAddress);
      } else {
        // Fallback to local store if RPC is unreachable
        const updated: VaultState = {
          ...vault,
          saveBalanceUsdc: Number((vault.saveBalanceUsdc + amt).toFixed(2)),
          totalDepositedUsdc: Number((vault.totalDepositedUsdc + amt).toFixed(2)),
        };
        setVault(updated);
        saveVault(updated);
        triggerToast(`Deposited $${amt.toFixed(2)} USDC to local state (${data.error})`);
      }
    } catch (err: any) {
      triggerToast(`Deposit error: ${err.message}`);
    }
  };

  const handleRunKeeper = async (force: boolean = false) => {
    if (!vault) return;
    if (vault.isPaused) {
      triggerToast('Vault is paused. Resume buys to run keeper evaluations.');
      return;
    }

    setIsKeeperRunning(true);
    triggerToast(`🤖 Keeper evaluating on-chain vault on ${getNetworkLabel()}...`);

    try {
      const res = await fetch('/api/keeper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaultAddress: vault.metadata.vaultAddress,
          forceBuy: force,
        }),
      });
      const data = await res.json();
      if (data.success && data.decision) {
        const cleanExisting = (vault.decisions || []).filter(
          (d) => d.vaultAddress === vault.metadata.vaultAddress && !d.id.startsWith('dec-10')
        );
        const updatedDecisions = [data.decision, ...cleanExisting];
        const updatedVault = {
          ...vault,
          decisions: updatedDecisions,
        };
        setVault(updatedVault);
        saveVault(updatedVault);

        if (data.decision.action === 'BUY') {
          triggerToast(`🚀 Live Buy Executed! Signature: ${data.txSignature?.slice(0, 8)}...`);
          await syncOnChain(vault.metadata.vaultAddress);
        } else {
          triggerToast(`Keeper Check: ${data.decision.humanReasonGuardian}`);
        }
      } else {
        triggerToast(`Keeper notice: ${data.error || 'Check completed'}`);
      }
    } catch (err: any) {
      triggerToast(`Keeper error: ${err.message}`);
    } finally {
      setIsKeeperRunning(false);
    }
  };

  const roundupTxs = vault.roundupTransactions || [];
  const accumulatedThisWeek = roundupTxs.reduce((sum, tx) => sum + tx.roundedUpUsdc, 0);
  const saveRoundupSplit = (accumulatedThisWeek * 0.8).toFixed(2);
  const moonRoundupSplit = (accumulatedThisWeek * 0.2).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-white px-5 py-3 rounded-2xl border-2 border-sun shadow-sticker flex items-center gap-3 animate-slide-in max-w-md">
          <Sparkles className="w-5 h-5 text-sun shrink-0" />
          <span className="text-xs sm:text-sm font-semibold leading-tight">{toastMessage}</span>
        </div>
      )}

      {/* Cluster & Validator Connectivity Strip */}
      <div className="bg-amber-50 border-2 border-ink rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sticker-sm text-xs font-bold">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-ink">{getNetworkLabel()}:</span>
          <span className="font-mono text-purple-950 font-normal bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
            {RPC_URL}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {availableVaults.length > 0 && (
            <select
              value={vault.metadata.vaultAddress}
              onChange={(e) => syncOnChain(e.target.value)}
              className="bg-white border-2 border-ink rounded-xl px-2 py-1 text-xs font-mono font-bold"
            >
              {availableVaults.map((v) => (
                <option key={v.address} value={v.address}>
                  Vault {v.address.slice(0, 6)}... (${v.totalDepositedUsdc.toFixed(0)} deposited)
                </option>
              ))}
            </select>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => syncOnChain(vault.metadata.vaultAddress)}
            disabled={isSyncingOnChain}
            className="py-1 px-3 text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingOnChain ? 'animate-spin' : ''}`} />
            {isSyncingOnChain ? 'Syncing...' : 'Sync On-Chain'}
          </Button>
        </div>
      </div>

      {/* Top Banner with Kid Overview */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border-3 border-ink shadow-sticker flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-amber-100 border-2 sm:border-3 border-ink flex items-center justify-center text-2xl sm:text-3xl shadow-sticker-sm shrink-0">
            {vault.metadata.avatar === 'panda' ? '🐼' : vault.metadata.avatar === 'fox' ? '🦊' : vault.metadata.avatar === 'owl' ? '🦉' : vault.metadata.avatar === 'koala' ? '🐨' : vault.metadata.avatar === 'badger' ? '🦡' : '🦦'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black font-display text-ink">{vault.metadata.nickname}'s Vault</h1>
              <span className="bg-purple-100 text-purple-900 border border-purple-300 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full uppercase">
                {vault.metadata.ageBand} kid
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Vault: <span className="font-mono text-xs font-bold text-ink">{vault.metadata.vaultAddress.slice(0, 8)}...{vault.metadata.vaultAddress.slice(-6)}</span>
              {' '}• Unlocks on {new Date(vault.metadata.unlockDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full md:w-auto">
          <Button variant="primary" size="sm" onClick={() => setDepositModalOpen(true)} className="w-full sm:w-auto text-xs py-2">
            <ArrowUpRight className="w-4 h-4 mr-1" /> Add Deposit
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsTransferModalOpen(true)}
            className="border-2 w-full sm:w-auto text-xs py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold"
          >
            <ArrowRightLeft className="w-4 h-4 mr-1 text-emerald-700" /> Transfer Funds
          </Button>

          <Button
            variant={vault.isPaused ? 'leaf' : 'secondary'}
            size="sm"
            onClick={handleTogglePause}
            className="border-2 w-full sm:w-auto text-xs py-2"
          >
            {vault.isPaused ? (
              <>
                <PlayCircle className="w-4 h-4 mr-1 text-emerald-600" /> Resume Buys
              </>
            ) : (
              <>
                <PauseCircle className="w-4 h-4 mr-1 text-amber-600" /> Pause Buys
              </>
            )}
          </Button>

          <Link href={`/k/${vault.metadata.capabilityToken}`} target="_blank" className="col-span-2 sm:col-span-1 w-full sm:w-auto">
            <Button variant="secondary" size="sm" className="border-2 w-full sm:w-auto text-xs py-2">
              <ExternalLink className="w-4 h-4 mr-1 text-purple-600" /> View Kid App
            </Button>
          </Link>
        </div>
      </div>

      {/* Paused Warning Banner if applicable */}
      {vault.isPaused && (
        <div className="bg-amber-100 border-3 border-amber-800 p-3 sm:p-4 rounded-2xl flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-amber-800 shrink-0" />
          <div className="text-xs sm:text-sm text-amber-900">
            <strong>Vault is currently paused:</strong> Automated PreStock purchases are temporarily stopped. You can still deposit, withdraw, or adjust allocations at any time.
          </div>
        </div>
      )}

      {/* Dual Jars Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <JarCard
          type="save"
          title="Save Jar (Cash)"
          subtitle="Liquid principal held in on-chain USDC"
          balanceUsd={vault.saveBalanceUsdc}
          goalUsd={Math.max(100, vault.totalDepositedUsdc)}
        />
        <JarCard
          type="moon"
          title="Moon Jar (PreStocks)"
          subtitle={`SpaceX & Frontier Assets (Cost Basis: $${vault.moonCostBasisUsdc.toFixed(2)})`}
          balanceUsd={vault.moonBalanceUsdc}
          goalUsd={Math.max(100, vault.totalDepositedUsdc)}
          tokensCount={vault.allocations.filter((a) => a.sharesOwned > 0).length}
        />
      </div>

      {/* Moon Cap Risk Guardrail Meter */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border-3 border-ink shadow-sticker">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 sm:mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold font-display text-ink flex items-center gap-2">
              🛡️ Moon Jar Cost-Basis Cap Guardrail
            </h2>
            <p className="text-xs text-slate-500">
              On-chain constraint enforcing that cumulative PreStock purchases cannot exceed {maxMoonPct}% of all net deposits.
            </p>
          </div>
          <Link href="/guardian/baskets" className="shrink-0">
            <button className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Adjust Cap
            </button>
          </Link>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 h-5 sm:h-6 rounded-full border-2 border-ink overflow-hidden relative">
          <div
            className="bg-purple-500 h-full transition-all duration-500"
            style={{ width: `${Math.min(currentMoonPct, 100)}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-1 bg-red-500 z-10"
            style={{ left: `${maxMoonPct}%` }}
            title={`Max Cap: ${maxMoonPct}%`}
          />
        </div>

        <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center text-xs mt-2 text-slate-600 font-medium gap-1">
          <span>Current Moon Basis: <strong>${vault.moonCostBasisUsdc.toFixed(2)}</strong> ({currentMoonPct.toFixed(1)}%)</span>
          <span className="text-amber-700 font-bold">Max Allowed: {maxMoonPct}% (${(vault.totalDepositedUsdc * (maxMoonPct / 100)).toFixed(2)})</span>
        </div>
      </div>

      {/* Grid of Two Columns: Pending Kid Requests & Automated Keeper Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left: Kid Requests / Roundups */}
        <div className="bg-white p-4 sm:p-6 rounded-3xl border-3 border-ink shadow-sticker space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold font-display text-ink flex items-center gap-2">
              🪙 Spare Change Roundups
            </h2>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-900 px-2 sm:px-2.5 py-0.5 rounded-full border border-emerald-300 shrink-0">
              Active • 1x
            </span>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl border-2 border-ink bg-amber-50/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Accumulated This Week:</span>
              <span className="font-numbers font-black text-ink text-base">${accumulatedThisWeek.toFixed(2)} USDC</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Auto-Split to Save Jar (80%):</span>
              <span className="font-bold text-emerald-700">+${saveRoundupSplit} USDC</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Auto-Split to Moon Jar (20%):</span>
              <span className="font-bold text-purple-700">+${moonRoundupSplit} USDC</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Every transaction rounds up micro-cents into {vault.metadata.nickname}'s dual vault without requiring manual transfers.
          </p>

          <div className="pt-1">
            <Link href="/guardian/roundups">
              <Button variant="secondary" size="sm" className="w-full flex items-center justify-center gap-1.5 text-xs py-2">
                <Coins className="w-4 h-4 text-amber-600" />
                Configure Roundups & Auto-Inflows →
              </Button>
            </Link>
          </div>
        </div>

        {/* Right: Automated Keeper Feed */}
        <div className="bg-white p-4 sm:p-6 rounded-3xl border-3 border-ink shadow-sticker space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold font-display text-ink flex items-center gap-2">
                🤖 Autonomous Keeper
              </h2>
              <p className="text-xs text-slate-500">Evaluates valuations & executes buys safely</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleRunKeeper(false)}
                disabled={isKeeperRunning}
                className="shrink-0 text-xs px-2.5 sm:px-3"
              >
                {isKeeperRunning ? 'Evaluating...' : 'Run Check'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleRunKeeper(true)}
                disabled={isKeeperRunning}
                title={`Execute Jupiter buy on ${getNetworkLabel()} bypassing premium check`}
                className="shrink-0 text-xs px-2.5 sm:px-3 bg-purple-700 hover:bg-purple-800 text-white"
              >
                <Zap className="w-3.5 h-3.5 mr-1" />
                Force Buy
              </Button>
            </div>
          </div>

          {(() => {
            const validDecisions = (vault.decisions || []).filter(
              (d) => d.vaultAddress === vault.metadata.vaultAddress && !d.id.startsWith('dec-10')
            );
            if (validDecisions.length === 0) {
              return (
                <div className="p-4 sm:p-5 rounded-2xl border-2 border-dashed border-slate-300 text-center text-slate-500 py-6">
                  <div className="text-2xl mb-1">🤖</div>
                  <p className="text-xs font-bold text-ink">No Keeper Decisions Recorded Yet</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {vault.saveBalanceUsdc > 0
                      ? 'Click "Run Check" above to evaluate current PreStocks valuations.'
                      : 'Deposit USDC into the Save Jar to enable automated PreStock evaluations.'}
                  </p>
                </div>
              );
            }
            return (
              <div className="space-y-3">
                {validDecisions.slice(0, 3).map((dec) => (
                  <DecisionLogItem key={dec.id} decision={dec} audience="guardian" />
                ))}
              </div>
            );
          })()}

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
            Funds deposited go straight into {vault.metadata.nickname}'s <strong>Save Jar</strong> on-chain ({getNetworkLabel()}). The autonomous keeper will gradually buy into the Moon Jar over time according to your allocation and maximum cap.
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

      {/* Full Wallet Transfer Modal */}
      <WalletTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={() => syncOnChain(vault?.metadata?.vaultAddress)}
      />
    </div>
  );
}
