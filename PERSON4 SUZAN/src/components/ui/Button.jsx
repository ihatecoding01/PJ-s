import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  isLoading = false,
  disabled = false,
  icon: Icon,
  className = '',
  ...props
}) {
  const isSpinning = loading || isLoading;
  const baseClasses = 'inline-flex items-center justify-center font-heading font-medium transition-all duration-150 rounded-[10px] select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  const variantClasses = {
    // Primary CTA: Coral background, ink text, bold 2px ink border, hard offset shadow
    primary: 'bg-coral text-ink font-semibold border-2 border-ink shadow-brutal hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_#111713] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_#111713]',
    secondary: 'bg-sage text-forest border border-gray hover:bg-sage-light hover:border-forest/20 active:bg-sage',
    forest: 'bg-forest text-ivory border-2 border-forest hover:bg-forest/90 active:bg-forest shadow-sm',
    ghost: 'bg-transparent text-forest hover:bg-sage/60 active:bg-sage',
    outline: 'bg-white text-ink border-2 border-ink shadow-brutal-sm hover:bg-ivory active:translate-x-[1px] active:translate-y-[1px]',
    danger: 'bg-coral/20 text-ink border border-coral/50 hover:bg-coral/30 active:bg-coral/40',
  };

  return (
    <button
      disabled={disabled || isSpinning}
      className={`${baseClasses} ${sizeClasses[size] || sizeClasses.md} ${variantClasses[variant] || variantClasses.primary} ${className}`}
      {...props}
    >
      {isSpinning ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : Icon ? (
        <Icon className="w-4 h-4 flex-shrink-0" />
      ) : null}
      {children}
    </button>
  );
}
