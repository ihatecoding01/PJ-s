import React, { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { submitMilestone as apiSubmitMilestone } from '../../api/milestones.js';
import { txSubmitMilestone } from '../../chain/transactions.js';
import { useToast } from '../../context/ToastContext.jsx';
import { GitCommit, Loader2, Bot, Sparkles, CheckCircle2 } from 'lucide-react';

export default function SubmitMilestoneModal({
  isOpen,
  onClose,
  milestone,
  terms,
  agreementId,
  onchainId,
  milestoneIdx: rawIdx,
  onSuccess
}) {
  const toast = useToast();
  const idx = milestone?.idx ?? rawIdx ?? 0;

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
      toast.info('Advisory AI service is inspecting GitHub commits, PRs, and test suites...');

      const submitRes = await apiSubmitMilestone(agreementId, idx, {
        commitSha: commitSha.trim(),
        prUrl: prUrl.trim(),
        notes: notes.trim()
      });

      const submissionHash = submitRes.submissionHash;

      // Step 2: Sign on-chain submitMilestone(id, idx, submissionHash, commitSha)
      setStatusStep('CHAIN_SIGNING');
      let toastId = null;

      await txSubmitMilestone(onchainId || 1, idx, submissionHash, commitSha.trim(), {
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

      toast.success(`Milestone #${idx + 1} successfully submitted! Client review window opened.`);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setStatusStep(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Submit Deliverable for Milestone #${idx + 1}`}
      subtitle="Submit verifiable Git commit SHAs and deliverable pull requests"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1">
            Commit SHA (40-char or 7-char hash) *
          </label>
          <div className="relative">
            <GitCommit className="w-4 h-4 text-forest absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={commitSha}
              onChange={(e) => setCommitSha(e.target.value)}
              placeholder="e.g. 9f83a45c81d2e0b5f1234567890abcdef1234567"
              className="w-full bg-white border border-gray rounded-[10px] pl-9 pr-3 py-2.5 text-xs font-mono text-ink placeholder:text-ink/40 focus:outline-none focus:border-forest"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1">
            Pull Request URL (Optional)
          </label>
          <input
            type="url"
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
            placeholder="https://github.com/org/repo/pull/4"
            className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2.5 text-xs text-ink placeholder:text-ink/40 focus:outline-none focus:border-forest"
          />
        </div>

        <div>
          <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1">
            Submission Notes & Verification Instructions
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe completed criteria, commands to run tests, and environment details..."
            className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2.5 text-xs text-ink placeholder:text-ink/40 focus:outline-none focus:border-forest"
          />
        </div>

        {/* Step Progression Indicators */}
        {statusStep && (
          <div className="p-3 rounded-card bg-sage/60 border border-forest/20 text-xs text-forest space-y-1">
            {statusStep === 'AI_ANALYZING' && (
              <div className="flex items-center gap-2 font-heading font-semibold">
                <Loader2 className="w-4 h-4 animate-spin text-forest" />
                <span>Step 1/2: Analyzing GitHub commits with advisory AI...</span>
              </div>
            )}
            {statusStep === 'CHAIN_SIGNING' && (
              <div className="flex items-center gap-2 font-heading font-semibold">
                <Loader2 className="w-4 h-4 animate-spin text-forest" />
                <span>Step 2/2: Signing milestone submission on-chain...</span>
              </div>
            )}
          </div>
        )}

        <div className="pt-3 border-t border-gray flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={Boolean(statusStep)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={Boolean(statusStep)}
            disabled={Boolean(statusStep)}
          >
            Submit for Review
          </Button>
        </div>
      </form>
    </Modal>
  );
}
