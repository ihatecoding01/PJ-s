import React, { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import { submitMilestone as apiSubmitMilestone } from '../../api/milestones.js';
import { txSubmitMilestone } from '../../chain/transactions.js';
import { useToast } from '../../context/ToastContext.jsx';
import { GitCommit, Loader2, Bot, Sparkles, CheckCircle2 } from 'lucide-react';

export default function SubmitMilestoneModal({
  isOpen,
  onClose,
  agreementId,
  onchainId,
  milestoneIdx,
  milestoneTitle,
  onSuccess
}) {
  const toast = useToast();

  const [commitSha, setCommitSha] = useState('');
  const [prUrl, setPrUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [statusStep, setStatusStep] = useState(null); // 'AI_ANALYZING' | 'CHAIN_SIGNING' | null

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!commitSha.trim()) {
      toast.error('Commit SHA is required');
      return;
    }

    try {
      // Step 1: POST backend submit -> triggers AI GitHub analysis
      setStatusStep('AI_ANALYZING');
      toast.info('AI service is inspecting GitHub commits, PRs, and test suites...');

      const submitRes = await apiSubmitMilestone(agreementId, milestoneIdx, {
        commitSha: commitSha.trim(),
        prUrl: prUrl.trim(),
        notes: notes.trim()
      });

      const submissionHash = submitRes.submissionHash;

      // Step 2: Sign on-chain submitMilestone(id, idx, submissionHash, commitSha)
      setStatusStep('CHAIN_SIGNING');
      let toastId = null;

      await txSubmitMilestone(onchainId || 1, milestoneIdx, submissionHash, commitSha.trim(), {
        onPending: (hash) => {
          toastId = toast.pendingTx(hash, 'Recording milestone submission on-chain...');
        },
        onSuccess: (rec) => {
          if (toastId) toast.confirmedTx(toastId, rec.hash, 'Milestone submitted on-chain!');
        },
        onError: (err) => {
          if (toastId) toast.failedTx(toastId, err);
        }
      });

      toast.success('Milestone submitted! AI progress recorded and review window opened.');
      onClose();
      if (onSuccess) onSuccess(submitRes);
      setCommitSha('');
      setPrUrl('');
      setNotes('');
    } catch (err) {
      toast.error(err.message || 'Milestone submission failed');
    } finally {
      setStatusStep(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Submit Deliverable: Milestone #${milestoneIdx + 1}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {statusStep === 'AI_ANALYZING' && (
          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/40 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
            <h5 className="text-xs font-bold text-slate-100">AI Service Analyzing GitHub Signals</h5>
            <p className="text-[11px] text-slate-400">
              Evaluating diffs, test coverage, and acceptance criteria against commit {commitSha.substring(0, 7)}...
            </p>
          </div>
        )}

        {statusStep === 'CHAIN_SIGNING' && (
          <div className="p-4 rounded-xl bg-teal-950/30 border border-teal-500/40 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-teal-400 mx-auto" />
            <h5 className="text-xs font-bold text-slate-100">Awaiting Wallet Signature</h5>
            <p className="text-[11px] text-slate-400">
              Confirm the on-chain submitMilestone transaction in your wallet.
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Git Commit SHA <span className="text-rose-400">*</span>
          </label>
          <div className="flex items-center gap-2 bg-surface-800 border border-slate-700 rounded-xl px-3.5 py-2.5">
            <GitCommit className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={commitSha}
              onChange={(e) => setCommitSha(e.target.value)}
              placeholder="e.g. 9f8b3c1a2d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a"
              className="w-full bg-transparent text-sm text-slate-100 font-mono placeholder-slate-500 focus:outline-none"
              required
              disabled={Boolean(statusStep)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            GitHub PR URL (optional)
          </label>
          <input
            type="url"
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
            placeholder="https://github.com/org/repo/pull/42"
            className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400"
            disabled={Boolean(statusStep)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Submission Notes & Verification Instructions
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Instructions for testing, deployed staging preview links, or test credentials..."
            className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400 resize-none"
            disabled={Boolean(statusStep)}
          />
        </div>

        <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={Boolean(statusStep)}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={Boolean(statusStep)}
            disabled={Boolean(statusStep)}
          >
            Run AI & Submit On-Chain
          </Button>
        </div>
      </form>
    </Modal>
  );
}
