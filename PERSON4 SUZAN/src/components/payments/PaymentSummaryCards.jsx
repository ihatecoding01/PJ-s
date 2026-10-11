import React from 'react';
import Card from '../ui/Card.jsx';
import AmountDisplay from '../ui/AmountDisplay.jsx';
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
      <div className="flex items-center justify-between pb-3 border-b border-gray flex-wrap gap-2">
        <h4 className="text-base font-heading font-bold text-ink flex items-center gap-2">
          <Coins className="w-4 h-4 text-forest" />
          Escrow Fund Balances & Settlement Tracking
        </h4>
        <span className="text-xs font-mono text-ink/60">
          Protocol Fees Paid: <strong className="text-forest">{feesPaid.toFixed(4)} MATIC</strong>
        </span>
      </div>

      {/* Visual Stacked Progress Bar */}
      <div className="space-y-2">
        <div className="w-full h-4 rounded-full bg-gray overflow-hidden flex border border-gray">
          {released > 0 && (
            <div
              className="bg-forest h-full transition-all duration-300"
              style={{ width: `${releasedPct}%` }}
              title={`Released: ${released} MATIC (${releasedPct}%)`}
            />
          )}
          {locked > 0 && (
            <div
              className="bg-sage-light h-full transition-all duration-300"
              style={{ width: `${lockedPct}%` }}
              title={`Locked: ${locked} MATIC (${lockedPct}%)`}
            />
          )}
          {disputed > 0 && (
            <div
              className="bg-coral h-full transition-all duration-300"
              style={{ width: `${disputedPct}%` }}
              title={`Disputed: ${disputed} MATIC (${disputedPct}%)`}
            />
          )}
          {refunded > 0 && (
            <div
              className="bg-gray h-full transition-all duration-300"
              style={{ width: `${refundedPct}%` }}
              title={`Refunded: ${refunded} MATIC (${refundedPct}%)`}
            />
          )}
        </div>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-card bg-sage/40 border border-gray">
          <div className="flex items-center gap-1.5 text-xs text-ink/70 mb-1">
            <Lock className="w-3.5 h-3.5 text-forest" />
            <span className="font-heading font-semibold">Locked in Escrow</span>
          </div>
          <div className="mt-1">
            <AmountDisplay amount={locked} size="sm" />
          </div>
        </div>

        <div className="p-3.5 rounded-card bg-sage/40 border border-gray">
          <div className="flex items-center gap-1.5 text-xs text-ink/70 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-forest" />
            <span className="font-heading font-semibold">Released Payouts</span>
          </div>
          <div className="mt-1">
            <AmountDisplay amount={released} size="sm" />
          </div>
        </div>

        <div className="p-3.5 rounded-card bg-coral/20 border border-coral/40">
          <div className="flex items-center gap-1.5 text-xs text-coral-900 mb-1">
            <AlertOctagon className="w-3.5 h-3.5 text-coral" />
            <span className="font-heading font-semibold">Disputed Funds</span>
          </div>
          <div className="mt-1">
            <AmountDisplay amount={disputed} size="sm" />
          </div>
        </div>

        <div className="p-3.5 rounded-card bg-gray border border-gray">
          <div className="flex items-center gap-1.5 text-xs text-ink/70 mb-1">
            <RotateCcw className="w-3.5 h-3.5 text-ink/60" />
            <span className="font-heading font-semibold">Refunded Capital</span>
          </div>
          <div className="mt-1">
            <AmountDisplay amount={refunded} size="sm" />
          </div>
        </div>
      </div>
    </Card>
  );
}
