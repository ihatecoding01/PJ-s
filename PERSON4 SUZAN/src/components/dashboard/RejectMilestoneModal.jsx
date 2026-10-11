import React, { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { txRejectMilestone } from '../../chain/transactions.js';
import { useToast } from '../../context/ToastContext.jsx';
import { AlertTriangle } from 'lucide-react';

export default function RejectMilestoneModal({
  isOpen,
  onClose,
  milestone,
  onchainId,
  milestoneIdx: rawIdx,
  onSuccess
}) {
  const toast = useToast();
  const idx = milestone?.idx ?? rawIdx ?? 0;
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      maxWidth="max-w-md"
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
          <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1.5">
            Reason for Rejection & Specific Deficiencies
          </label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why the deliverable failed acceptance criteria, missing tests, or reproducible bugs..."
            className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2.5 text-xs text-ink placeholder:text-ink/40 focus:outline-none focus:border-forest resize-none"
            required
          />
        </div>

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
