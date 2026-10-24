import React, { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { submitMilestone as apiSubmitMilestone } from '../../api/milestones.js';
import { txSubmitMilestone } from '../../chain/transactions.js';
import { useToast } from '../../context/ToastContext.jsx';
import { GitCommit, Loader2, Bot, Sparkles, CheckCircle2 } from 'lucide-react';
import GithubDeliverableModal from './GithubDeliverableModal.jsx';

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

  const [mode, setMode] = useState('code'); // 'code' | 'non_code'
  const [deliverableType, setDeliverableType] = useState('DESIGN');
  const [assetUrl, setAssetUrl] = useState('');
  const [deliverableContent, setDeliverableContent] = useState('');
  const [commitSha, setCommitSha] = useState('');
  const [prUrl, setPrUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [statusStep, setStatusStep] = useState(null); // 'AI_ANALYZING' | 'CHAIN_SIGNING' | null
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'code' && !commitSha.trim()) {
      toast.error('Commit SHA is required for code deliverables');
      return;
    }
    if (mode === 'non_code' && !assetUrl.trim() && !deliverableContent.trim()) {
      toast.error('Please provide an asset URL or deliverable content');
      return;
    }

    try {
      // Step 1: POST backend submit -> triggers AI analysis
      setStatusStep('AI_ANALYZING');
      if (mode === 'non_code') {
        toast.info('Advisory AI service is inspecting non-code deliverable criteria...');
      } else {
        toast.info('Advisory AI service is inspecting GitHub commits, PRs, and test suites...');
      }

      const activeCommitSha = mode === 'code' 
        ? commitSha.trim() 
        : (commitSha.trim() || '0000000000000000000000000000000000000000');

      const submitRes = await apiSubmitMilestone(agreementId, idx, {
        commitSha: activeCommitSha,
        prUrl: prUrl.trim(),
        notes: notes.trim(),
        deliverableType: mode === 'non_code' ? deliverableType : 'CODE',
        deliverableContent: mode === 'non_code' ? deliverableContent.trim() : undefined,
        assetUrl: mode === 'non_code' ? assetUrl.trim() : undefined,
      });

      const submissionHash = submitRes.submissionHash;

      // Step 2: Sign on-chain submitMilestone(id, idx, submissionHash, commitSha)
      setStatusStep('CHAIN_SIGNING');
      let toastId = null;

      await txSubmitMilestone(onchainId || 1, idx, submissionHash, activeCommitSha, {
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
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Submit Deliverable for Milestone #${idx + 1}`}
        subtitle="Submit verifiable Git commit SHAs or multimodal non-code assets"
        maxWidth="max-w-md"
      >
        {/* Mode Selector Tabs */}
        <div className="flex border-b border-gray mb-4">
          <button
            type="button"
            onClick={() => setMode('code')}
            className={`pb-2 px-3 text-xs font-heading font-semibold transition-colors border-b-2 ${
              mode === 'code'
                ? 'border-forest text-forest'
                : 'border-transparent text-ink/50 hover:text-ink'
            }`}
          >
            Code (Git Repository)
          </button>
          <button
            type="button"
            onClick={() => setMode('non_code')}
            className={`pb-2 px-3 text-xs font-heading font-semibold transition-colors border-b-2 ${
              mode === 'non_code'
                ? 'border-forest text-forest'
                : 'border-transparent text-ink/50 hover:text-ink'
            }`}
          >
            Design & Non-Code (Figma, Docs, Live)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'code' ? (
            <>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70">
                    Commit SHA (40-char or 7-char hash) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsGithubModalOpen(true)}
                    className="text-[11px] font-heading font-semibold text-forest hover:underline inline-flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-coral" /> Select from GitHub
                  </button>
                </div>
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
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1">
                  Deliverable Type *
                </label>
                <select
                  value={deliverableType}
                  onChange={(e) => setDeliverableType(e.target.value)}
                  className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:border-forest font-heading"
                >
                  <option value="DESIGN">Design & Prototype (Figma / Penpot / Specs)</option>
                  <option value="DOCUMENT">Documentation & Architecture (PDF / Notion)</option>
                  <option value="LIVE_DEMO">Live Deployment / Staging URL</option>
                  <option value="AUDIO_VIDEO">Video Walkthrough & Presentation</option>
                  <option value="OTHER">Other Structured Deliverable</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1">
                  Deliverable URL (Figma, Notion, Loom, Staging link)
                </label>
                <input
                  type="url"
                  value={assetUrl}
                  onChange={(e) => setAssetUrl(e.target.value)}
                  placeholder="https://www.figma.com/file/... or https://notion.so/..."
                  className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2.5 text-xs text-ink placeholder:text-ink/40 focus:outline-none focus:border-forest"
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1">
                  Deliverable Content & Verification Highlights
                </label>
                <textarea
                  rows={2}
                  value={deliverableContent}
                  onChange={(e) => setDeliverableContent(e.target.value)}
                  placeholder="Paste deliverable outline, key features, or Figma page sections to review..."
                  className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2.5 text-xs text-ink placeholder:text-ink/40 focus:outline-none focus:border-forest"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1">
              Submission Notes & Context
            </label>
            <textarea
              rows={2}
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
                  <span>
                    {mode === 'non_code'
                      ? 'Step 1/2: Verifying multimodal criteria with advisory AI...'
                      : 'Step 1/2: Analyzing GitHub commits with advisory AI...'}
                  </span>
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

    <GithubDeliverableModal
      isOpen={isGithubModalOpen}
      onClose={() => setIsGithubModalOpen(false)}
      repoUrl={terms?.github?.repoUrl || 'https://github.com/fairwork-platform/project-escrow'}
      onSelectCommit={({ commitSha: sha, prUrl: url }) => {
        setCommitSha(sha);
        if (url) setPrUrl(url);
      }}
    />
  </>
  );
}
