import React, { useState } from 'react';
import Button from '../common/Button.jsx';
import { getAiDisputeSummary, getArbitratorDossier } from '../../api/disputes.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Bot,
  Sparkles,
  Scale,
  Info,
  PieChart,
  FileText,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Calendar,
  Layers
} from 'lucide-react';
import { formatBps } from '../../lib/formatters.js';

export default function AiDisputeSummary({
  disputeId,
  agreementId,
  milestoneIdx,
  initialSummary = null,
  initialDossier = null
}) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('dossier'); // 'dossier' | 'summary'
  const [summaryData, setSummaryData] = useState(initialSummary);
  const [dossierData, setDossierData] = useState(initialDossier);
  const [isLoading, setIsLoading] = useState(false);

  const effectiveDisputeId = disputeId || `disp-${agreementId || '1'}`;

  const handleFetchDossier = async () => {
    try {
      setIsLoading(true);
      toast.info('Advisory AI is cross-examining evidence files, timeline, and criteria...');
      const data = await getArbitratorDossier(effectiveDisputeId);
      setDossierData(data);
      if (!summaryData) {
        setSummaryData({
          summary: data.executive_summary,
          recommended_freelancer_share_bps: data.recommended_share_bps,
          reasoning: 'Synthesized from multi-criteria Claims vs Fact evidence evaluation.'
        });
      }
      toast.success('Executive Arbitrator Dossier & Claims Matrix generated!');
    } catch (err) {
      toast.error(err.message || 'Failed to generate Arbitrator Dossier');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchSummary = async () => {
    try {
      setIsLoading(true);
      toast.info('AI is reviewing evidence thread, code diffs, and contract terms...');
      const data = await getAiDisputeSummary(agreementId || '1', milestoneIdx || 0);
      setSummaryData(data);
      toast.success('AI dispute summary & advisory split generated!');
    } catch (err) {
      toast.error(err.message || 'Failed to generate AI dispute summary');
    } finally {
      setIsLoading(false);
    }
  };

  const currentShareBps =
    dossierData?.recommended_share_bps ??
    summaryData?.recommended_freelancer_share_bps ??
    7000;

  return (
    <div className="rounded-card border border-forest/20 bg-sage/30 p-5 space-y-4">
      {/* Header with Advisory Notice */}
      <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-gray">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-[8px] bg-forest text-ivory">
            <Scale className="w-5 h-5 text-coral" />
          </div>
          <div>
            <h4 className="text-sm font-heading font-bold text-ink flex items-center gap-2">
              AI Arbitrator Dossier & Evidence Cross-Examiner
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sage-light text-forest border border-forest/20 font-mono">
                Advisory Signal
              </span>
            </h4>
            <p className="text-xs text-ink/60 mt-0.5">
              Objective Claims vs. Fact synthesis prepared for the 3 community peer arbitrators.
            </p>
          </div>
        </div>

        {/* Mandatory Advisory Notice */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-heading font-semibold">
          <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>Advisory Only · Arbitrators Vote</span>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-gray pb-2 text-xs font-heading font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('dossier')}
          className={`pb-1 px-2.5 border-b-2 transition-colors ${
            activeTab === 'dossier'
              ? 'border-forest text-forest font-bold'
              : 'border-transparent text-ink/50 hover:text-ink'
          }`}
        >
          Executive Claims vs. Fact Matrix
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('summary')}
          className={`pb-1 px-2.5 border-b-2 transition-colors ${
            activeTab === 'summary'
              ? 'border-forest text-forest font-bold'
              : 'border-transparent text-ink/50 hover:text-ink'
          }`}
        >
          Dispute Synthesis & Split
        </button>
      </div>

      {!dossierData && !summaryData ? (
        <div className="text-center py-6 space-y-3">
          <p className="text-xs text-ink/70 max-w-md mx-auto leading-relaxed">
            Generate an objective Claims vs. Fact matrix, timeline of dispute events, and an evidence-backed
            settlement recommendation for the 3-arbitrator panel.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleFetchDossier}
              loading={isLoading}
              icon={Sparkles}
            >
              Generate Arbitrator Dossier
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFetchSummary}
              loading={isLoading}
              icon={FileText}
            >
              Quick Summary
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-xs">
          {/* Recommended Escrow Split Card */}
          <div className="p-4 rounded-[10px] bg-white border border-gray space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-heading font-semibold text-ink/70 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-forest" />
                Advisory Escrow Settlement Recommendation
              </span>
              <span className="font-mono text-xs text-forest font-bold">
                Freelancer: {formatBps(currentShareBps)} · Client: {formatBps(10000 - currentShareBps)}
              </span>
            </div>

            {/* Split Bar */}
            <div className="w-full h-3 rounded-full bg-coral/30 overflow-hidden flex border border-gray">
              <div
                className="bg-forest h-full transition-all duration-500"
                style={{ width: `${(currentShareBps / 10000) * 100}%` }}
                title={`Freelancer: ${formatBps(currentShareBps)}`}
              />
              <div
                className="bg-coral h-full flex-1 transition-all duration-500"
                title={`Client: ${formatBps(10000 - currentShareBps)}`}
              />
            </div>
            <div className="flex justify-between text-[10px] text-ink/50 font-mono">
              <span>Freelancer {(currentShareBps / 100).toFixed(0)}%</span>
              <span>Client {(100 - currentShareBps / 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Dossier Tab View */}
          {activeTab === 'dossier' && dossierData && (
            <div className="space-y-4">
              {/* Executive Briefing */}
              <div className="p-3.5 rounded-[10px] bg-white border border-gray space-y-1">
                <span className="font-heading font-semibold text-forest uppercase tracking-wider text-[10px] block">
                  Executive Briefing for Arbitrators
                </span>
                <p className="text-ink/80 leading-relaxed font-sans">{dossierData.executive_summary}</p>
              </div>

              {/* Claims vs Fact Matrix */}
              {dossierData.claims_matrix && dossierData.claims_matrix.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-heading font-bold text-xs uppercase tracking-wider text-ink/70 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-forest" />
                    Claims vs. Fact Matrix
                  </h5>
                  <div className="space-y-2.5">
                    {dossierData.claims_matrix.map((row, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-[10px] bg-white border border-gray space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between border-b border-gray/60 pb-1.5 gap-2 flex-wrap">
                          <span className="font-heading font-bold text-ink">
                            Criterion #{idx + 1}: {row.criterion}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sage/60 border border-forest/20 text-forest font-bold">
                            Advisory: {formatBps(row.suggested_share_bps || 7000)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                          {/* Client Contention */}
                          <div className="p-2 rounded-[6px] bg-coral/10 border border-coral/30 space-y-0.5">
                            <span className="font-heading font-semibold text-coral block text-[10px] uppercase">
                              Client Claim
                            </span>
                            <p className="text-ink/80">{row.client_claim}</p>
                          </div>

                          {/* Freelancer Argument */}
                          <div className="p-2 rounded-[6px] bg-sage/40 border border-forest/30 space-y-0.5">
                            <span className="font-heading font-semibold text-forest block text-[10px] uppercase">
                              Freelancer Argument
                            </span>
                            <p className="text-ink/80">{row.freelancer_claim}</p>
                          </div>
                        </div>

                        {/* Objective Technical Findings */}
                        <div className="p-2 rounded-[6px] bg-ivory border border-gray space-y-0.5 text-[11px]">
                          <span className="font-heading font-semibold text-ink/70 block text-[10px] uppercase flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-forest" />
                            Objective Evidence & Findings
                          </span>
                          <p className="text-ink/90 font-mono text-[10.5px] leading-relaxed">
                            {row.factual_evidence}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              {dossierData.timeline && dossierData.timeline.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-heading font-bold text-xs uppercase tracking-wider text-ink/70 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-forest" />
                    Agreement Event Timeline
                  </h5>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {dossierData.timeline.map((evt, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-[8px] bg-white border border-gray flex items-start gap-2"
                      >
                        <span className="w-5 h-5 rounded-full bg-sage text-forest flex items-center justify-center text-[10px] font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-heading font-bold text-ink">{evt.event}</span>
                            <span className="text-[10px] text-ink/50">{evt.actor || 'System'}</span>
                          </div>
                          <p className="text-ink/70 text-[10.5px] mt-0.5">{evt.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unresolved Questions */}
              {dossierData.unresolved_questions && dossierData.unresolved_questions.length > 0 && (
                <div className="p-3 rounded-[10px] bg-amber-50 border border-amber-200 text-xs space-y-1.5">
                  <span className="font-heading font-bold text-amber-900 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                    Unresolved Points for Arbitrators to Probe
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-amber-950 text-[11px]">
                    {dossierData.unresolved_questions.map((q, idx) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Summary Tab View */}
          {activeTab === 'summary' && summaryData && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-[10px] bg-white border border-gray space-y-1">
                <span className="font-heading font-semibold text-ink/70 uppercase tracking-wider text-[10px] block">
                  Analysis Summary
                </span>
                <p className="text-ink/80 leading-relaxed">{summaryData.summary}</p>
              </div>

              {summaryData.reasoning && (
                <div className="p-3.5 rounded-[10px] bg-white border border-gray space-y-1">
                  <span className="font-heading font-semibold text-ink/70 uppercase tracking-wider text-[10px] block">
                    Criteria-Backed Reasoning
                  </span>
                  <p className="text-ink/80 leading-relaxed">{summaryData.reasoning}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
