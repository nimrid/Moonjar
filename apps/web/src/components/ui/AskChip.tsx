'use client';

import React from 'react';

interface AskChipProps {
  label: string;
  emoji: string;
  subtext?: string;
  onClick: () => void;
  selected?: boolean;
}

export const AskChip: React.FC<AskChipProps> = ({
  label,
  emoji,
  subtext,
  onClick,
  selected = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 p-3 text-left w-full rounded-2xl border-3 border-ink transition-all ${
        selected
          ? 'bg-amber-100 shadow-sticker-pressed translate-x-0.5 translate-y-0.5'
          : 'bg-white shadow-sticker hover:-translate-y-0.5 hover:shadow-sticker-lg'
      }`}
    >
      <span className="text-2xl p-2 rounded-xl bg-slate-50 border-2 border-ink">{emoji}</span>
      <div className="flex-1">
        <p className="font-display font-bold text-sm text-ink">{label}</p>
        {subtext && <p className="text-xs text-slate-500 font-medium">{subtext}</p>}
      </div>
    </button>
  );
};
