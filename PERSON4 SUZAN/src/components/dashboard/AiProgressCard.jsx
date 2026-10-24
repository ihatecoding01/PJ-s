import React from 'react';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import ProgressBar from '../ui/ProgressBar.jsx';
import {
  Bot,
  CheckCircle2,
  XCircle,
  GitCommit,
  GitPullRequest,
  FileCode,
  CheckSquare,
  AlertTriangle,
  Info,
  HelpCircle,
  MinusCircle
} from 'lucide-react';
import { formatBps } from '../../lib/formatters.js';

export default function AiProgressCard({ aiReport, requiredProgressBps = 8000 }) {
  if (!aiReport) return null;

  const currentBps = aiReport.progress_bps || 0;
  const isSatisfied = currentBps >= requiredProgressBps;
  const confidencePercent = Math.round((aiReport.confidence || 0) * 100);

  return (
    <div className="rounded-card border border-forest/20 bg-sage/30 p-5 space-y-4">
      {/* Header with Advisory Label */}
      <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-gray">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-[8px] bg-forest text-ivory">
            <Bot className="w-5 h-5 text-coral" />
          </div>
          <div>
            <h4 className="text-sm font-heading font-bold text-ink flex items-center gap-2">
              Advisory AI GitHub Progress Analysis
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sage-light text-forest border border-forest/20 font-mono">
                {confidencePercent}% Confidence
              </span>
            </h4>
            <p className="text-xs text-ink/60 mt-0.5">Automated signal inspection of commit ASTs and repository diffs.</p>
          </div>
        </div>

        {/* Mandatory Advisory Notice */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-heading font-semibold">
          <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>Advisory. The client decides.</span>
        </div>
      </div>

      {/* Progress Bar comparison */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-heading font-semibold">
          <span className="text-ink">
            Analyzed Progress: <strong className={isSatisfied ? 'text-forest' : 'text-amber-800'}>{formatBps(currentBps)}</strong>
          </span>
          <span className="text-ink/60 font-mono">
            Required: {formatBps(requiredProgressBps)}
          </span>
        </div>

        <ProgressBar
          value={currentBps}
          max={10000}
          variant={isSatisfied ? 'forest' : 'coral'}
        />
      </div>

      {/* Signals Checklist */}
      {aiReport.signals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          <div className="p-2 rounded-[6px] bg-white border border-gray flex items-center gap-1.5 font-mono">
            <GitCommit className="w-3.5 h-3.5 text-forest" />
            <span>Commits: {aiReport.signals.commit_count || 1}</span>
          </div>
          <div className="p-2 rounded-[6px] bg-white border border-gray flex items-center gap-1.5 font-mono">
            <FileCode className="w-3.5 h-3.5 text-forest" />
            <span>Lines: +{aiReport.signals.lines_added || 0}</span>
          </div>
          <div className="p-2 rounded-[6px] bg-white border border-gray flex items-center gap-1.5 font-mono">
            <GitPullRequest className="w-3.5 h-3.5 text-forest" />
            <span>PRs: {aiReport.signals.pr_merged ? 'Merged' : 'Direct'}</span>
          </div>
          <div className="p-2 rounded-[6px] bg-white border border-gray flex items-center gap-1.5 font-mono">
            <CheckSquare className="w-3.5 h-3.5 text-forest" />
            <span>Tests: {aiReport.signals.tests_passed !== false ? 'Passed' : 'Failed'}</span>
          </div>
        </div>
      )}

      {/* Criteria Breakdown & 4-State Verdicts */}
      {(aiReport.criteria_verdicts || aiReport.criteriaVerdicts || aiReport.criteria_checklist) && (
        <div className="space-y-2 pt-2">
          <h5 className="text-xs font-heading font-semibold uppercase tracking-wider text-ink/60 flex items-center justify-between">
            <span>Acceptance Criteria Verification</span>
            <span className="text-[10px] font-mono text-ink/40">4-State Objective Verdicts</span>
          </h5>
          <div className="space-y-2">
            {(aiReport.criteria_verdicts || aiReport.criteriaVerdicts || aiReport.criteria_checklist).map((item, idx) => {
              const verdict = item.verdict || (item.satisfied ? 'SUPPORTED' : 'CHECK_FAILED');
              const isSupported = verdict === 'SUPPORTED';
              const isUnclear = verdict === 'UNCLEAR';
              const isNotDemonstrated = verdict === 'NOT_DEMONSTRATED';
              const isFailed = verdict === 'CHECK_FAILED';

              const badgeColor = isSupported
                ? 'bg-sage/70 border-forest/30 text-forest'
                : isUnclear
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : isNotDemonstrated
                ? 'bg-slate-100 border-slate-300 text-slate-700'
                : 'bg-coral/20 border-coral/40 text-coral-900';

              const VerdictIcon = isSupported
                ? CheckCircle2
                : isUnclear
                ? HelpCircle
                : isNotDemonstrated
                ? MinusCircle
                : XCircle;

              const iconColor = isSupported
                ? 'text-forest'
                : isUnclear
                ? 'text-amber-700'
                : isNotDemonstrated
                ? 'text-slate-600'
                : 'text-coral';

              return (
                <div
                  key={idx}
                  className="p-3 rounded-[8px] bg-white border border-gray flex items-start gap-3 text-xs"
                >
                  <VerdictIcon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-heading font-semibold text-ink">{item.criterion}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-heading font-bold uppercase tracking-wider ${badgeColor}`}
                      >
                        {verdict.replace('_', ' ')}
                      </span>
                    </div>
                    {item.evidence && (
                      <p className="text-[11px] text-ink/70 leading-relaxed font-sans">{item.evidence}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Risks */}
      {aiReport.risks && aiReport.risks.length > 0 && (
        <div className="p-3 rounded-[8px] bg-coral/20 border border-coral/40 text-xs text-ink space-y-1">
          <div className="flex items-center gap-1.5 font-heading font-bold text-coral-900">
            <AlertTriangle className="w-3.5 h-3.5 text-coral shrink-0" />
            <span>Identified Risk Flags</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-ink/80 text-[11px]">
            {aiReport.risks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
