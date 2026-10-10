import React from 'react';
import Card from '../common/Card.jsx';
import { formatMatic } from '../../lib/formatters.js';
import { Lock, CheckCircle2, AlertOctagon, RotateCcw, Coins } from 'lucide-react';

export default function PaymentSummaryCards({ payments }) {
  if (!payments) return null;

  const locked = parseFloat(payments.locked) || 0;
  const released = parseFloat(payments.released) || 0;
  const disputed = parseFloat(payments.disputed) || 0;
  const refunded = parseFloat(payments.refunded) || 0;
  const feesPaid = parseFloat(payments.feesPaid) || 0;

  const total = locked + released + disputed + refunded;
  const safeTotal = total > 0 ? total : 1;

  const lockedPct = Math.round((locked / safeTotal) * 100);
  const releasedPct = Math.round((released / safeTotal) * 100);
  const disputedPct = Math.round((disputed / safeTotal) * 100);
  const refundedPct = Math.round((refunded / safeTotal) * 100);

  return (
    <Card className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
        <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Coins className="w-4 h-4 text-teal-400" />
          Escrow Fund Balances & Settlement Tracking
        </h4>
        <span className="text-xs font-mono text-slate-400">
          Protocol Fees Paid: <strong className="text-teal-300">{formatMatic(feesPaid)}</strong>
        </span>
      </div>

      {/* Visual Stacked Progress Bar */}
      <div className="space-y-2">
        <div className="w-full h-4 rounded-full bg-surface-800 overflow-hidden flex border border-slate-700">
          {released > 0 && (
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${releasedPct}%` }}
              title={`Released: ${released} MATIC (${releasedPct}%)`}
            />
          )}
          {locked > 0 && (
            <div
              className="bg-teal-500 h-full transition-all duration-500"
              style={{ width: `${lockedPct}%` }}
              title={`Locked: ${locked} MATIC (${lockedPct}%)`}
            />
          )}
          {disputed > 0 && (
            <div
              className="bg-rose-500 h-full transition-all duration-500"
              style={{ width: `${disputedPct}%` }}
              title={`Disputed: ${disputed} MATIC (${disputedPct}%)`}
            />
          )}
          {refunded > 0 && (
            <div
              className="bg-amber-500 h-full transition-all duration-500"
              style={{ width: `${refundedPct}%` }}
              title={`Refunded: ${refunded} MATIC (${refundedPct}%)`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono flex-wrap justify-between pt-1">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Released ({releasedPct}%)
          </span>
          <span className="flex items-center gap-1.5 text-teal-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-teal-500" /> Locked ({lockedPct}%)
          </span>
          <span className="flex items-center gap-1.5 text-rose-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Disputed ({disputedPct}%)
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Refunded ({refundedPct}%)
          </span>
        </div>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-surface-850 border border-teal-500/30">
          <div className="flex items-center justify-between text-xs text-teal-300">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Locked In Escrow</span>
            <Lock className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-bold font-mono text-slate-100 block mt-1">
            {formatMatic(locked)}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-850 border border-emerald-500/30">
          <div className="flex items-center justify-between text-xs text-emerald-300">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Released to Freelancer</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-bold font-mono text-slate-100 block mt-1">
            {formatMatic(released)}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-850 border border-rose-500/30">
          <div className="flex items-center justify-between text-xs text-rose-300">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Frozen in Dispute</span>
            <AlertOctagon className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-bold font-mono text-slate-100 block mt-1">
            {formatMatic(disputed)}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-850 border border-amber-500/30">
          <div className="flex items-center justify-between text-xs text-amber-300">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Refunded to Client</span>
            <RotateCcw className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-bold font-mono text-slate-100 block mt-1">
            {formatMatic(refunded)}
          </span>
        </div>
      </div>
    </Card>
  );
}
