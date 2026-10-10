import React, { useState } from 'react';
import { calculateLatePenalty } from '../../lib/latePenalty.js';
import { formatMatic } from '../../lib/formatters.js';
import { Calculator, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LatePenaltyPreview({
  milestoneAmount,
  deadlineSec,
  latePenaltyBpsPerDay = 100,
  maxLatePenaltyBps = 3000,
  protocolFeeBps = 100
}) {
  const [simulatedDaysLate, setSimulatedDaysLate] = useState(0);

  // Calculate actual current penalty
  const currentCalc = calculateLatePenalty({
    milestoneAmount,
    deadlineSec,
    submittedSec: Math.floor(Date.now() / 1000),
    latePenaltyBpsPerDay,
    maxLatePenaltyBps,
    protocolFeeBps
  });

  // Calculate simulated penalty
  const simulatedSubmittedSec = (Number(deadlineSec) || Math.floor(Date.now() / 1000)) + simulatedDaysLate * 86400;
  const simCalc = calculateLatePenalty({
    milestoneAmount,
    deadlineSec,
    submittedSec: simulatedSubmittedSec,
    latePenaltyBpsPerDay,
    maxLatePenaltyBps,
    protocolFeeBps
  });

  return (
    <div className="rounded-2xl border border-slate-800 bg-surface-850/80 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-slate-800">
        <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <Calculator className="w-4 h-4 text-teal-400" />
          On-Chain Late Penalty & Payout Formula
        </h5>
        <span className="text-[11px] font-mono text-slate-400">
          Rate: {(latePenaltyBpsPerDay / 100).toFixed(1)}%/day (Max: {(maxLatePenaltyBps / 100).toFixed(0)}%)
        </span>
      </div>

      {/* Interactive Simulation Slider */}
      <div className="space-y-1.5 bg-surface-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300">Simulate Submission Delay:</span>
          <span className="font-mono font-bold text-teal-300">
            {simulatedDaysLate} {simulatedDaysLate === 1 ? 'day' : 'days'} late
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="35"
          value={simulatedDaysLate}
          onChange={(e) => setSimulatedDaysLate(Number(e.target.value))}
          className="w-full accent-teal-400 cursor-pointer h-1.5 bg-surface-800 rounded-lg"
        />
      </div>

      {/* Calculation Table */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className="p-2.5 rounded-xl bg-surface-900 border border-slate-800">
          <span className="text-[10px] text-slate-400 block font-sans">Milestone Budget</span>
          <span className="text-slate-100 font-bold block mt-0.5">
            {formatMatic(simCalc.milestoneAmount)}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-surface-900 border border-slate-800">
          <span className="text-[10px] text-slate-400 block font-sans">
            Penalty ({simCalc.penaltyPercentage}%)
          </span>
          <span className={`font-bold block mt-0.5 ${simCalc.penaltyAmount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            -{formatMatic(simCalc.penaltyAmount)}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-surface-900 border border-slate-800">
          <span className="text-[10px] text-slate-400 block font-sans">
            Protocol Fee ({(protocolFeeBps / 100).toFixed(1)}%)
          </span>
          <span className="text-slate-400 font-bold block mt-0.5">
            -{formatMatic(simCalc.protocolFee)}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-emerald-950/25 border border-emerald-500/30">
          <span className="text-[10px] text-emerald-300 block font-sans font-semibold">
            Freelancer Payout
          </span>
          <span className="text-emerald-400 font-bold block mt-0.5">
            {formatMatic(simCalc.freelancerPayout)}
          </span>
        </div>
      </div>

      {simCalc.penaltyAmount > 0 && (
        <p className="text-[11px] text-slate-400 italic">
          * Note: {formatMatic(simCalc.clientRefundAmount)} late penalty is automatically refunded to the Client contract balance upon release.
        </p>
      )}
    </div>
  );
}
