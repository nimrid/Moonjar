'use client';

import React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { BuyDecisionLog } from '@moonjar/shared';

interface DecisionLogItemProps {
  decision: BuyDecisionLog;
  audience?: 'kid' | 'guardian';
}

export const DecisionLogItem: React.FC<DecisionLogItemProps> = ({
  decision,
  audience = 'guardian',
}) => {
  const isExecuted = decision.action === 'BUY';
  const reasonText =
    audience === 'kid' ? decision.humanReasonKid : decision.humanReasonGuardian;

  return (
    <div className="p-4 rounded-2xl border-3 border-ink bg-white shadow-sticker-sm flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isExecuted ? (
            <span className="flex items-center gap-1 bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full border border-green-600">
              <CheckCircle className="w-3.5 h-3.5" /> BOUGHT {decision.symbol}
            </span>
          ) : (
            <span className="flex items-center gap-1 bg-amber-100 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-600">
              <XCircle className="w-3.5 h-3.5" /> SKIPPED {decision.symbol}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500 font-mono">
          {new Date(decision.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Human Readable Explanation */}
      <p className="text-sm font-medium text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
        💬 "{reasonText}"
      </p>

      {/* Financial Details */}
      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
        <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
          <span className="text-slate-500 block">Amount</span>
          <span className="font-numbers font-bold text-ink">
            {decision.amountInUsdc !== undefined
              ? `$${(decision.amountInUsdc / 1_000_000).toFixed(2)} USDC`
              : 'N/A'}
          </span>
        </div>
        <div className="bg-purple-50 p-2 rounded-lg border border-purple-200">
          <span className="text-slate-500 block">Premium</span>
          <span className="font-numbers font-bold text-purple-900">
            {decision.premiumPct >= 0 ? `+${decision.premiumPct.toFixed(1)}%` : `${decision.premiumPct.toFixed(1)}%`}
          </span>
        </div>
      </div>

      {/* Machine Details / Code explanation */}
      {audience === 'guardian' && (
        <div className="text-[11px] font-mono text-slate-500 bg-gray-50 p-2 rounded border border-gray-200">
          Reason: <span className="font-semibold text-ink">{decision.machineReason}</span>
          {decision.txSignature && (
            <div className="truncate mt-0.5 text-blue-600">
              Tx: {decision.txSignature}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
