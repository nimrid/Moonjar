'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface JarCardProps {
  type: 'save' | 'moon';
  title?: string;
  subtitle?: string;
  balanceUsd?: number;
  balanceUsdc?: number;
  goalUsd?: number;
  totalGoalUsdc?: number;
  tokensCount?: number;
  percentageOfPortfolio?: number;
  capPercentage?: number;
  costBasisUsdc?: number;
  status?: string;
  isPaused?: boolean;
  onClick?: () => void;
  className?: string;
}

export const JarCard: React.FC<JarCardProps> = ({
  type,
  title,
  subtitle,
  balanceUsd,
  balanceUsdc,
  goalUsd,
  totalGoalUsdc,
  tokensCount,
  percentageOfPortfolio,
  capPercentage,
  costBasisUsdc,
  status,
  isPaused,
  onClick,
  className = '',
}) => {
  const isSave = type === 'save';
  const effectiveBalance = balanceUsdc !== undefined ? balanceUsdc : (balanceUsd !== undefined ? balanceUsd : 0);
  const effectiveGoal = totalGoalUsdc !== undefined ? totalGoalUsdc : (goalUsd !== undefined ? goalUsd : 100);
  const effectiveTitle = title || (isSave ? 'The Save Jar' : 'The Moon Jar');
  const effectiveSubtitle = subtitle || (status ? status : (isSave ? 'Rock-solid USDC' : 'Frontier PreStocks'));
  const fillPct = Math.min(Math.max((effectiveBalance / effectiveGoal) * 100, 15), 90);
  const liquidY = 160 - (fillPct / 100) * 110; // SVG coordinates from 50 to 160

  return (
    <div
      onClick={onClick}
      className={`relative p-5 rounded-3xl border-3 border-ink bg-white shadow-sticker transition-transform hover:-translate-y-1 hover:shadow-sticker-lg cursor-pointer select-none flex flex-col items-center ${className}`}
    >
      {/* Badge Top */}
      <div
        className={`px-3 py-1 rounded-full text-xs font-bold border-2 border-ink mb-3 ${
          isSave ? 'bg-sun text-ink' : 'bg-grape text-white'
        }`}
      >
        {status ? status : (isSave ? '🛡️ Safe & Growing' : '🚀 Space Adventures')}
      </div>

      {/* Jar Graphic */}
      <div className="relative w-44 h-48 my-2">
        <svg viewBox="0 0 160 180" className="w-full h-full drop-shadow-sm">
          {/* Defs for liquid gradients & patterns */}
          <defs>
            <linearGradient id={isSave ? 'goldGrad' : 'moonGrad'} x1="0" y1="0" x2="0" y2="1">
              {isSave ? (
                <>
                  <stop offset="0%" stopColor="#FDE047" />
                  <stop offset="100%" stopColor="#EAB308" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#C084FC" />
                  <stop offset="100%" stopColor="#6D28D9" />
                </>
              )}
            </linearGradient>

            <clipPath id={`jarClip-${type}`}>
              {/* Inside jar shape */}
              <path d="M35 48 C35 42 45 40 80 40 C115 40 125 42 125 48 L125 150 C125 162 115 168 80 168 C45 168 35 162 35 150 Z" />
            </clipPath>
          </defs>

          {/* Jar Base Outline behind liquid */}
          <path
            d="M32 46 C32 40 42 38 80 38 C118 38 128 40 128 46 L128 152 C128 165 116 172 80 172 C44 172 32 165 32 152 Z"
            fill="#F8FAFC"
            stroke="#1F1B2E"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Liquid Clip Area */}
          <g clipPath={`url(#jarClip-${type})`}>
            {/* Liquid Fill */}
            <motion.rect
              initial={{ y: 170, height: 0 }}
              animate={{ y: liquidY, height: 170 - liquidY }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              x="25"
              width="110"
              fill={`url(#${isSave ? 'goldGrad' : 'moonGrad'})`}
            />

            {/* Surface wave */}
            <path
              d={`M30 ${liquidY} Q55 ${liquidY - 4}, 80 ${liquidY} T130 ${liquidY} L130 175 L30 175 Z`}
              fill={isSave ? '#FEF08A' : '#DDD6FE'}
              opacity="0.4"
            />

            {/* Sparkles / Coins floating inside */}
            {isSave ? (
              <g>
                <circle cx="65" cy="140" r="10" fill="#FACC15" stroke="#CA8A04" strokeWidth="2" />
                <text x="65" y="144" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#713F12">$</text>
                <circle cx="95" cy="125" r="8" fill="#FACC15" stroke="#CA8A04" strokeWidth="1.5" />
                <text x="95" y="128" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#713F12">$</text>
                <circle cx="75" cy="100" r="6" fill="#FEF08A" opacity="0.8" />
              </g>
            ) : (
              <g>
                {/* Little stars and planets in moon jar */}
                <path d="M60 135 L62 130 L67 132 L63 136 L65 141 L60 138 L55 141 L57 136 L53 132 L58 130 Z" fill="#FDE047" />
                <circle cx="100" cy="120" r="7" fill="#F472B6" opacity="0.8" />
                <ellipse cx="100" cy="120" rx="10" ry="2" stroke="#FDE047" strokeWidth="1" fill="none" transform="rotate(-20 100 120)" />
                <circle cx="75" cy="95" r="4" fill="#FFFFFF" opacity="0.7" />
              </g>
            )}
          </g>

          {/* Jar Lid / Cork */}
          <rect x="52" y="18" width="56" height="12" rx="4" fill="#D97706" stroke="#1F1B2E" strokeWidth="3" />
          <path d="M46 30 L114 30 L110 38 L50 38 Z" fill="#B45309" stroke="#1F1B2E" strokeWidth="3" />

          {/* Glass Highlight */}
          <path
            d="M40 55 C40 55 42 140 46 150"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.8"
          />
        </svg>
      </div>

      {/* Jar Text & Numbers */}
      <h3 className="font-display font-bold text-xl text-ink mt-1">{effectiveTitle}</h3>
      <p className="text-xs text-slate-500 font-medium">{effectiveSubtitle}</p>

      <div className="mt-3 text-center">
        <span className="text-3xl font-extrabold text-ink font-numbers tracking-tight">
          ${effectiveBalance.toFixed(2)}
        </span>
        {percentageOfPortfolio !== undefined && (
          <p className="text-xs text-slate-500 font-bold mt-0.5">
            {percentageOfPortfolio}% of your jars
          </p>
        )}
        {tokensCount !== undefined && (
          <p className="text-xs text-purple-700 font-bold mt-0.5">
            {tokensCount} {tokensCount === 1 ? 'part of a company' : 'company parts'}
          </p>
        )}
      </div>

      {/* Progress towards goal */}
      <div className="w-full mt-4 bg-slate-100 rounded-full h-3 border-2 border-ink overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${isSave ? 'bg-sun' : 'bg-grape'}`}
          style={{ width: `${Math.min((effectiveBalance / effectiveGoal) * 100, 100)}%` }}
        />
      </div>
      <span className="text-[11px] text-slate-500 mt-1 font-semibold">
        ${effectiveBalance.toFixed(0)} of ${effectiveGoal} goal
      </span>
    </div>
  );
};
