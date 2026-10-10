import React from 'react';
import Card from '../common/Card.jsx';
import Badge from '../common/Badge.jsx';
import { formatMatic } from '../../lib/formatters.js';
import { FileSpreadsheet } from 'lucide-react';

export default function MilestonePaymentTable({ milestones = [] }) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-teal-400" />
          Per-Milestone Payment & Fee Ledger
        </h4>
        <span className="text-xs text-slate-400 font-mono">
          {milestones.length} Milestone Records
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
              <th className="py-2.5 px-3">Milestone</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Escrow Amount</th>
              <th className="py-2.5 px-3 text-right">Net Released</th>
              <th className="py-2.5 px-3 text-right">Penalty Deducted</th>
              <th className="py-2.5 px-3 text-right">Protocol Fee (1%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {milestones.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500 italic">
                  No milestone payment data recorded yet.
                </td>
              </tr>
            ) : (
              milestones.map((m) => (
                <tr key={m.idx} className="hover:bg-surface-850/50 transition-colors">
                  <td className="py-3 px-3 font-sans font-medium text-slate-200">
                    Milestone #{m.idx + 1}
                  </td>
                  <td className="py-3 px-3">
                    <Badge label={m.status} variant={m.status} size="sm" />
                  </td>
                  <td className="py-3 px-3 text-right text-slate-100 font-bold">
                    {formatMatic(m.amount)}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                    {formatMatic(m.paid || 0)}
                  </td>
                  <td className="py-3 px-3 text-right text-rose-400">
                    {formatMatic(m.penalty || 0)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-400">
                    {formatMatic(m.fee || 0)}
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
