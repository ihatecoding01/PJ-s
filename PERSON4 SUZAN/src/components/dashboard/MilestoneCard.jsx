import React, { useState } from 'react';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Tooltip from '../ui/Tooltip.jsx';
import AmountDisplay from '../ui/AmountDisplay.jsx';
import CountdownTimer from '../ui/CountdownTimer.jsx';
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
  Lock,
  GitCommit,
  Activity,
  AlertCircle
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

  const submittedAtSec = milestone.submittedAt || (milestone.submission ? Math.floor(Date.now() / 1000) - 86400 : 0);
  const reviewExpirySec = submittedAtSec + reviewWindowSec;
  const isReviewWindowExpired = milestone.status === 'Submitted' && Math.floor(Date.now() / 1000) >= reviewExpirySec;

  const deadlinePlusGraceSec = deadlineSec + graceWindowSec;
  const isGraceExpired = isDeadlinePassed && Math.floor(Date.now() / 1000) >= deadlinePlusGraceSec;

  const isCompleted = milestone.status === 'Paid' || milestone.status === 'Approved';

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
          toastId = toast.pendingTx(hash, 'Claiming payment after client review silence...');
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
          toastId = toast.pendingTx(hash, 'Reclaiming escrow funds on missed deliverable...');
        },
        onSuccess: (rec) => {
          if (toastId) toast.confirmedTx(toastId, rec.hash, 'Funds successfully refunded!');
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
    <Card className={`transition-all duration-200 space-y-4 ${isCompleted ? 'bg-sage-light/40 border-forest/30' : 'bg-white'}`}>
      {/* Top Summary Bar */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <span className="w-8 h-8 rounded-[8px] bg-sage text-forest font-heading font-bold text-sm flex items-center justify-center shrink-0 border border-gray">
            {idx + 1}
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base font-heading font-bold text-ink">
                {termsMilestone?.title || `Milestone #${idx + 1}`}
              </h4>
              <Badge status={milestone.status} size="sm">
                {milestone.status}
              </Badge>
              {milestone.healthStatus && milestone.status !== 'Approved' && milestone.status !== 'Paid' && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-heading font-semibold border flex items-center gap-1 ${
                    milestone.healthStatus === 'CRITICAL_DELAY'
                      ? 'bg-coral/20 border-coral/40 text-coral-900'
                      : milestone.healthStatus === 'AT_RISK'
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-sage/70 border-forest/30 text-forest'
                  }`}
                  title="In-flight predictive health telemetry"
                >
                  <Activity className="w-3 h-3" />
                  {milestone.healthStatus === 'CRITICAL_DELAY'
                    ? 'Critical Delay Risk'
                    : milestone.healthStatus === 'AT_RISK'
                    ? 'At Risk (Stalled)'
                    : 'On Track'}
                </span>
              )}
            </div>
            <p className="text-xs text-ink/70 mt-0.5 line-clamp-1">
              {termsMilestone?.description || 'Milestone deliverable specification'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] text-ink/50 block font-heading font-semibold uppercase tracking-wider">Amount</span>
            <AmountDisplay amount={milestone.amount || termsMilestone?.amount} size="md" />
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-[8px] bg-sage/60 hover:bg-sage text-forest transition-colors"
            aria-label="Toggle details"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Countdown Timers & Window Indicators */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        {/* Deadline Timer */}
        {milestone.status !== 'Paid' && milestone.status !== 'Refunded' && termsMilestone?.deadline && (
          <CountdownTimer
            targetDate={termsMilestone.deadline}
            deadlineLabel="Deadline"
          />
        )}

        {/* Review Window Timer (when Submitted) */}
        {milestone.status === 'Submitted' && (
          <CountdownTimer
            targetDate={reviewExpirySec * 1000}
            deadlineLabel="Review Window"
          />
        )}

        {/* Grace Window Timer (if deadline passed & not submitted) */}
        {milestone.status === 'Pending' && isDeadlinePassed && (
          <CountdownTimer
            targetDate={deadlinePlusGraceSec * 1000}
            deadlineLabel="Grace Window"
          />
        )}
      </div>

      {/* Primary Action Buttons Bar */}
      {isAgreementActive && (
        <div className="pt-3 border-t border-gray flex items-center justify-between gap-3 flex-wrap">
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
                  loading={isProcessing}
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

            {/* Freelancer: Claim after review window with Tooltip */}
            {isFreelancer && milestone.status === 'Submitted' && (
              <Tooltip
                content={isReviewWindowExpired ? 'Claim payment now' : `Enabled after ${terms?.reviewWindowDays || 5}-day review window expires without client response.`}
              >
                <Button
                  variant="forest"
                  size="sm"
                  onClick={handleClaimAutoApproval}
                  loading={isProcessing}
                  disabled={!isReviewWindowExpired || isProcessing}
                  icon={Sparkles}
                >
                  Claim Payment (Auto-Approval)
                </Button>
              </Tooltip>
            )}

            {/* Client: Reclaim missed milestone with Tooltip */}
            {isClient && milestone.status === 'Pending' && (
              <Tooltip
                content={isGraceExpired ? 'Reclaim escrow funds' : 'Enabled only after deadline + grace period has expired.'}
              >
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleReclaimMissed}
                  loading={isProcessing}
                  disabled={!isGraceExpired || isProcessing}
                  icon={Coins}
                >
                  Reclaim Funds (Missed Deadline)
                </Button>
              </Tooltip>
            )}
          </div>

          {/* Right: Raise dispute */}
          {(isClient || isFreelancer) && (milestone.status === 'Submitted' || milestone.status === 'Rejected') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenDispute(idx)}
              icon={Scale}
            >
              Raise Dispute
            </Button>
          )}
        </div>
      )}

      {/* Expanded Accordion: Details, AI Card, Late Penalty */}
      {expanded && (
        <div className="space-y-4 pt-3 border-t border-gray animate-fade-in">
          {/* Submission Details */}
          {milestone.submission && (
            <div className="p-3.5 rounded-card bg-ivory border border-gray space-y-2 text-xs">
              <span className="font-heading font-semibold text-ink/60 uppercase tracking-wider block text-[10px]">
                Submission Information
              </span>
              <div className="flex items-center gap-4 flex-wrap font-mono">
                <span className="flex items-center gap-1 text-ink">
                  <GitCommit className="w-3.5 h-3.5 text-forest" />
                  Commit: <strong className="text-forest">{milestone.submission.commitSha?.slice(0, 8)}</strong>
                </span>
                {milestone.submission.prUrl && (
                  <a
                    href={milestone.submission.prUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-forest hover:underline"
                  >
                    View Pull Request &rarr;
                  </a>
                )}
              </div>
              {milestone.submission.notes && (
                <p className="text-ink/80 italic">{milestone.submission.notes}</p>
              )}
            </div>
          )}

          {/* Advisory AI Progress Card */}
          {milestone.aiReport && (
            <AiProgressCard
              aiReport={milestone.aiReport}
              requiredProgressBps={termsMilestone?.requiredProgressBps || 8000}
            />
          )}

          {/* Late Penalty Preview */}
          <LatePenaltyPreview
            milestone={milestone}
            terms={terms}
            deadlineSec={deadlineSec}
          />
        </div>
      )}

      {/* Submit Milestone Modal */}
      <SubmitMilestoneModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        milestone={milestone}
        terms={terms}
        agreementId={agreement.id}
        onchainId={onchainId}
        onSuccess={() => {
          setIsSubmitModalOpen(false);
          if (onMilestoneUpdated) onMilestoneUpdated();
        }}
      />

      {/* Reject Milestone Modal */}
      <RejectMilestoneModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        milestone={milestone}
        onchainId={onchainId}
        onSuccess={() => {
          setIsRejectModalOpen(false);
          if (onMilestoneUpdated) onMilestoneUpdated();
        }}
      />
    </Card>
  );
}
