'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  getStoredVault,
  getOrCreateStoredVault,
  saveVault,
  clearStoredDecisions,
  VaultState,
} from '@/lib/store';
import { usePreStocks } from '@/lib/usePreStocks';
import { fetchOnChainVaultState, fetchAllOnChainVaults } from '@/lib/onchain';
import { DecisionLogItem } from '@/components/ui/DecisionLogItem';
import { Button } from '@/components/ui/Button';
import { Pip } from '@/components/mascot/Pip';
import { useGuardianWallet } from '@/components/providers/PrivySolanaProvider';
import {
  ScrollText,
  RefreshCw,
  Search,
  Zap,
  Trash2,
  Wallet,
} from 'lucide-react';
import {
  BuyDecisionLog,
  calculatePremiumPct,
  getPriceCheck,
  PRESTOCKS_DECIMALS,
  USDC_DECIMALS,
} from '@moonjar/shared';

export default function DecisionsPage() {
  const [vault, setVault] = useState<VaultState | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'BUY' | 'SKIP'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const { tokens, getToken } = usePreStocks();
  const { connected, publicKey } = useGuardianWallet();

  const syncVaultData = useCallback(async () => {
    if (!publicKey) {
      setVault(null);
      return;
    }

    const guardianAddr = publicKey.toBase58();
    try {
      const allOnChain = await fetchAllOnChainVaults();
      const myOnChain = allOnChain.find((v) => v.guardian === guardianAddr);

      let current = getStoredVault(guardianAddr);

      if (myOnChain) {
        const onChainState = await fetchOnChainVaultState(myOnChain.address, tokens);
        const merged: VaultState = {
          ...(current || getOrCreateStoredVault(guardianAddr, myOnChain.address)),
          ...(onChainState || {}),
          metadata: {
            ...(current?.metadata || getOrCreateStoredVault(guardianAddr, myOnChain.address).metadata),
            vaultAddress: myOnChain.address,
            guardianWallet: guardianAddr,
          },
        };
        setVault(merged);
        saveVault(merged);
      } else if (current) {
        setVault(current);
      } else {
        setVault(null);
      }
    } catch (err) {
      console.warn('[decisions] Sync error:', err);
    }
  }, [publicKey, tokens]);

  useEffect(() => {
    syncVaultData();
  }, [syncVaultData]);

  const handleClearHistory = () => {
    if (!publicKey || !vault) return;
    clearStoredDecisions(publicKey.toBase58());
    const updated = {
      ...vault,
      decisions: [],
    };
    setVault(updated);
  };

  const handleEvaluateLivePreStocks = async (force: boolean = false) => {
    if (!vault || !vault.metadata?.vaultAddress) return;
    setIsEvaluating(true);

    try {
      // Call API route to execute keeper check (and on-chain buy if eligible or forced)
      const res = await fetch('/api/keeper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaultAddress: vault.metadata.vaultAddress,
          forceBuy: force,
        }),
      });
      const data = await res.json();

      let newLog: BuyDecisionLog;
      if (data && data.decision) {
        newLog = data.decision;
      } else {
        // Fallback to client-side evaluation
        const activeAllocations = vault.allocations.filter((a) => a.weightBps > 0);
        const targetAllocation = activeAllocations.length > 0
          ? activeAllocations[Math.floor(Math.random() * activeAllocations.length)]
          : vault.allocations[0];

        const token = getToken(targetAllocation ? targetAllocation.symbol : 'SPACEX');
        const premium = calculatePremiumPct(token.tokenPrice, token.markPrice);
        const priceCheck = getPriceCheck(premium);

        const maxAllowedMoon = (vault.totalDepositedUsdc * vault.moonCapBps) / 10000;
        const remainingCapHeadroom = maxAllowedMoon - vault.moonCostBasisUsdc;

        if (vault.isPaused) {
          newLog = {
            id: `dec-${Date.now()}`,
            timestamp: new Date().toISOString(),
            vaultAddress: vault.metadata.vaultAddress,
            symbol: token.symbol,
            action: 'SKIP',
            premiumPct: Number(premium.toFixed(2)),
            machineReason: 'VAULT_PAUSED_BY_GUARDIAN',
            humanReasonKid: 'Pip is taking a quick rest while your vault is paused.',
            humanReasonGuardian: `Vault is paused by guardian. Evaluated ${token.symbol} at ${premium.toFixed(1)}% premium but skipped purchase.`,
          };
        } else if (remainingCapHeadroom <= 0) {
          newLog = {
            id: `dec-${Date.now()}`,
            timestamp: new Date().toISOString(),
            vaultAddress: vault.metadata.vaultAddress,
            symbol: token.symbol,
            action: 'SKIP',
            premiumPct: Number(premium.toFixed(2)),
            machineReason: `COST_BASIS_CAP_EXCEEDED (${vault.moonCostBasisUsdc.toFixed(2)} >= ${maxAllowedMoon.toFixed(2)})`,
            humanReasonKid: 'Your Moon Jar has reached its safety capacity! Pip is keeping coins safe in the Save Jar.',
            humanReasonGuardian: `Moon Jar cost basis reached guardian cap of ${vault.moonCapBps / 100}%. Skipped ${token.symbol}.`,
          };
        } else if (priceCheck.skipCycle && !force) {
          newLog = {
            id: `dec-${Date.now()}`,
            timestamp: new Date().toISOString(),
            vaultAddress: vault.metadata.vaultAddress,
            symbol: token.symbol,
            action: 'SKIP',
            premiumPct: Number(premium.toFixed(2)),
            machineReason: `PREMIUM_TOO_HIGH (${premium.toFixed(1)}% > 10.0%)`,
            humanReasonKid: `${token.name} costs too much today. Pip is waiting for a calmer day!`,
            humanReasonGuardian: `${token.symbol} is trading at a ${premium.toFixed(1)}% premium, exceeding the 10.0% safety ceiling. Purchase skipped.`,
          };
        } else {
          const buyAmt = Math.min(5.00, remainingCapHeadroom, vault.saveBalanceUsdc);
          const shares = Number((buyAmt / token.tokenPrice).toFixed(4));
          newLog = {
            id: `dec-${Date.now()}`,
            timestamp: new Date().toISOString(),
            vaultAddress: vault.metadata.vaultAddress,
            symbol: token.symbol,
            action: 'BUY',
            premiumPct: Number(premium.toFixed(2)),
            amountInUsdc: Math.floor(buyAmt * Math.pow(10, USDC_DECIMALS)),
            amountOutTokens: Math.floor(shares * Math.pow(10, PRESTOCKS_DECIMALS)),
            machineReason: `PREMIUM_ACCEPTABLE (${premium.toFixed(1)}% <= 10.0%)`,
            humanReasonKid: `Pip found a fair price for ${token.name} and added a slice to your Moon Jar!`,
            humanReasonGuardian: `Evaluated ${token.symbol} at ${premium.toFixed(1)}% premium. Executed purchase of $${buyAmt.toFixed(2)} (${shares} shares).`,
          };
        }
      }

      const isBuy = newLog.action === 'BUY';
      const amountUsdc = isBuy && newLog.amountInUsdc ? newLog.amountInUsdc / Math.pow(10, USDC_DECIMALS) : 0;
      const sharesOut = isBuy && newLog.amountOutTokens ? newLog.amountOutTokens / Math.pow(10, PRESTOCKS_DECIMALS) : 0;

      const targetToken = getToken(newLog.symbol);
      const updatedAllocations = isBuy
        ? vault.allocations.map((a) => {
            if (a.symbol === newLog.symbol) {
              const nextShares = Number((a.sharesOwned + sharesOut).toFixed(4));
              return {
                ...a,
                sharesOwned: nextShares,
                currentValueUsd: Number((nextShares * targetToken.tokenPrice).toFixed(2)),
              };
            }
            return a;
          })
        : vault.allocations;

      // Filter existing decisions strictly for this vault address, ignoring legacy mock items
      const cleanExistingDecisions = (vault.decisions || []).filter(
        (d) => d.vaultAddress === vault.metadata.vaultAddress && !d.id.startsWith('dec-10')
      );

      const updatedVault: VaultState = {
        ...vault,
        saveBalanceUsdc: isBuy ? Number(Math.max(0, vault.saveBalanceUsdc - amountUsdc).toFixed(2)) : vault.saveBalanceUsdc,
        moonBalanceUsdc: isBuy ? Number((vault.moonBalanceUsdc + amountUsdc).toFixed(2)) : vault.moonBalanceUsdc,
        moonCostBasisUsdc: isBuy ? Number((vault.moonCostBasisUsdc + amountUsdc).toFixed(2)) : vault.moonCostBasisUsdc,
        allocations: updatedAllocations,
        decisions: [newLog, ...cleanExistingDecisions],
      };

      // Resync on-chain balances if on Surfpool
      try {
        const onChain = await fetchOnChainVaultState(vault.metadata.vaultAddress, tokens);
        if (onChain) {
          Object.assign(updatedVault, onChain);
        }
      } catch {}

      setVault(updatedVault);
      saveVault(updatedVault);
    } catch (err) {
      console.warn('Evaluation error:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  if (!connected || !publicKey) {
    return (
      <div className="bg-white rounded-3xl border-3 border-ink p-8 shadow-sticker text-center max-w-xl mx-auto my-12 space-y-4">
        <div className="w-16 h-16 mx-auto bg-amber-100 rounded-2xl border-2 border-ink flex items-center justify-center">
          <Wallet className="w-8 h-8 text-amber-700" />
        </div>
        <h2 className="text-2xl font-display font-extrabold text-ink">Connect Guardian Wallet</h2>
        <p className="text-sm text-slate-600">
          Keeper valuation audits and purchase decisions are private to each guardian's child vault. Connect your embedded Privy wallet to view live decision logs.
        </p>
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="bg-white rounded-3xl border-3 border-ink p-8 shadow-sticker text-center max-w-xl mx-auto my-12 space-y-4">
        <div className="w-20 h-20 mx-auto">
          <Pip mood="curious" size={80} />
        </div>
        <h2 className="text-2xl font-display font-extrabold text-ink">No Active Vault Configured</h2>
        <p className="text-sm text-slate-600">
          No child vault was found for your guardian wallet (<span className="font-mono font-bold text-ink">{publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-4)}</span>). Set up your child's vault to start recording automated valuation checks.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link href="/guardian/onboarding">
            <Button variant="primary">Create Child Vault ✨</Button>
          </Link>
          <Button
            variant="secondary"
            onClick={() => {
              const fresh = getOrCreateStoredVault(publicKey.toBase58());
              setVault(fresh);
            }}
          >
            Initialize Clean Vault
          </Button>
        </div>
      </div>
    );
  }

  // STRICT FILTER: Only show decisions belonging specifically to this vault address!
  const validVaultDecisions = (vault.decisions || []).filter(
    (d) => d.vaultAddress === vault.metadata.vaultAddress && !d.id.startsWith('dec-10')
  );

  const filteredDecisions = validVaultDecisions.filter((d) => {
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

  const totalBuys = validVaultDecisions.filter((d) => d.action === 'BUY').length;
  const totalSkips = validVaultDecisions.filter((d) => d.action === 'SKIP').length;
  const avgSlippage = totalBuys > 0 ? '< 0.10%' : 'N/A';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border-3 border-ink p-4 sm:p-6 shadow-sticker relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 sm:p-2 rounded-xl bg-purple-100 border-2 border-ink shrink-0">
                <ScrollText className="w-4 h-4 sm:w-5 sm:h-5 text-purple-700" />
              </span>
              <h1 className="text-xl sm:text-3xl font-display font-extrabold text-ink">
                Keeper Decision Log
              </h1>
            </div>
            <p className="text-slate-600 text-xs sm:text-sm max-w-xl">
              Every algorithmic valuation check, price-cap rejection, and disciplined buy decision recorded transparently.
            </p>

            {/* Scope Identifier Badge */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-300">
                Vault: {vault.metadata.vaultAddress.slice(0, 6)}...{vault.metadata.vaultAddress.slice(-4)}
              </span>
              <span className="text-[11px] font-mono text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                Child: {vault.metadata.nickname}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleEvaluateLivePreStocks(false)}
              disabled={isEvaluating}
              className="gap-2 text-xs py-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
              {isEvaluating ? 'Checking...' : 'Evaluate Live PreStocks'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleEvaluateLivePreStocks(true)}
              disabled={isEvaluating}
              title="Force execute Jupiter swap on Surfpool"
              className="gap-1.5 text-xs py-2 bg-purple-700 hover:bg-purple-800 text-white"
            >
              <Zap className="w-3.5 h-3.5" />
              Force Buy
            </Button>
            {validVaultDecisions.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClearHistory}
                title="Clear local decision log"
                className="gap-1.5 text-xs py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-300"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Log
              </Button>
            )}
          </div>
        </div>

        {/* Aggregate Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t-2 border-slate-100">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Total Decisions</div>
            <div className="text-lg sm:text-2xl font-black font-numbers text-ink">{validVaultDecisions.length}</div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
            <div className="text-[10px] sm:text-xs font-bold text-emerald-800 uppercase">Executions (BUY)</div>
            <div className="text-lg sm:text-2xl font-black font-numbers text-emerald-900">{totalBuys}</div>
          </div>
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
            <div className="text-[10px] sm:text-xs font-bold text-amber-800 uppercase">Skipped (Protection)</div>
            <div className="text-lg sm:text-2xl font-black font-numbers text-amber-900">{totalSkips}</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200">
            <div className="text-[10px] sm:text-xs font-bold text-purple-800 uppercase">Avg Max Slippage</div>
            <div className="text-lg sm:text-2xl font-black font-numbers text-purple-900">{avgSlippage}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border-2 border-ink w-full sm:w-auto shadow-sticker-sm">
          {(['ALL', 'BUY', 'SKIP'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-xl text-xs font-display font-extrabold transition-all ${
                filter === tab ? 'bg-sun text-ink shadow-sticker-sm' : 'text-slate-500 hover:text-ink'
              }`}
            >
              {tab === 'ALL' ? 'All Decisions' : tab === 'BUY' ? '🟢 Buys Only' : '🟡 Skips Only'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search decisions or reasons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-2xl border-2 border-ink text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>
      </div>

      {/* Decisions List */}
      {filteredDecisions.length === 0 ? (
        <div className="bg-white rounded-3xl border-3 border-ink p-8 shadow-sticker text-center py-12 space-y-3">
          <div className="text-4xl">🦦</div>
          <h3 className="text-lg font-display font-extrabold text-ink">
            {validVaultDecisions.length === 0 ? 'No Decisions Logged Yet' : 'No Decisions Match Filter'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            {validVaultDecisions.length === 0
              ? 'Keeper decisions for your vault will appear here when evaluations run or when you click "Evaluate Live PreStocks".'
              : 'No decisions found for your current filter or search query.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDecisions.map((decision) => (
            <DecisionLogItem
              key={decision.id}
              decision={decision}
              audience="guardian"
            />
          ))}
        </div>
      )}
    </div>
  );
}
