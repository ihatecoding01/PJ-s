import React, { useState, useEffect } from 'react';
import { getAgreement, updateAgreementTerms, approveDraft } from '../api/agreements.js';
import { useWallet } from '../context/WalletContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import AddressBadge from '../components/common/AddressBadge.jsx';
import Badge from '../components/common/Badge.jsx';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import { canonicalHash } from '../lib/canonicalHash.js';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HelpCircle,
  Plus,
  Trash2,
  Save,
  ArrowRight,
  Github,
  Coins,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';

export default function DraftPage({ agreementId, onProceedToWizard }) {
  const { address } = useWallet();
  const toast = useToast();

  const [agreement, setAgreement] = useState(null);
  const [terms, setTerms] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const fetchAgreementData = async () => {
    if (!agreementId) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await getAgreement(agreementId);
      setAgreement(data);
      setTerms(JSON.parse(JSON.stringify(data.terms)));
      setHasUnsavedChanges(false);
    } catch (err) {
      console.warn('Could not load draft:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (agreementId) {
      fetchAgreementData();
    } else {
      setIsLoading(false);
    }
  }, [agreementId]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center text-slate-400">
        Loading agreement draft...
      </div>
    );
  }

  if (!agreement || !terms) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center text-teal-400">
          <FileText className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-100">No Draft Selected</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            You can generate a draft agreement from any AI chat consultation or view pending drafts in your agreements list.
          </p>
        </div>
      </div>
    );
  }

  const isClient = address && terms.client && address.toLowerCase() === terms.client.toLowerCase();
  const isFreelancer = address && terms.freelancer && address.toLowerCase() === terms.freelancer.toLowerCase();
  const myApproval = isClient ? agreement.clientApproved : isFreelancer ? agreement.freelancerApproved : false;
  const bothApproved = agreement.clientApproved && agreement.freelancerApproved;

  // Recalculate total amount when milestones change
  const handleMilestoneChange = (idx, field, val) => {
    const updatedMs = [...terms.milestones];
    updatedMs[idx] = { ...updatedMs[idx], [field]: val };

    let newTotal = 0;
    for (const m of updatedMs) {
      newTotal += parseFloat(m.amount) || 0;
    }

    setTerms(prev => ({
      ...prev,
      milestones: updatedMs,
      totalAmount: newTotal.toFixed(4).replace(/\.?0+$/, '')
    }));
    setHasUnsavedChanges(true);
  };

  const handleAddMilestone = () => {
    const newIdx = terms.milestones.length;
    const newM = {
      index: newIdx,
      title: `Milestone ${newIdx + 1}`,
      description: 'New deliverable',
      amount: '0.5',
      deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      requiredProgressBps: 8000,
      acceptanceCriteria: ['Acceptance criterion 1']
    };
    const updatedMs = [...terms.milestones, newM];
    let newTotal = 0;
    for (const m of updatedMs) newTotal += parseFloat(m.amount) || 0;

    setTerms(prev => ({
      ...prev,
      milestones: updatedMs,
      totalAmount: newTotal.toFixed(4).replace(/\.?0+$/, '')
    }));
    setHasUnsavedChanges(true);
  };

  const handleRemoveMilestone = (idx) => {
    if (terms.milestones.length <= 1) {
      toast.warning('Agreement must contain at least one milestone');
      return;
    }
    const updatedMs = terms.milestones.filter((_, i) => i !== idx).map((m, i) => ({ ...m, index: i }));
    let newTotal = 0;
    for (const m of updatedMs) newTotal += parseFloat(m.amount) || 0;

    setTerms(prev => ({
      ...prev,
      milestones: updatedMs,
      totalAmount: newTotal.toFixed(4).replace(/\.?0+$/, '')
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveTerms = async () => {
    try {
      setIsSaving(true);
      const updated = await updateAgreementTerms(agreement.id, terms);
      setAgreement(updated);
      setTerms(JSON.parse(JSON.stringify(updated.terms)));
      setHasUnsavedChanges(false);
      toast.success('Terms updated successfully! Both parties must re-approve.');
    } catch (err) {
      toast.error(err.message || 'Failed to update terms');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (hasUnsavedChanges) {
      toast.warning('Please save terms changes before approving');
      return;
    }

    try {
      setIsApproving(true);
      const updated = await approveDraft(agreement.id);
      setAgreement(updated);
      toast.success('Draft approved!');
      if (updated.clientApproved && updated.freelancerApproved) {
        toast.success('Both parties approved! Ready for on-chain creation.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to approve draft');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-teal-400 uppercase tracking-wider font-semibold">
              Draft Agreement #{agreement.id}
            </span>
            <Badge label={agreement.status} variant={agreement.status} size="sm" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">{terms.title}</h1>
        </div>

        <div className="flex items-center gap-3">
          {bothApproved ? (
            <Button
              variant="primary"
              onClick={() => onProceedToWizard(agreement.id)}
              icon={ArrowRight}
              className="shadow-glow-teal"
            >
              Proceed to On-Chain Escrow
            </Button>
          ) : (
            <>
              {hasUnsavedChanges && (
                <Button
                  variant="secondary"
                  onClick={handleSaveTerms}
                  isLoading={isSaving}
                  icon={Save}
                >
                  Save Edits
                </Button>
              )}
              <Button
                variant={myApproval ? 'secondary' : 'primary'}
                onClick={handleApprove}
                isLoading={isApproving}
                disabled={myApproval || (!isClient && !isFreelancer)}
                icon={CheckCircle2}
              >
                {myApproval ? 'You Have Approved' : 'Approve Draft Terms'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Warning & Approval States */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Client approval card */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          agreement.clientApproved
            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
            : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
        }`}>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider">Client Approval</div>
            <AddressBadge address={terms.client} chars={3} showExplorer={false} className="mt-1" />
          </div>
          {agreement.clientApproved ? (
            <span className="flex items-center gap-1 text-xs font-bold bg-emerald-500/20 px-2 py-1 rounded">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Approved
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium bg-amber-500/20 px-2 py-1 rounded">
              <Clock className="w-4 h-4 text-amber-400" /> Pending
            </span>
          )}
        </div>

        {/* Freelancer approval card */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          agreement.freelancerApproved
            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
            : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
        }`}>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider">Freelancer Approval</div>
            <AddressBadge address={terms.freelancer} chars={3} showExplorer={false} className="mt-1" />
          </div>
          {agreement.freelancerApproved ? (
            <span className="flex items-center gap-1 text-xs font-bold bg-emerald-500/20 px-2 py-1 rounded">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Approved
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium bg-amber-500/20 px-2 py-1 rounded">
              <Clock className="w-4 h-4 text-amber-400" /> Pending
            </span>
          )}
        </div>

        {/* Edit Reset Warning */}
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 text-rose-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <strong className="font-semibold">Edits reset approvals:</strong>
            <p className="text-slate-300 mt-0.5">
              Any change made to terms recalculates the canonical hash and requires fresh signatures from both parties.
            </p>
          </div>
        </div>
      </div>

      {/* AI Flags & Open Questions */}
      {(agreement.openQuestions?.length > 0 || agreement.warnings?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agreement.openQuestions?.length > 0 && (
            <div className="p-4 rounded-xl bg-indigo-950/25 border border-indigo-500/30 space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                AI Open Questions for Clarification
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                {agreement.openQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          {agreement.warnings?.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-950/25 border border-amber-500/30 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                AI Protocol Warnings
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                {agreement.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* General Agreement Parameters Form */}
      <Card className="space-y-6">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Layers className="w-4 h-4 text-teal-400" />
          Agreement Scope & Escrow Settings
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Payment Mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Payment Mode</label>
            <div className="grid grid-cols-2 gap-1.5 bg-surface-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setTerms(p => ({ ...p, paymentMode: 'MILESTONE' }));
                  setHasUnsavedChanges(true);
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors ${
                  terms.paymentMode === 'MILESTONE'
                    ? 'bg-teal-500/20 text-teal-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                MILESTONE
              </button>
              <button
                type="button"
                onClick={() => {
                  setTerms(p => ({ ...p, paymentMode: 'LUMP_SUM' }));
                  setHasUnsavedChanges(true);
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors ${
                  terms.paymentMode === 'LUMP_SUM'
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                LUMP_SUM
              </button>
            </div>
          </div>

          {/* Total Budget */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Total Escrow Budget</label>
            <div className="flex items-center gap-2 bg-surface-800 px-3.5 py-2 rounded-xl border border-slate-700 text-teal-300 font-mono font-bold text-sm">
              <Coins className="w-4 h-4 text-teal-400" />
              <span>{terms.totalAmount} MATIC</span>
            </div>
          </div>

          {/* GitHub Repo */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">GitHub Repo URL</label>
            <div className="flex items-center gap-2 bg-surface-800 px-3 py-1.5 rounded-xl border border-slate-700">
              <Github className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={terms.github?.repoUrl || ''}
                onChange={(e) => {
                  setTerms(p => ({ ...p, github: { ...p.github, repoUrl: e.target.value } }));
                  setHasUnsavedChanges(true);
                }}
                className="w-full bg-transparent text-xs text-slate-100 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Late Penalty Per Day */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Late Penalty Bps/Day ({((terms.latePenaltyBpsPerDay || 100) / 100).toFixed(1)}%/day)
            </label>
            <input
              type="number"
              value={terms.latePenaltyBpsPerDay || 100}
              onChange={(e) => {
                setTerms(p => ({ ...p, latePenaltyBpsPerDay: Number(e.target.value) }));
                setHasUnsavedChanges(true);
              }}
              className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
            />
          </div>

          {/* Max Late Penalty */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Max Penalty Bps (Cap: {((terms.maxLatePenaltyBps || 3000) / 100).toFixed(0)}%)
            </label>
            <input
              type="number"
              value={terms.maxLatePenaltyBps || 3000}
              onChange={(e) => {
                setTerms(p => ({ ...p, maxLatePenaltyBps: Number(e.target.value) }));
                setHasUnsavedChanges(true);
              }}
              className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
            />
          </div>

          {/* Review Window & Grace Days */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Review Window ({terms.reviewWindowDays}d) / Grace ({terms.graceDays}d)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={terms.reviewWindowDays || 5}
                onChange={(e) => {
                  setTerms(p => ({ ...p, reviewWindowDays: Number(e.target.value) }));
                  setHasUnsavedChanges(true);
                }}
                className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
              />
              <input
                type="number"
                value={terms.graceDays || 3}
                onChange={(e) => {
                  setTerms(p => ({ ...p, graceDays: Number(e.target.value) }));
                  setHasUnsavedChanges(true);
                }}
                className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Milestones Editor Table */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-100">Milestone Breakdown</h3>
            <p className="text-xs text-slate-400">Specify deliverables, payouts, and automated acceptance criteria.</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddMilestone}
            icon={Plus}
          >
            Add Milestone
          </Button>
        </div>

        <div className="space-y-4">
          {terms.milestones.map((m, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-surface-850/60 border border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-300 font-mono text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={m.title}
                    onChange={(e) => handleMilestoneChange(idx, 'title', e.target.value)}
                    className="bg-transparent font-bold text-sm text-slate-100 focus:outline-none border-b border-transparent focus:border-teal-400 px-1"
                    placeholder="Milestone Title"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-slate-400">Amount:</span>
                    <input
                      type="text"
                      value={m.amount}
                      onChange={(e) => handleMilestoneChange(idx, 'amount', e.target.value)}
                      className="w-16 bg-surface-800 border border-slate-700 rounded px-2 py-1 text-xs text-teal-300 font-mono font-bold text-right"
                    />
                    <span className="text-slate-400 font-mono">MATIC</span>
                  </div>

                  <button
                    onClick={() => handleRemoveMilestone(idx)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Remove milestone"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Description */}
              <input
                type="text"
                value={m.description}
                onChange={(e) => handleMilestoneChange(idx, 'description', e.target.value)}
                placeholder="Scope details for this milestone..."
                className="w-full bg-surface-800 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
              />

              {/* Acceptance Criteria */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Acceptance Criteria (evaluated by AI)
                </span>
                <input
                  type="text"
                  value={(m.acceptanceCriteria || []).join('; ')}
                  onChange={(e) => {
                    const list = e.target.value.split(';').map(s => s.trim()).filter(Boolean);
                    handleMilestoneChange(idx, 'acceptanceCriteria', list);
                  }}
                  placeholder="Separate criteria with semicolons: e.g. Pass lint; Unit tests >80%; PR merged"
                  className="w-full bg-surface-800 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none font-mono"
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
