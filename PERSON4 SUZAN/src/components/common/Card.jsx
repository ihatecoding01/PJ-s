import React from 'react';

export default function Card({
  children,
  className = '',
  hoverEffect = false,
  glow = false,
  ...props
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-800/80 bg-surface-900/80 backdrop-blur-md p-6 shadow-card-dark transition-all duration-300 ${
        hoverEffect ? 'hover:border-slate-700 hover:bg-surface-850 hover:shadow-2xl' : ''
      } ${
        glow ? 'border-teal-500/30 shadow-glow-teal' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
