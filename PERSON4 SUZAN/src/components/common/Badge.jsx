import React from 'react';

const STATUS_CONFIGS = {
  // Agreement statuses
  Draft: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30', dot: 'bg-indigo-400' },
  AwaitingFunding: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  Active: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  Completed: { bg: 'bg-teal-500/10', text: 'text-teal-300', border: 'border-teal-500/30', dot: 'bg-teal-300' },
  Cancelled: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-400' },
  Disputed: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/40', dot: 'bg-rose-400' },

  // Milestone statuses
  Pending: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/25', dot: 'bg-slate-400' },
  Submitted: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30', dot: 'bg-sky-400' },
  Approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  Rejected: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30', dot: 'bg-rose-400' },
  Paid: { bg: 'bg-teal-500/15', text: 'text-teal-300', border: 'border-teal-500/40', dot: 'bg-teal-300' },
  Refunded: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-400' },

  // Roles & General
  CLIENT: { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30', dot: 'bg-purple-400' },
  FREELANCER: { bg: 'bg-teal-500/15', text: 'text-teal-300', border: 'border-teal-500/30', dot: 'bg-teal-400' },
  ARBITRATOR: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  JOB: { bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/30', dot: 'bg-indigo-400' },
  SERVICE: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  ADVISORY: { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/30', dot: 'bg-cyan-400' }
};

export default function Badge({
  label,
  variant,
  showDot = true,
  size = 'md',
  className = ''
}) {
  const key = variant || label;
  const config = STATUS_CONFIGS[key] || {
    bg: 'bg-slate-800',
    text: 'text-slate-300',
    border: 'border-slate-700',
    dot: 'bg-slate-400'
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-medium'
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${config.bg} ${config.text} ${config.border} ${sizes[size] || sizes.md} ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />}
      {label}
    </span>
  );
}
