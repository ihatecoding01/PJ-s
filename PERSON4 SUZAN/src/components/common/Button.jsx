import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  icon: Icon,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-950 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5 font-semibold'
  };

  const variants = {
    primary: 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-semibold shadow-lg shadow-teal-500/20 hover:shadow-teal-500/35 focus:ring-teal-400 active:scale-[0.98]',
    secondary: 'bg-surface-800 hover:bg-surface-750 text-slate-100 border border-slate-700/80 hover:border-slate-600 focus:ring-slate-500 active:scale-[0.98]',
    accent: 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-semibold shadow-lg shadow-indigo-500/25 focus:ring-indigo-400 active:scale-[0.98]',
    danger: 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 hover:border-rose-500/50 focus:ring-rose-400 active:scale-[0.98]',
    ghost: 'bg-transparent hover:bg-surface-800/60 text-slate-300 hover:text-white focus:ring-slate-600',
    outline: 'bg-transparent border border-teal-500/40 hover:border-teal-400 text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 focus:ring-teal-400'
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variants[variant] || variants.primary} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      {children}
    </button>
  );
}
