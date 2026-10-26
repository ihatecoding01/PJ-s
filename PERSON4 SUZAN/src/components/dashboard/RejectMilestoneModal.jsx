import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { txRejectMilestone } from '../../chain/transactions.js';
import { useToast } from '../../context/ToastContext.jsx';
import { checkMilestoneScope } from '../../api/milestones.js';
import { AlertTriangle, Sparkles, ShieldAlert, CheckCircle2, Clock, Coins, ArrowRight } from 'lucide-react';

export default function RejectMilestoneModal({
  isOpen,
  onClose,
  milestone,
  onchainId,
  milestoneIdx: rawIdx,
  onSuccess
}) {
  const toast = useToast();
  const idx = milestone?.idx ?? milestone?.milestoneIndex ?? rawIdx ?? 0;
  const milestoneId = milestone?.id || milestone?.agreementId;
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scopeAnalysis, setScopeAnalysis] = useState(null);

  // Auto-debounce AI scope check when typing
  useEffect(() => {
    if (!reason || reason.trim().length < 15) {
      setScopeAnalysis(null);
      return;
    }

    const timer = setTimeout(() => {
      runScopeCheck(reason);
    }, 800);

    return () => clearTimeout(timer);
  }, [reason]);

  const runScopeCheck = async (textToCheck) => {
    if (!textToCheck || textToCheck.trim().length < 5) return;
    try {
      setIsAnalyzing(true);
      const res = await checkMilestoneScope(milestoneId || 'default', textToCheck.trim(), idx);
      if (res?.data) {
        setScopeAnalysis(res.data);
      }
    } catch (err) {
      console.warn('Scope check error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please specify a rejection reason');
      return;
    }

    try {
      setIsSubmitting(true);
      let toastId = null;

      await txRejectMilestone(onchainId || 1, idx, reason.trim(), {
        onPending: (hash) => {
          toastId = toast.pendingTx(hash, 'Rejecting milestone on-chain...');
        },
        onSuccess: (rec) => {
          if (toastId) toast.confirmedTx(toastId, rec.hash, 'Milestone rejected on-chain.');
        },
        onError: (err) => {
          if (toastId) toast.failedTx(toastId, err);
        }
      });

      toast.success('Milestone rejected. Freelancer can revise and re-submit.');
      onClose();
      if (onSuccess) onSuccess();
      setReason('');
      setScopeAnalysis(null);
    } catch (err) {
      toast.error(err.message || 'Failed to reject milestone');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reject Deliverable: Milestone #${idx + 1}`}
      subtitle="Anchor an immutable rejection reason hash on-chain"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleReject} className="space-y-4">
        <div className="p-3.5 rounded-card bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong className="font-heading font-bold text-ink">Review Window Notice:</strong>
            <p className="text-ink/80 mt-0.5 leading-relaxed">
              Silence during the review window allows the freelancer to claim auto-approval. Rejection requires submitting an exact cryptographic reason hash on-chain.
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70">
              Reason for Rejection & Specific Deficiencies
            </label>
            <button
              type="button"
              onClick={() => runScopeCheck(reason)}
              disabled={isAnalyzing || !reason.trim()}
              className="text-[11px] text-forest hover:text-forest/80 font-heading font-semibold flex items-center gap-1 disabled:opacity-40"
            >
              <Sparkles className="w-3 h-3 text-forest" />
              {isAnalyzing ? 'Analyzing...' : 'Check Scope with AI'}
            </button>
          </div>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why the deliverable failed acceptance criteria, missing tests, or reproducible bugs..."
            className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2.5 text-xs text-ink placeholder:text-ink/40 focus:outline-none focus:border-forest resize-none"
            required
          />
        </div>

        {/* AI Scope Creep Telemetry Panel */}
        {isAnalyzing && (
          <div className="p-3 rounded-card bg-sage/20 border border-sage/40 flex items-center gap-2.5 text-xs text-ink/70">
            <Sparkles className="w-4 h-4 text-forest animate-pulse" />
            <span>AI evaluating request against signed acceptance criteria...</span>
          </div>
        )}

        {scopeAnalysis && !isAnalyzing && (
          <div
            className={`p-3.5 rounded-card border text-xs space-y-2 transition-all ${
              scopeAnalysis.classification === 'SCOPE_CREEP'
                ? 'bg-amber-50/90 border-amber-300 text-amber-900'
                : 'bg-sage/40 border-forest/30 text-ink'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-heading font-bold">
                {scopeAnalysis.classification === 'SCOPE_CREEP' ? (
                  <>
                    <ShieldAlert className="w-4 h-4 text-amber-700" />
                    <span className="text-amber-800">Potential Scope Creep Detected</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-forest" />
                    <span className="text-forest">Legitimate Defect Fix Report</span>
                  </>
                )}
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-white/80 border border-gray/50">
                {scopeAnalysis.confidence}% Confidence
              </span>
            </div>

            <p className="text-[11px] leading-relaxed text-ink/80">
              {scopeAnalysis.reasoning}
            </p>

            {scopeAnalysis.classification === 'SCOPE_CREEP' && scopeAnalysis.suggestedAmendment && (
              <div className="mt-2 pt-2 border-t border-amber-200/80 bg-white/60 p-2.5 rounded-card">
                <span className="text-[11px] font-heading font-semibold text-amber-900 block mb-1.5">
                  💡 FairWork Advisory Recommendation:
                </span>
                <p className="text-[11px] text-ink/80 mb-2 leading-relaxed">
                  Instead of an outright rejection that could lead to dispute escalation, propose an on-chain amendment to add budget and days:
                </p>
                <div className="flex items-center gap-3 text-xs font-heading font-medium text-ink mb-2">
                  <div className="flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-forest" />
                    <span>+{scopeAnalysis.suggestedAmendment.suggestedAdditionalBudget} ETH</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-forest" />
                    <span>+{scopeAnalysis.suggestedAmendment.suggestedAdditionalDays} days</span>
                  </div>
                </div>
                <p className="text-[10px] text-ink/60 italic">
                  Tip: You can revise feedback to focus only on original criteria, or proceed to submit rejection hash.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="pt-2 flex justify-end gap-2 border-t border-gray">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" size="sm" loading={isSubmitting}>
            Confirm Rejection On-Chain
          </Button>
        </div>
      </form>
    </Modal>
  );
}

