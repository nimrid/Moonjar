'use client';

import React from 'react';

export type PipExpression = 'happy' | 'curious' | 'thinking' | 'calm-reassuring' | 'cheering';

interface PipProps {
  expression?: PipExpression;
  mood?: PipExpression;
  size?: number | string;
  className?: string;
  bubbleText?: string;
}

export const Pip: React.FC<PipProps> = ({
  expression,
  mood,
  size = 140,
  className = '',
  bubbleText,
}) => {
  const activeExpr = expression || mood || 'happy';
  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      {bubbleText && (
        <div className="mb-3 max-w-xs rounded-2xl border-3 border-ink bg-white px-4 py-2 text-sm font-bold text-ink shadow-sticker relative animate-bounce">
          <p>{bubbleText}</p>
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-ink" />
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-white" />
        </div>
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="select-none"
        aria-label={`Pip the Otter mascot: ${activeExpr}`}
        role="img"
      >
        {/* Shadow */}
        <ellipse cx="80" cy="148" rx="42" ry="7" fill="#E2E8F0" />

        {/* Space Suit Body */}
        <g id="suit">
          {/* Main Body / Suit */}
          <path
            d="M52 110 C52 95, 62 88, 80 88 C98 88, 108 95, 108 110 C108 130, 102 142, 80 142 C58 142, 52 130, 52 110 Z"
            fill="#FFFFFF"
            stroke="#1F1B2E"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Suit Collar ring */}
          <path
            d="M48 94 C48 88, 112 88, 112 94 C112 99, 48 99, 48 94 Z"
            fill="#8B5CF6"
            stroke="#1F1B2E"
            strokeWidth="3"
          />
          {/* Chest badge - Moon/Coin */}
          <circle cx="80" cy="116" r="10" fill="#FFD15C" stroke="#1F1B2E" strokeWidth="2.5" />
          <path d="M78 110 L82 116 L78 122" stroke="#1F1B2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* Tail */}
        <path
          d="M102 132 C115 136, 128 132, 134 122 C132 120, 124 121, 106 126"
          fill="#B45309"
          stroke="#1F1B2E"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Helmet Bubble */}
        <circle
          cx="80"
          cy="60"
          r="44"
          fill="#E0F2FE"
          fillOpacity="0.4"
          stroke="#1F1B2E"
          strokeWidth="3.5"
        />
        {/* Glass Glare */}
        <path
          d="M52 38 C60 28, 76 24, 88 24"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Otter Ears */}
        <circle cx="48" cy="40" r="10" fill="#92400E" stroke="#1F1B2E" strokeWidth="3" />
        <circle cx="48" cy="40" r="5" fill="#FDE68A" />
        <circle cx="112" cy="40" r="10" fill="#92400E" stroke="#1F1B2E" strokeWidth="3" />
        <circle cx="112" cy="40" r="5" fill="#FDE68A" />

        {/* Otter Head */}
        <ellipse cx="80" cy="62" rx="32" ry="29" fill="#B45309" stroke="#1F1B2E" strokeWidth="3" />

        {/* Snout */}
        <ellipse cx="80" cy="69" rx="17" ry="13" fill="#FEF3C7" stroke="#1F1B2E" strokeWidth="2.5" />
        <ellipse cx="80" cy="63" rx="5.5" ry="4" fill="#1F1B2E" />

        {/* Whiskers */}
        <line x1="60" y1="68" x2="48" y2="66" stroke="#1F1B2E" strokeWidth="2" strokeLinecap="round" />
        <line x1="60" y1="71" x2="47" y2="73" stroke="#1F1B2E" strokeWidth="2" strokeLinecap="round" />
        <line x1="100" y1="68" x2="112" y2="66" stroke="#1F1B2E" strokeWidth="2" strokeLinecap="round" />
        <line x1="100" y1="71" x2="113" y2="73" stroke="#1F1B2E" strokeWidth="2" strokeLinecap="round" />

        {/* Expressions */}
        {activeExpr === 'happy' && (
          <g id="exp-happy">
            {/* Happy Eyes */}
            <path d="M66 54 Q71 49 76 54" stroke="#1F1B2E" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M84 54 Q89 49 94 54" stroke="#1F1B2E" strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* Smile */}
            <path d="M74 72 Q80 78 86 72" stroke="#1F1B2E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Rosy Cheeks */}
            <circle cx="61" cy="66" r="4" fill="#F43F5E" opacity="0.6" />
            <circle cx="99" cy="66" r="4" fill="#F43F5E" opacity="0.6" />
            {/* Waving Paw */}
            <circle cx="42" cy="98" r="8" fill="#B45309" stroke="#1F1B2E" strokeWidth="2.5" />
            <circle cx="118" cy="106" r="8" fill="#B45309" stroke="#1F1B2E" strokeWidth="2.5" />
          </g>
        )}

        {activeExpr === 'curious' && (
          <g id="exp-curious">
            {/* Big Wide Eyes */}
            <circle cx="70" cy="52" r="5" fill="#1F1B2E" />
            <circle cx="68" cy="50" r="1.8" fill="#FFFFFF" />
            <circle cx="90" cy="52" r="6" fill="#1F1B2E" />
            <circle cx="88" cy="50" r="2.2" fill="#FFFFFF" />
            {/* O-mouth */}
            <ellipse cx="80" cy="73" rx="3.5" ry="4.5" fill="#1F1B2E" />
            {/* Tilted head pose paws */}
            <circle cx="46" cy="108" r="8" fill="#B45309" stroke="#1F1B2E" strokeWidth="2.5" />
            {/* Magnifying Glass */}
            <g transform="translate(108, 92) rotate(-20)">
              <circle cx="10" cy="10" r="11" fill="#E0F2FE" stroke="#1F1B2E" strokeWidth="3" />
              <line x1="3" y1="18" x2="-6" y2="28" stroke="#1F1B2E" strokeWidth="4" strokeLinecap="round" />
            </g>
          </g>
        )}

        {activeExpr === 'thinking' && (
          <g id="exp-thinking">
            {/* Looking up eyes */}
            <circle cx="70" cy="50" r="4.5" fill="#1F1B2E" />
            <circle cx="72" cy="48" r="1.5" fill="#FFFFFF" />
            <circle cx="90" cy="50" r="4.5" fill="#1F1B2E" />
            <circle cx="92" cy="48" r="1.5" fill="#FFFFFF" />
            {/* Thinking Mouth */}
            <path d="M75 73 Q80 71 85 73" stroke="#1F1B2E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Paw to chin */}
            <circle cx="48" cy="112" r="8" fill="#B45309" stroke="#1F1B2E" strokeWidth="2.5" />
            <circle cx="90" cy="78" r="7" fill="#B45309" stroke="#1F1B2E" strokeWidth="2.5" />
            {/* Little question thought bubble */}
            <path d="M125 35 Q130 25 136 28 Q140 32 135 36 Q132 40 132 43" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" fill="none" />
            <circle cx="132" cy="49" r="2" fill="#8B5CF6" />
          </g>
        )}

        {activeExpr === 'calm-reassuring' && (
          <g id="exp-calm">
            {/* Gentle curved closed eyes */}
            <path d="M65 53 Q70 56 75 53" stroke="#1F1B2E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M85 53 Q90 56 95 53" stroke="#1F1B2E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Gentle Smile */}
            <path d="M75 72 Q80 75 85 72" stroke="#1F1B2E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Paws gently placed holding a little green leaf/sprout */}
            <circle cx="72" cy="115" r="7" fill="#B45309" stroke="#1F1B2E" strokeWidth="2.5" />
            <circle cx="88" cy="115" r="7" fill="#B45309" stroke="#1F1B2E" strokeWidth="2.5" />
            <path d="M80 115 C80 105, 92 104, 94 98 C88 98, 80 102, 80 115 Z" fill="#10B981" stroke="#1F1B2E" strokeWidth="2" />
          </g>
        )}

        {activeExpr === 'cheering' && (
          <g id="exp-cheering">
            {/* Squeezing eyes with happiness */}
            <path d="M64 54 L70 48 L76 54" stroke="#1F1B2E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M84 54 L90 48 L96 54" stroke="#1F1B2E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {/* Big open smile */}
            <path d="M72 70 Q80 82 88 70 Z" fill="#F43F5E" stroke="#1F1B2E" strokeWidth="2.5" />
            {/* Paws up! */}
            <circle cx="36" cy="75" r="8" fill="#B45309" stroke="#1F1B2E" strokeWidth="2.5" />
            <circle cx="124" cy="75" r="8" fill="#B45309" stroke="#1F1B2E" strokeWidth="2.5" />
            {/* Sparkles / Confetti */}
            <path d="M28 45 L32 40 L36 45 L32 50 Z" fill="#FFD15C" />
            <path d="M128 42 L132 37 L136 42 L132 47 Z" fill="#8B5CF6" />
            <circle cx="32" cy="28" r="3" fill="#10B981" />
            <circle cx="126" cy="24" r="3" fill="#F43F5E" />
          </g>
        )}
      </svg>
    </div>
  );
};
