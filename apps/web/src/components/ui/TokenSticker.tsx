'use client';

import React from 'react';
import { PriceCheckTag } from '@moonjar/shared';
import { PriceTagPill } from './PriceTagPill';

interface TokenStickerProps {
  symbol: string;
  name: string;
  shares?: number;
  valueUsd?: number;
  allocationBps?: number;
  category?: PriceCheckTag;
  emoji?: string;
  onClick?: () => void;
  selected?: boolean;
}

const COMPANY_EMOJIS: Record<string, string> = {
  SPACEX: '🚀',
  OPENAI: '🤖',
  ANTHROPIC: '🧠',
  FIGUREAI: '🦾',
  ANDURIL: '🛡️',
  KALSHI: '📈',
  POLYMARKET: '🔮',
  NEURALINK: '⚡',
};

export const TokenSticker: React.FC<TokenStickerProps> = ({
  symbol,
  name,
  shares,
  valueUsd,
  allocationBps,
  category,
  emoji,
  onClick,
  selected = false,
}) => {
  const displayEmoji = emoji || COMPANY_EMOJIS[symbol.toUpperCase()] || '⭐';

  return (
    <div
      onClick={onClick}
      className={`relative p-4 rounded-2xl border-3 border-ink bg-white transition-all cursor-pointer select-none ${
        selected ? 'ring-4 ring-grape -translate-y-1 shadow-sticker-lg' : 'shadow-sticker hover:-translate-y-1 hover:shadow-sticker-lg'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-100 border-2 border-ink flex items-center justify-center text-2xl shadow-sticker-sm">
            {displayEmoji}
          </div>
          <div>
            <h4 className="font-display font-bold text-base text-ink leading-tight">{name}</h4>
            <span className="text-xs font-numbers text-slate-500 font-semibold">{symbol}</span>
          </div>
        </div>
        {category && <PriceTagPill category={category} />}
      </div>

      {(shares !== undefined || valueUsd !== undefined || allocationBps !== undefined) && (
        <div className="mt-3 pt-3 border-t-2 border-dashed border-slate-200 flex justify-between items-center text-xs">
          {allocationBps !== undefined && (
            <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
              {allocationBps / 100}% of Moon Jar
            </span>
          )}
          {shares != null && (
            <span className="font-numbers text-slate-600">
              {Number(shares).toFixed(2)} parts
            </span>
          )}
          {valueUsd != null && (
            <span className="font-numbers font-bold text-emerald-700 text-sm">
              ${Number(valueUsd).toFixed(2)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
