import React, { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import { txRejectMilestone } from '../../chain/transactions.js';
import { useToast } from '../../context/ToastContext.jsx';
import { AlertTriangle } from 'lucide-react';

export default function RejectMilestoneModal({
  isOpen,
  onClose,
  onchainId,
  milestoneIdx,
  onSuccess
}) {
  const toast = useToast();
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

      await txRejectMilestone(onchainId || 1, milestoneIdx, reason.trim(), {
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
      title={`Reject Deliverable: Milestone #${milestoneIdx + 1}`}
    >
      <form onSubmit={handleReject} className="space-y-4">
        <div className="p-3.5 rounded-xl bg-amber-950/25 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold">Review Window Notice:</strong>
            <p className="text-slate-300 mt-0.5">
              If you take no action during the review window, the freelancer can claim auto-approval. Rejection requires anchoring an immutable cryptographic reason hash on-chain.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Reason for Rejection & Specific Deficiencies
          </label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why the deliverable failed acceptance criteria, missing tests, or reproducible bugs..."
            className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-400 resize-none"
            required
          />
        </div>

        <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" isLoading={isSubmitting}>
            Confirm Rejection On-Chain
          </Button>
        </div>
      </form>
    </Modal>
  );
}
