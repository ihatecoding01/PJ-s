import React, { useState } from 'react';
import { calculateLatePenalty } from '../../lib/latePenalty.js';
import { formatMatic } from '../../lib/formatters.js';
import { Calculator, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import AmountDisplay from '../ui/AmountDisplay.jsx';

export default function LatePenaltyPreview({
  milestone,
  terms,
  deadlineSec: rawDeadlineSec,
  milestoneAmount: rawAmount,
  latePenaltyBpsPerDay = 100,
  maxLatePenaltyBps = 3000,
  protocolFeeBps = 100
}) {
  const [simulatedDaysLate, setSimulatedDaysLate] = useState(0);

  const amount = rawAmount || milestone?.amount || 0;
  const deadlineSec = rawDeadlineSec || (milestone?.deadline ? Math.floor(new Date(milestone.deadline).getTime() / 1000) : 0);
  const penaltyBps = terms?.latePenaltyBpsPerDay || latePenaltyBpsPerDay;
  const maxBps = terms?.maxLatePenaltyBps || maxLatePenaltyBps;

  // Calculate simulated penalty
  const simulatedSubmittedSec = (Number(deadlineSec) || Math.floor(Date.now() / 1000)) + simulatedDaysLate * 86400;
  const simCalc = calculateLatePenalty({
    milestoneAmount: amount,
    deadlineSec,
    submittedSec: simulatedSubmittedSec,
    latePenaltyBpsPerDay: penaltyBps,
    maxLatePenaltyBps: maxBps,
    protocolFeeBps
  });

  return (
    <div className="rounded-card border border-gray bg-sage/30 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-gray">
        <h5 className="text-xs font-heading font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
          <Calculator className="w-4 h-4 text-forest" />
          On-Chain Late Penalty Preview
        </h5>
        <span className="text-[11px] font-mono text-ink/60">
          Rate: {(penaltyBps / 100).toFixed(1)}%/day (Max: {(maxBps / 100).toFixed(0)}%)
        </span>
      </div>

      {/* Interactive Simulation Slider */}
      <div className="space-y-1.5 bg-white p-3 rounded-[10px] border border-gray">
        <div className="flex items-center justify-between text-xs">
          <span className="font-heading font-medium text-ink">Simulate Submission Delay:</span>
          <span className="font-mono font-bold text-forest">
            {simulatedDaysLate} {simulatedDaysLate === 1 ? 'day' : 'days'} late
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="35"
          value={simulatedDaysLate}
          onChange={(e) => setSimulatedDaysLate(Number(e.target.value))}
          className="w-full accent-forest cursor-pointer"
        />
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2.5 rounded-[8px] bg-white border border-gray">
          <span className="text-[10px] text-ink/60 font-heading block">Penalty Bps</span>
          <span className="font-mono font-bold text-coral">
            {simCalc.penaltyBps} bps ({((simCalc.penaltyBps || 0) / 100).toFixed(1)}%)
          </span>
        </div>

        <div className="p-2.5 rounded-[8px] bg-white border border-gray">
          <span className="text-[10px] text-ink/60 font-heading block">Penalty Refund</span>
          <span className="font-mono font-bold text-coral">
            {simCalc.penaltyRefund?.toFixed(4)} MATIC
          </span>
        </div>

        <div className="p-2.5 rounded-[8px] bg-white border border-gray">
          <span className="text-[10px] text-ink/60 font-heading block">Protocol Fee (1%)</span>
          <span className="font-mono font-bold text-ink/70">
            {simCalc.fee?.toFixed(4)} MATIC
          </span>
        </div>

        <div className="p-2.5 rounded-[8px] bg-sage-light border border-forest/20">
          <span className="text-[10px] text-forest font-heading block font-semibold">Net Payout</span>
          <span className="font-mono font-bold text-forest">
            {simCalc.freelancerAmount?.toFixed(4)} MATIC
          </span>
        </div>
      </div>
    </div>
  );
}
