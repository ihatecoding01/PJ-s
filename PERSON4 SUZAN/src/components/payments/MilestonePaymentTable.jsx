import React from 'react';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import AmountDisplay from '../ui/AmountDisplay.jsx';
import { formatMatic } from '../../lib/formatters.js';
import { FileSpreadsheet } from 'lucide-react';

export default function MilestonePaymentTable({ milestones = [] }) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray">
        <h4 className="text-sm font-heading font-bold text-ink flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-forest" />
          Per-Milestone Payment & Fee Ledger
        </h4>
        <span className="text-xs text-ink/60 font-mono">
          {milestones.length} Milestone Records
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray text-ink/60 uppercase tracking-wider font-heading font-semibold text-[10px]">
              <th className="py-2.5 px-3">Milestone</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Escrow Amount</th>
              <th className="py-2.5 px-3 text-right">Net Released</th>
              <th className="py-2.5 px-3 text-right">Penalty Deducted</th>
              <th className="py-2.5 px-3 text-right">Protocol Fee (1%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray">
            {milestones.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-ink/50 italic">
                  No milestone payment data recorded yet.
                </td>
              </tr>
            ) : (
              milestones.map((m) => (
                <tr key={m.idx} className="hover:bg-sage/30 transition-colors">
                  <td className="py-3 px-3 font-heading font-medium text-ink">
                    Milestone #{m.idx + 1}
                  </td>
                  <td className="py-3 px-3">
                    <Badge status={m.status} size="sm">
                      {m.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-ink">
                    <AmountDisplay amount={m.amount} size="sm" />
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-forest">
                    <AmountDisplay amount={m.paid || 0} size="sm" />
                  </td>
                  <td className="py-3 px-3 text-right text-coral font-medium">
                    {m.penalty ? `-${m.penalty} MATIC` : '0 MATIC'}
                  </td>
                  <td className="py-3 px-3 text-right text-ink/60 font-mono">
                    {m.fee ? `${m.fee} MATIC` : '0 MATIC'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
