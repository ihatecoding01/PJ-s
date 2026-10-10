import React from 'react';
import Card from '../common/Card.jsx';
import Badge from '../common/Badge.jsx';
import {
  Bot,
  CheckCircle2,
  XCircle,
  GitCommit,
  GitPullRequest,
  FileCode,
  CheckSquare,
  AlertTriangle,
  Info
} from 'lucide-react';
import { formatBps } from '../../lib/formatters.js';

export default function AiProgressCard({ aiReport, requiredProgressBps = 8000 }) {
  if (!aiReport) return null;

  const currentBps = aiReport.progress_bps || 0;
  const isSatisfied = currentBps >= requiredProgressBps;
  const confidencePercent = Math.round((aiReport.confidence || 0) * 100);

  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-surface-900/90 p-5 space-y-4 shadow-xl backdrop-blur-md">
      {/* Header with Advisory Label */}
      <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              AI GitHub Progress Analysis
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono">
                {confidencePercent}% Confidence
              </span>
            </h4>
            <p className="text-xs text-slate-400">Automated signal inspection of commits & PR diffs.</p>
          </div>
        </div>

        {/* Mandatory Advisory Notice */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Advisory. The client decides.</span>
        </div>
      </div>

      {/* Progress Bar comparison */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-300">
            Analyzed Progress: <strong className={isSatisfied ? 'text-emerald-400' : 'text-amber-400'}>{formatBps(currentBps)}</strong>
          </span>
          <span className="text-slate-400">
            Required Threshold: <strong className="text-slate-200">{formatBps(requiredProgressBps)}</strong>
          </span>
        </div>

        {/* Stacked bar */}
        <div className="w-full h-3 rounded-full bg-surface-800 overflow-hidden relative border border-slate-700/80">
          <div
            className={`h-full transition-all duration-500 ${
              isSatisfied
                ? 'bg-gradient-to-r from-teal-500 to-emerald-400'
                : 'bg-gradient-to-r from-amber-500 to-rose-400'
            }`}
            style={{ width: `${Math.min(100, (currentBps / 10000) * 100)}%` }}
          />
          {/* Target marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-sm z-10"
            style={{ left: `${(requiredProgressBps / 10000) * 100}%` }}
            title={`Required ${formatBps(requiredProgressBps)}`}
          />
        </div>
      </div>

      {/* Signals Checklist */}
      {aiReport.signals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-surface-850 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-sans">Commits</span>
            <span className="text-slate-200 font-bold flex items-center gap-1 mt-0.5">
              <GitCommit className="w-3.5 h-3.5 text-teal-400" />
              {aiReport.signals.commits ?? 0}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-850 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-sans">PRs Merged</span>
            <span className="text-slate-200 font-bold flex items-center gap-1 mt-0.5">
              <GitPullRequest className="w-3.5 h-3.5 text-indigo-400" />
              {aiReport.signals.prs_merged ?? 0}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-850 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-sans">Lines Added</span>
            <span className="text-slate-200 font-bold flex items-center gap-1 mt-0.5">
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              +{aiReport.signals.lines_added ?? 0}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-850 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-sans">Tests Status</span>
            <span className={`font-bold flex items-center gap-1 mt-0.5 ${
              aiReport.signals.tests_status === 'PASSED' ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              <CheckSquare className="w-3.5 h-3.5" />
              {aiReport.signals.tests_status || 'UNKNOWN'}
            </span>
          </div>
        </div>
      )}

      {/* Criteria Breakdown */}
      {aiReport.criteria_results?.length > 0 && (
        <div className="space-y-2 pt-2">
          <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Acceptance Criteria Verification
          </h5>
          <div className="space-y-1.5">
            {aiReport.criteria_results.map((c, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-surface-850/80 border border-slate-800 flex items-start gap-2.5 text-xs"
              >
                {c.met ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <span className="text-slate-200 font-medium">{c.criterion}</span>
                  {c.evidence && (
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono leading-relaxed">
                      {c.evidence}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary & Risks */}
      {aiReport.summary && (
        <div className="p-3 rounded-xl bg-surface-850 border border-slate-800 text-xs text-slate-300 leading-relaxed">
          <strong className="text-slate-100 font-semibold block mb-0.5">Summary:</strong>
          {aiReport.summary}
        </div>
      )}

      {aiReport.risks?.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/25 space-y-1 text-xs text-amber-300">
          <div className="flex items-center gap-1.5 font-semibold text-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Detected Considerations / Risks:
          </div>
          <ul className="list-disc list-inside text-slate-300 space-y-0.5 text-[11px]">
            {aiReport.risks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
