import React, { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import { txProposeAmendment } from '../../chain/transactions.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';

export default function ProposeAmendmentModal({
  isOpen,
  onClose,
  agreement,
  onSuccess
}) {
  const toast = useToast();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [newDeadlineDate, setNewDeadlineDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const milestones = agreement?.terms?.milestones || [];

  const handlePropose = async (e) => {
    e.preventDefault();
    if (!newDeadlineDate) {
      toast.error('Please select new deadline');
      return;
    }

    const newDeadlineSec = Math.floor(new Date(newDeadlineDate).getTime() / 1000);
    if (newDeadlineSec <= Math.floor(Date.now() / 1000)) {
      toast.warning('New deadline must be in the future');
      return;
    }

    try {
      setIsSubmitting(true);
      let toastId = null;

      // Create new terms clone with updated deadline
      const updatedTerms = JSON.parse(JSON.stringify(agreement.terms));
      updatedTerms.milestones[selectedIdx].deadline = new Date(newDeadlineSec * 1000).toISOString();

      await txProposeAmendment(
        agreement.onchainId || 1,
        selectedIdx,
        newDeadlineSec,
        updatedTerms,
        '',
        {
          onPending: (hash) => {
            toastId = toast.pendingTx(hash, 'Proposing deadline amendment on-chain...');
          },
          onSuccess: (rec) => {
            if (toastId) toast.confirmedTx(toastId, rec.hash, 'Amendment proposed on-chain!');
          },
          onError: (err) => {
            if (toastId) toast.failedTx(toastId, err);
          }
        }
      );

      toast.success('Amendment proposed! Awaiting counterparty acceptance.');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.message || 'Failed to propose amendment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Propose Milestone Deadline Amendment"
    >
      <form onSubmit={handlePropose} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Select Milestone to Amend
          </label>
          <select
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
            className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-400"
          >
            {milestones.map((m, i) => (
              <option key={i} value={i}>
                Milestone #{i + 1}: {m.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Proposed New Deadline
          </label>
          <div className="flex items-center gap-2 bg-surface-800 border border-slate-700 rounded-xl px-3.5 py-2.5">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="datetime-local"
              value={newDeadlineDate}
              onChange={(e) => setNewDeadlineDate(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-100 focus:outline-none"
              required
            />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/30 text-xs text-indigo-300">
          The counterparty will see a pending amendment banner. If accepted, the smart contract updates the deadline without recalculating penalties prior to the amendment.
        </div>

        <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Propose Amendment On-Chain
          </Button>
        </div>
      </form>
    </Modal>
  );
}
