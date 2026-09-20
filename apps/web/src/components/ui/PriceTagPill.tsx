'use client';

import React from 'react';
import { PriceCheckTag } from '@moonjar/shared';

interface PriceTagPillProps {
  category: PriceCheckTag;
  className?: string;
}

export const PriceTagPill: React.FC<PriceTagPillProps> = ({ category, className = '' }) => {
  const configs: Record<PriceCheckTag, { label: string; bg: string; icon: string }> = {
    'On sale': {
      label: 'On sale! 🏷️',
      bg: 'bg-leaf-light border-leaf text-emerald-900',
      icon: '🎉',
    },
    'Fair price': {
      label: 'Fair price ✨',
      bg: 'bg-sky-light border-sky text-sky-950',
      icon: '👍',
    },
    'A little pricey': {
      label: 'A little pricey 🤔',
      bg: 'bg-sun-light border-sun-dark text-amber-950',
      icon: '⏳',
    },
    'Too pricey': {
      label: 'Too pricey right now ⏸️',
      bg: 'bg-slate-100 border-slate-cool text-slate-800',
      icon: '👀',
    },
  };

  const config = configs[category] || configs['Fair price'];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-display border-2 ${config.bg} shadow-sticker-sm ${className}`}
    >
      <span>{config.label}</span>
    </span>
  );
};
