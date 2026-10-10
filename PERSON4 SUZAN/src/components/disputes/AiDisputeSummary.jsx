import React, { useState } from 'react';
import Button from '../common/Button.jsx';
import { getAiDisputeSummary } from '../../api/disputes.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Bot, Sparkles, Scale, Info, PieChart } from 'lucide-react';
import { formatBps } from '../../lib/formatters.js';

export default function AiDisputeSummary({
  agreementId,
  milestoneIdx,
  initialSummary = null
}) {
  const toast = useToast();
  const [summaryData, setSummaryData] = useState(initialSummary);
  const [isLoading, setIsLoading] = useState(false);

  const handleFetchSummary = async () => {
    try {
      setIsLoading(true);
      toast.info('AI is reviewing evidence thread, code diffs, and contract terms...');
      const data = await getAiDisputeSummary(agreementId, milestoneIdx);
      setSummaryData(data);
      toast.success('AI dispute summary & advisory split generated!');
    } catch (err) {
      toast.error(err.message || 'Failed to generate AI dispute summary');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-surface-900/90 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-400" />
          <h4 className="text-sm font-bold text-slate-100">
            AI Advisory Dispute Synthesis
          </h4>
        </div>

        {/* Mandatory Advisory Notice */}
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-semibold flex items-center gap-1">
          <Info className="w-3.5 h-3.5" /> Advisory Only. Arbitrators Vote.
        </span>
      </div>

      {!summaryData ? (
        <div className="text-center py-6 space-y-3">
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Generate an objective synthesis of the evidence thread, milestone requirements, and GitHub code analysis with recommended compensation split.
          </p>
          <Button
            variant="accent"
            size="sm"
            onClick={handleFetchSummary}
            isLoading={isLoading}
            icon={Sparkles}
          >
            Get AI Dispute Summary & Recommendation
          </Button>
        </div>
      ) : (
        <div className="space-y-4 text-xs">
          {/* Recommended Split Card */}
          <div className="p-4 rounded-xl bg-surface-850 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-teal-400" />
                Recommended Escrow Split
              </span>
              <span className="font-mono text-xs text-teal-300 font-bold">
                Freelancer: {formatBps(summaryData.recommended_freelancer_share_bps || 5000)} | Client: {formatBps(10000 - (summaryData.recommended_freelancer_share_bps || 5000))}
              </span>
            </div>

            {/* Split bar */}
            <div className="w-full h-3 rounded-full bg-purple-900/60 overflow-hidden flex border border-slate-700/80">
              <div
                className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full"
                style={{ width: `${(summaryData.recommended_freelancer_share_bps / 10000) * 100}%` }}
                title={`Freelancer: ${formatBps(summaryData.recommended_freelancer_share_bps)}`}
              />
              <div
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full flex-1"
                title={`Client: ${formatBps(10000 - summaryData.recommended_freelancer_share_bps)}`}
              />
            </div>
          </div>

          {/* Synthesis Summary */}
          <div className="p-3.5 rounded-xl bg-surface-850 border border-slate-800 space-y-1 leading-relaxed">
            <strong className="text-slate-100 font-semibold block text-[11px]">Analysis Summary:</strong>
            <p className="text-slate-300">{summaryData.summary}</p>
          </div>

          {/* Reasoning */}
          <div className="p-3.5 rounded-xl bg-surface-850 border border-slate-800 space-y-1 leading-relaxed">
            <strong className="text-slate-100 font-semibold block text-[11px]">Reasoning & Findings:</strong>
            <p className="text-slate-300">{summaryData.reasoning}</p>
          </div>
        </div>
      )}
    </div>
  );
}
