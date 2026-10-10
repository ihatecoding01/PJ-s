import React, { useState } from 'react';
import Card from '../common/Card.jsx';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import CountdownTimer from '../common/CountdownTimer.jsx';
import AiProgressCard from './AiProgressCard.jsx';
import LatePenaltyPreview from './LatePenaltyPreview.jsx';
import SubmitMilestoneModal from './SubmitMilestoneModal.jsx';
import RejectMilestoneModal from './RejectMilestoneModal.jsx';
import {
  txApproveMilestone,
  txClaimAfterReviewWindow,
  txReclaimMissedMilestone
} from '../../chain/transactions.js';
import { useWallet } from '../../context/WalletContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatMatic, formatDate } from '../../lib/formatters.js';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Coins,
  Scale,
  Sparkles,
  Lock
} from 'lucide-react';

export default function MilestoneCard({
  milestone,
  termsMilestone,
  agreement,
  onMilestoneUpdated,
  onOpenDispute
}) {
  const { address } = useWallet();
  const toast = useToast();

  const [expanded, setExpanded] = useState(milestone.status === 'Submitted' || milestone.status === 'Disputed');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const idx = milestone.idx;
  const terms = agreement.terms;
  const onchainId = agreement.onchainId;

  const isClient = address && terms?.client && address.toLowerCase() === terms.client.toLowerCase();
  const isFreelancer = address && terms?.freelancer && address.toLowerCase() === terms.freelancer.toLowerCase();
  const isAgreementActive = agreement.status === 'Active' || agreement.status === 'Disputed';

  // Calculate review and deadline windows
  const deadlineSec = termsMilestone?.deadline
    ? Math.floor(new Date(termsMilestone.deadline).getTime() / 1000)
    : 0;
  const isDeadlinePassed = deadlineSec > 0 && Math.floor(Date.now() / 1000) > deadlineSec;

  const reviewWindowSec = Number(terms?.reviewWindowDays || 5) * 86400;
  const graceWindowSec = Number(terms?.graceDays || 3) * 86400;

  // Let's check submission time (if submitted)
  const submittedAtSec = milestone.submittedAt || (milestone.submission ? Math.floor(Date.now() / 1000) - 86400 : 0);
  const reviewExpirySec = submittedAtSec + reviewWindowSec;
  const isReviewWindowExpired = milestone.status === 'Submitted' && Math.floor(Date.now() / 1000) >= reviewExpirySec;

  const deadlinePlusGraceSec = deadlineSec + graceWindowSec;
  const isGraceExpired = isDeadlinePassed && Math.floor(Date.now() / 1000) >= deadlinePlusGraceSec;

  // Approve Milestone (Client)
  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      let toastId = null;

      await txApproveMilestone(onchainId || 1, idx, {
        onPending: (hash) => {
          toastId = toast.pendingTx(hash, `Approving Milestone #${idx + 1} and releasing payment...`);
        },
        onSuccess: (rec) => {
          if (toastId) toast.confirmedTx(toastId, rec.hash, `Milestone #${idx + 1} approved! Payout released.`);
        },
        onError: (err) => {
          if (toastId) toast.failedTx(toastId, err);
        }
      });

      toast.success(`Milestone #${idx + 1} approved! Funds released to freelancer.`);
      if (onMilestoneUpdated) onMilestoneUpdated();
    } catch (err) {
      toast.error(err.message || 'Failed to approve milestone');
    } finally {
      setIsProcessing(false);
    }
  };

  // Claim after review window (Freelancer auto-claim)
  const handleClaimAutoApproval = async () => {
    if (!isReviewWindowExpired) {
      toast.warning('Review window is still active. Auto-claim not yet unlocked.');
      return;
    }

    try {
      setIsProcessing(true);
      let toastId = null;

      await txClaimAfterReviewWindow(onchainId || 1, idx, {
        onPending: (hash) => {
          toastId = toast.pendingTx(hash, 'Claiming payment after client silence...');
        },
        onSuccess: (rec) => {
          if (toastId) toast.confirmedTx(toastId, rec.hash, 'Payment claimed successfully via auto-approval!');
        },
        onError: (err) => {
          if (toastId) toast.failedTx(toastId, err);
        }
      });

      toast.success('Funds released via review window expiration!');
      if (onMilestoneUpdated) onMilestoneUpdated();
    } catch (err) {
      toast.error(err.message || 'Claim failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reclaim missed milestone (Client reclaim)
  const handleReclaimMissed = async () => {
    if (!isGraceExpired) {
      toast.warning('Grace period is still active. Reclaim not yet unlocked.');
      return;
    }

    try {
      setIsProcessing(true);
      let toastId = null;

      await txReclaimMissedMilestone(onchainId || 1, idx, {
        onPending: (hash) => {
          toastId = toast.pendingTx(hash, 'Reclaiming escrow funds after missed deadline & grace...');
        },
        onSuccess: (rec) => {
          if (toastId) toast.confirmedTx(toastId, rec.hash, 'Escrow funds refunded to client balance!');
        },
        onError: (err) => {
          if (toastId) toast.failedTx(toastId, err);
        }
      });

      toast.success('Milestone funds refunded to client!');
      if (onMilestoneUpdated) onMilestoneUpdated();
    } catch (err) {
      toast.error(err.message || 'Reclaim failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="transition-all duration-300 space-y-4">
      {/* Top Summary Bar */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <span className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 font-mono font-bold text-sm flex items-center justify-center shrink-0">
            {idx + 1}
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base font-bold text-slate-100">
                {termsMilestone?.title || `Milestone #${idx + 1}`}
              </h4>
              <Badge label={milestone.status} variant={milestone.status} size="sm" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
              {termsMilestone?.description || 'Milestone deliverable'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-sans">Amount</span>
            <span className="text-sm font-mono font-bold text-teal-300">
              {formatMatic(milestone.amount || termsMilestone?.amount)}
            </span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg bg-surface-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Countdown Timers & Alerts */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        {/* Deadline Timer */}
        {milestone.status !== 'Paid' && milestone.status !== 'Refunded' && termsMilestone?.deadline && (
          <CountdownTimer
            targetTime={termsMilestone.deadline}
            label="Deadline"
          />
        )}

        {/* Review Window Timer (when Submitted) */}
        {milestone.status === 'Submitted' && (
          <CountdownTimer
            targetTime={reviewExpirySec}
            label="Client Review Window"
          />
        )}

        {/* Grace Window Timer (if deadline passed & not submitted) */}
        {milestone.status === 'Pending' && isDeadlinePassed && (
          <CountdownTimer
            targetTime={deadlinePlusGraceSec}
            label="Grace Window for Reclaim"
          />
        )}
      </div>

      {/* Primary Action Buttons Bar */}
      {isAgreementActive && (
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 flex-wrap">
          {/* Left: Role actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Freelancer: Submit form */}
            {isFreelancer && (milestone.status === 'Pending' || milestone.status === 'Rejected') && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsSubmitModalOpen(true)}
                icon={Send}
              >
                Submit Milestone
              </Button>
            )}

            {/* Client: Approve or Reject */}
            {isClient && milestone.status === 'Submitted' && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleApprove}
                  isLoading={isProcessing}
                  icon={CheckCircle2}
                >
                  Approve & Release Funds
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setIsRejectModalOpen(true)}
                  disabled={isProcessing}
                  icon={XCircle}
                >
                  Reject Deliverable
                </Button>
              </>
            )}

            {/* Freelancer: Claim after review window */}
            {isFreelancer && milestone.status === 'Submitted' && (
              <div title={isReviewWindowExpired ? 'Claim payment now' : `Enabled after ${terms?.reviewWindowDays || 5}-day review window expires`}>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={handleClaimAutoApproval}
                  isLoading={isProcessing}
                  disabled={!isReviewWindowExpired || isProcessing}
                  icon={Sparkles}
                >
                  Claim Payment (Auto-Approval)
                </Button>
              </div>
            )}

            {/* Client: Reclaim missed milestone */}
            {isClient && milestone.status === 'Pending' && (
              <div title={isGraceExpired ? 'Reclaim escrow funds' : 'Enabled only after deadline + grace period has expired'}>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleReclaimMissed}
                  isLoading={isProcessing}
                  disabled={!isGraceExpired || isProcessing}
                  icon={Coins}
                >
                  Reclaim Funds (Missed Deadline)
                </Button>
              </div>
            )}
          </div>

          {/* Right: Raise dispute */}
          {(isClient || isFreelancer) && (milestone.status === 'Submitted' || milestone.status === 'Rejected') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenDispute(idx)}
              icon={Scale}
              className="text-amber-400 border-amber-500/40 hover:bg-amber-500/10"
            >
              Raise Dispute
            </Button>
          )}
        </div>
      )}

      {/* Expanded Accordion: Details, AI Card, Late Penalty */}
      {expanded && (
        <div className="space-y-4 pt-3 border-t border-slate-800 animate-fade-in">
          {/* Submission Details */}
          {milestone.submission && (
            <div className="p-3.5 rounded-xl bg-surface-850 border border-slate-800 space-y-2 text-xs">
              <span className="font-semibold text-slate-300 uppercase tracking-wider block text-[10px]">
                Submission Information
              </span>
              <div className="flex items-center gap-4 flex-wrap font-mono">
                <span>Commit: <strong className="text-teal-300">{milestone.submission.commitSha?.substring(0, 8)}</strong></span>
                {milestone.submission.prUrl && (
                  <a
                    href={milestone.submission.prUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:underline"
                  >
                    View Pull Request &rarr;
                  </a>
                )}
              </div>
              {milestone.submission.notes && (
                <p className="text-slate-300 italic">{milestone.submission.notes}</p>
              )}
            </div>
          )}

          {/* AI Progress Card */}
          {milestone.aiReport && (
            <AiProgressCard
              aiReport={milestone.aiReport}
              requiredProgressBps={termsMilestone?.requiredProgressBps || 8000}
            />
          )}

          {/* Late Penalty Calculator Preview */}
          <LatePenaltyPreview
            milestoneAmount={milestone.amount || termsMilestone?.amount || 0}
            deadlineSec={deadlineSec}
            latePenaltyBpsPerDay={terms?.latePenaltyBpsPerDay}
            maxLatePenaltyBps={terms?.maxLatePenaltyBps}
          />
        </div>
      )}

      {/* Submit Modal */}
      <SubmitMilestoneModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        agreementId={agreement.id}
        onchainId={onchainId}
        milestoneIdx={idx}
        milestoneTitle={termsMilestone?.title}
        onSuccess={() => {
          if (onMilestoneUpdated) onMilestoneUpdated();
        }}
      />

      {/* Reject Modal */}
      <RejectMilestoneModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onchainId={onchainId}
        milestoneIdx={idx}
        onSuccess={() => {
          if (onMilestoneUpdated) onMilestoneUpdated();
        }}
      />
    </Card>
  );
}
