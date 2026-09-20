'use client';

import React from 'react';

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (val: number) => void;
  formatValue?: (val: number) => string;
  color?: 'sun' | 'grape' | 'leaf';
  helperText?: string;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  formatValue = (v) => `${v}%`,
  color = 'sun',
  helperText,
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  const colorStyles = {
    sun: 'accent-amber-500 bg-amber-200',
    grape: 'accent-purple-600 bg-purple-200',
    leaf: 'accent-emerald-600 bg-emerald-200',
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center">
        <label className="font-display font-bold text-sm text-ink">{label}</label>
        <span className="font-numbers font-bold text-base bg-white px-2.5 py-0.5 rounded-lg border-2 border-ink shadow-sticker-sm">
          {formatValue(value)}
        </span>
      </div>

      <div className="relative flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full h-3 rounded-lg appearance-none cursor-pointer border-2 border-ink ${colorStyles[color]} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink`}
        />
      </div>

      {helperText && <p className="text-xs text-slate-500 font-medium">{helperText}</p>}
    </div>
  );
};
