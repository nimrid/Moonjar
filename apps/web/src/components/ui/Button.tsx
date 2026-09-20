'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'neutral' | 'sun' | 'grape' | 'leaf' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-display font-bold rounded-2xl border-3 border-ink transition-all duration-150 select-none focus:outline-none focus:ring-4 focus:ring-amber-300 disabled:opacity-50 disabled:pointer-events-none active:translate-x-[2px] active:translate-y-[2px]';

  const variants = {
    primary: 'bg-sun text-ink hover:bg-amber-300 shadow-sticker active:shadow-sticker-pressed',
    secondary: 'bg-white text-ink hover:bg-slate-100 shadow-sticker active:shadow-sticker-pressed',
    neutral: 'bg-white text-ink hover:bg-slate-100 shadow-sticker active:shadow-sticker-pressed',
    sun: 'bg-sun text-ink hover:bg-amber-300 shadow-sticker active:shadow-sticker-pressed',
    grape: 'bg-grape text-white hover:bg-purple-600 shadow-sticker active:shadow-sticker-pressed',
    leaf: 'bg-leaf text-white hover:bg-emerald-600 shadow-sticker active:shadow-sticker-pressed',
    danger: 'bg-rose text-white hover:bg-rose-600 shadow-sticker active:shadow-sticker-pressed',
  };

  const sizes = {
    sm: 'text-sm px-3 py-1.5 min-h-[36px]',
    md: 'text-base px-5 py-2.5 min-h-[44px]',
    lg: 'text-lg px-7 py-3.5 min-h-[52px]',
  };

  return (
    <button
      className={twMerge(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
