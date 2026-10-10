import React, { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import { txRaiseDispute } from '../../chain/transactions.js';
import { submitEvidence as apiSubmitEvidence } from '../../api/disputes.js';
import { useToast } from '../../context/ToastContext.jsx';
import { AlertOctagon, Paperclip } from 'lucide-react';

export default function RaiseDisputeModal({
  isOpen,
  onClose,
  agreementId,
  onchainId,
  milestoneIdx,
  onSuccess
}) {
  const toast = useToast();
  const [evidenceText, setEvidenceText] = useState('');
  const [fileSim, setFileSim] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRaise = async (e) => {
    e.preventDefault();
    if (!evidenceText.trim()) {
      toast.error('Evidence text is required');
      return;
    }

    try {
      setIsSubmitting(true);
      let toastId = null;

      // Step 1: On-chain raiseDispute with evidence hash
      await txRaiseDispute(onchainId || 1, milestoneIdx, evidenceText.trim(), {
        onPending: (hash) => {
          toastId = toast.pendingTx(hash, 'Raising dispute and locking milestone on-chain...');
        },
        onSuccess: (rec) => {
          if (toastId) toast.confirmedTx(toastId, rec.hash, 'Dispute raised! Arbitrators selected.');
        },
        onError: (err) => {
          if (toastId) toast.failedTx(toastId, err);
        }
      });

      // Step 2: Record evidence in backend
      await apiSubmitEvidence(agreementId, milestoneIdx, {
        text: evidenceText.trim(),
        files: fileSim ? [fileSim] : []
      });

      toast.success('Dispute initiated. 3 arbitrators have been assigned.');
      onClose();
      if (onSuccess) onSuccess();
      setEvidenceText('');
      setFileSim('');
    } catch (err) {
      toast.error(err.message || 'Failed to raise dispute');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Raise Dispute on Milestone #${milestoneIdx + 1}`}
    >
      <form onSubmit={handleRaise} className="space-y-4">
        <div className="p-3.5 rounded-xl bg-rose-950/25 border border-rose-500/35 text-rose-300 text-xs flex items-start gap-2">
          <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold">Arbitration Procedure:</strong>
            <p className="text-slate-300 mt-0.5">
              Raising a dispute freezes the milestone funds in escrow. Three decentralized arbitrators will be selected by the protocol to review evidence, examine AI advisory analysis, and cast binding votes on fund distribution.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Dispute Statement & Evidence
          </label>
          <textarea
            rows={5}
            value={evidenceText}
            onChange={(e) => setEvidenceText(e.target.value)}
            placeholder="Explain the breach of contract, missing deliverables, or disputed requirements with verifiable specifics..."
            className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-400 resize-none"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Attach Evidence Links / Files (optional)
          </label>
          <div className="flex items-center gap-2 bg-surface-800 border border-slate-700 rounded-xl px-3.5 py-2">
            <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={fileSim}
              onChange={(e) => setFileSim(e.target.value)}
              placeholder="IPFS CID, GitHub Issue link, or screenshot URL"
              className="w-full bg-transparent text-xs text-slate-100 focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" isLoading={isSubmitting}>
            Lock Funds & Raise Dispute On-Chain
          </Button>
        </div>
      </form>
    </Modal>
  );
}
