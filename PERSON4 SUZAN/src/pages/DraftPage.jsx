import React, { useState, useEffect } from 'react';
import { getAgreement, updateAgreementTerms, approveDraft, planFromBrief, auditAgreement } from '../api/agreements.js';
import { useWallet } from '../context/WalletContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Card, Button, Badge, AmountDisplay, Modal, Input, Textarea } from '../components/ui/index.js';
import AddressChip from '../components/ui/AddressChip.jsx';
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
  ShieldCheck,
  Layers,
  Sparkles,
  Cpu,
  RefreshCw,
  Check
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
  const [availableDrafts, setAvailableDrafts] = useState([]);

  // Feature 1: Brief-to-Plan Generator state
  const [isBriefModalOpen, setIsBriefModalOpen] = useState(false);
  const [briefText, setBriefText] = useState('');
  const [briefBudget, setBriefBudget] = useState('1.5');
  const [briefCurrency, setBriefCurrency] = useState('ETH');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planRationale, setPlanRationale] = useState('');
  const [suggestedTechStack, setSuggestedTechStack] = useState([]);

  // Feature 2: Agreement Clarity Linter & Pre-Lock Risk Auditor state
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const fetchAgreementData = async (targetId = agreementId) => {
    try {
      setIsLoading(true);
      let data = null;
      if (targetId) {
        data = await getAgreement(targetId);
      }

      // Fetch user agreements to identify all available drafts
      let all = [];
      try {
        all = await getAgreements();
      } catch {}

      const allList = Array.isArray(all) ? all : [];
      const draftsList = allList.filter((a) => {
        const s = String(a.status || '').toUpperCase();
        return s === 'DRAFT' || s === 'CLIENT_APPROVED' || s === 'FREELANCER_APPROVED';
      });
      setAvailableDrafts(draftsList.length > 0 ? draftsList : allList);

      if (!data && draftsList.length > 0) {
        // Pick matching draft or most recently created
        data = draftsList.find(d => d.id === targetId || d.agreementId === targetId) || draftsList[0];
      } else if (!data && allList.length > 0) {
        data = allList[0];
      }

      if (data) {
        let parsed = data.terms;
        if (!parsed && data.termsJson) {
          try {
            parsed = JSON.parse(data.termsJson);
          } catch {}
        }
        if (parsed) {
          setAgreement(data);
          setTerms(typeof parsed === 'string' ? JSON.parse(parsed) : JSON.parse(JSON.stringify(parsed)));
          setHasUnsavedChanges(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Could not load draft:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgreementData(agreementId);
  }, [agreementId]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-ink/60 space-y-3">
        <div className="w-8 h-8 mx-auto border-2 border-forest border-t-transparent rounded-full animate-spin" />
        <p className="font-heading font-medium text-sm">Loading escrow agreement draft...</p>
      </div>
    );
  }

  if (!agreement || !terms) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-card bg-sage flex items-center justify-center text-forest">
          <FileText className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-heading font-bold text-ink">No Draft Selected</h2>
          <p className="text-sm text-ink/60 max-w-md mx-auto">
            You can generate a draft agreement from any AI chat consultation, accept a community proposal, or use the Brief-to-Plan Generator below.
          </p>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={() => setIsBriefModalOpen(true)}
            icon={Sparkles}
          >
            Generate Plan from AI Brief
          </Button>

          {availableDrafts.length > 0 && (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => fetchAgreementData()}
              icon={RefreshCw}
            >
              Refresh Drafts
            </Button>
          )}
        </div>

        {availableDrafts.length > 0 && (
          <div className="max-w-lg mx-auto space-y-3 text-left pt-4">
            <h4 className="text-xs font-heading font-semibold text-ink/70 uppercase tracking-wider text-center">
              Available Pending Drafts ({availableDrafts.length})
            </h4>
            <div className="space-y-2">
              {availableDrafts.map((d) => (
                <div
                  key={d.id}
                  className="p-3.5 bg-white border border-gray hover:border-forest rounded-card flex items-center justify-between gap-3 transition-all cursor-pointer shadow-xs"
                  onClick={() => fetchAgreementData(d.id)}
                >
                  <div>
                    <div className="font-heading font-bold text-xs text-ink">{d.title || 'Escrow Agreement Draft'}</div>
                    <div className="text-[10px] text-ink/50 font-mono mt-0.5">ID: {d.id} · Status: {d.status}</div>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs py-1 px-3">
                    Load Draft
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal on empty state */}
        <Modal
          isOpen={isBriefModalOpen}
          onClose={() => setIsBriefModalOpen(false)}
          title="Autonomous Brief-to-Plan Generator"
          subtitle="Provide a high-level goal and let AI decompose it into verifiable milestones."
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleGenerateFromBrief} className="space-y-4 text-left">
            <Textarea
              label="Project Goal / Brief"
              placeholder="e.g. Build an on-chain NFT ticketing dApp with QR verification, organizer dashboard, and Polygon smart contract escrow..."
              value={briefText}
              onChange={(e) => setBriefText(e.target.value)}
              rows={4}
              required
              helperText="Describe what you want built. The AI will calculate milestones with testable criteria."
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Total Budget"
                type="number"
                step="0.01"
                value={briefBudget}
                onChange={(e) => setBriefBudget(e.target.value)}
                placeholder="1.5"
                required
              />
              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5 font-heading">
                  Currency
                </label>
                <select
                  value={briefCurrency}
                  onChange={(e) => setBriefCurrency(e.target.value)}
                  className="w-full bg-white text-ink border border-gray rounded-[10px] px-3.5 py-2.5 text-sm focus:outline-none focus:border-forest"
                >
                  <option value="ETH">ETH</option>
                  <option value="MATIC">MATIC (Polygon)</option>
                  <option value="USDC">USDC</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-sage/30 rounded-card border border-forest/10 text-xs text-ink/70 space-y-1">
              <p className="font-semibold text-forest">💡 Pro Tip:</p>
              <p>The AI will calculate milestone amounts, establish sequential delivery dates, and formulate concrete GitHub verification criteria.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsBriefModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={isGeneratingPlan}
                icon={Sparkles}
              >
                Generate Autonomous Plan
              </Button>
            </div>
          </form>
        </Modal>
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
      description: 'Deliverable specification',
      amount: '0.5',
      deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      requiredProgressBps: 8000,
      acceptanceCriteria: ['Pass automated test suite']
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

  const handleCriterionChange = (mIdx, cIdx, val) => {
    const updatedMs = [...terms.milestones];
    const m = { ...updatedMs[mIdx] };
    const crits = [...(m.acceptanceCriteria || m.deliverables || [])];
    crits[cIdx] = val;
    m.acceptanceCriteria = crits;
    m.deliverables = crits;
    updatedMs[mIdx] = m;
    setTerms(prev => ({ ...prev, milestones: updatedMs }));
    setHasUnsavedChanges(true);
  };

  const handleAddCriterion = (mIdx) => {
    const updatedMs = [...terms.milestones];
    const m = { ...updatedMs[mIdx] };
    const crits = [...(m.acceptanceCriteria || m.deliverables || []), 'New testable deliverable specification'];
    m.acceptanceCriteria = crits;
    m.deliverables = crits;
    updatedMs[mIdx] = m;
    setTerms(prev => ({ ...prev, milestones: updatedMs }));
    setHasUnsavedChanges(true);
  };

  const handleRemoveCriterion = (mIdx, cIdx) => {
    const updatedMs = [...terms.milestones];
    const m = { ...updatedMs[mIdx] };
    const crits = (m.acceptanceCriteria || m.deliverables || []).filter((_, i) => i !== cIdx);
    if (crits.length === 0) {
      toast.warning('Each milestone must have at least one acceptance criterion');
      return;
    }
    m.acceptanceCriteria = crits;
    m.deliverables = crits;
    updatedMs[mIdx] = m;
    setTerms(prev => ({ ...prev, milestones: updatedMs }));
    setHasUnsavedChanges(true);
  };

  const handleRunAudit = async (customTerms = null) => {
    try {
      setIsAuditing(true);
      const termsToAudit = customTerms || terms;
      const res = await auditAgreement(agreement?.id, termsToAudit);
      const data = res.data || res;
      setAuditResult(data);
      setIsAuditModalOpen(true);
      if (data.fairness_score >= 80) {
        toast.success(`Clarity Audit: High score ${data.fairness_score}/100!`);
      } else if (data.fairness_score >= 60) {
        toast.info(`Clarity Audit: Score ${data.fairness_score}/100 with recommendations.`);
      } else {
        toast.warning(`Clarity Audit: Score ${data.fairness_score}/100. Critical issues detected.`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to complete clarity audit');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleApplyRewrite = (flag) => {
    if (!flag || !flag.suggested_rewrite) return;

    // Check if it's a milestone criterion: e.g. milestones[0].acceptanceCriteria[1]
    const mMatch = flag.clause.match(/milestones\[(\d+)\]\.acceptanceCriteria\[(\d+)\]/);
    if (mMatch) {
      const mIdx = parseInt(mMatch[1], 10);
      const cIdx = parseInt(mMatch[2], 10);

      const updatedMs = [...terms.milestones];
      const m = { ...updatedMs[mIdx] };
      const crits = [...(m.acceptanceCriteria || m.deliverables || [])];
      crits[cIdx] = flag.suggested_rewrite;
      m.acceptanceCriteria = crits;
      m.deliverables = crits;
      updatedMs[mIdx] = m;

      setTerms(prev => ({ ...prev, milestones: updatedMs }));
      setHasUnsavedChanges(true);
      toast.success(`Applied objective rewrite to Milestone ${mIdx + 1} criterion!`);
    } else if (flag.clause === 'latePenaltyBpsPerDay') {
      const val = parseInt(flag.suggested_rewrite, 10) || 100;
      setTerms(prev => ({ ...prev, latePenaltyBpsPerDay: val }));
      setHasUnsavedChanges(true);
      toast.success('Updated daily late penalty to standard rate');
    } else if (flag.clause === 'maxLatePenaltyBps') {
      const val = parseInt(flag.suggested_rewrite, 10) || 3000;
      setTerms(prev => ({ ...prev, maxLatePenaltyBps: val }));
      setHasUnsavedChanges(true);
      toast.success('Updated max late penalty cap');
    } else if (flag.clause === 'github.repoUrl') {
      setTerms(prev => ({
        ...prev,
        github: { ...prev.github, repoUrl: flag.suggested_rewrite }
      }));
      setHasUnsavedChanges(true);
      toast.success('Updated GitHub repository URL');
    } else if (flag.clause === 'reviewWindowDays') {
      const val = parseInt(flag.suggested_rewrite, 10) || 5;
      setTerms(prev => ({ ...prev, reviewWindowDays: val }));
      setHasUnsavedChanges(true);
      toast.success('Updated review window');
    }

    // Remove this flag from active auditResult and re-calculate score
    if (auditResult && auditResult.flags) {
      const updatedFlags = auditResult.flags.filter(f => f !== flag);
      let deductions = 0;
      for (const f of updatedFlags) {
        if (f.severity === 'CRITICAL') deductions += 15;
        else if (f.severity === 'WARNING') deductions += 9;
        else deductions += 3;
      }
      const newScore = Math.max(20, Math.min(100, 98 - deductions));
      setAuditResult(prev => ({
        ...prev,
        fairness_score: newScore,
        flags: updatedFlags,
        summary: updatedFlags.length === 0
          ? 'All flagged ambiguities resolved! Contract terms are balanced and ready for escrow lock.'
          : `Clarity audit updated: ${updatedFlags.length} remaining recommendation(s). Score: ${newScore}/100.`
      }));
    }
  };

  const handleSaveTerms = async () => {
    try {
      setIsSaving(true);
      await updateAgreementTerms(agreement.id, terms);
      setHasUnsavedChanges(false);
      await fetchAgreementData();
      toast.success('Terms saved! Previous approvals have been reset.');
    } catch (err) {
      toast.error(err.message || 'Failed to save terms');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (hasUnsavedChanges) {
      toast.warning('Please save changes before approving');
      return;
    }
    try {
      setIsApproving(true);
      const res = await approveDraft(agreement.id);
      setAgreement(res);
      toast.success('You have approved this draft!');
      if (res.clientApproved && res.freelancerApproved) {
        toast.success('Mutual approval complete! Terms are now locked.');
      }
    } catch (err) {
      toast.error(err.message || 'Approval failed');
    } finally {
      setIsApproving(false);
    }
  };

  const handleGenerateFromBrief = async (e) => {
    if (e) e.preventDefault();
    if (!briefText.trim()) {
      toast.warning('Please enter a project brief or goal');
      return;
    }
    try {
      setIsGeneratingPlan(true);
      toast.info('Autonomous AI is analyzing project brief & synthesizing milestone plan...');
      const res = await planFromBrief({
        brief: briefText.trim(),
        totalBudget: parseFloat(briefBudget) || 1.0,
        currency: briefCurrency || 'ETH',
        clientAddress: address || '0x1111111111111111111111111111111111111111',
      });
      const createdAg = res.agreement || res.data?.agreement || res;
      setAgreement(createdAg);
      const parsedTerms = typeof createdAg.termsJson === 'string'
        ? JSON.parse(createdAg.termsJson)
        : (createdAg.terms || createdAg.termsJson);
      setTerms(parsedTerms);
      setPlanRationale(res.rationale || res.data?.rationale || '');
      setSuggestedTechStack(res.suggestedTechStack || res.data?.suggestedTechStack || []);
      setIsBriefModalOpen(false);
      setHasUnsavedChanges(false);
      toast.success('Milestone plan autonomously generated!');
    } catch (err) {
      toast.error(err.message || 'Failed to generate plan from brief');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Title & Status Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-bold text-ink">
              Review AI Draft Terms
            </h1>
            <Badge status={bothApproved ? 'success' : 'pending'}>
              {bothApproved ? 'Mutually Approved' : 'Drafting Phase'}
            </Badge>
          </div>
          <p className="text-xs text-ink/60 mt-1">
            Carefully inspect scope, milestones, and penalty formulas before on-chain creation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={() => setIsBriefModalOpen(true)}
            icon={Sparkles}
          >
            New Plan from Brief
          </Button>

          <Button
            variant="secondary"
            onClick={() => handleRunAudit()}
            loading={isAuditing}
            icon={Shield}
          >
            Audit Agreement
          </Button>

          {auditResult && (
            <button
              type="button"
              onClick={() => setIsAuditModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-heading font-bold border transition-all ${
                auditResult.fairness_score >= 80
                  ? 'bg-sage text-forest border-forest/30 hover:bg-sage-light'
                  : auditResult.fairness_score >= 60
                  ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                  : 'bg-coral/20 text-coral border-coral hover:bg-coral/30'
              }`}
              title="Click to view Clarity Linter details"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Clarity: {auditResult.fairness_score}/100</span>
            </button>
          )}

          {bothApproved ? (
            <Button
              variant="primary"
              onClick={() => onProceedToWizard(agreement.id)}
              icon={ArrowRight}
            >
              Proceed to On-Chain Escrow
            </Button>
          ) : (
            <>
              {hasUnsavedChanges && (
                <Button
                  variant="secondary"
                  onClick={handleSaveTerms}
                  loading={isSaving}
                  icon={Save}
                >
                  Save Edits
                </Button>
              )}
              <Button
                variant={myApproval ? 'secondary' : 'primary'}
                onClick={handleApprove}
                loading={isApproving}
                disabled={myApproval && bothApproved}
                icon={CheckCircle2}
              >
                {myApproval ? (bothApproved ? 'Mutually Approved' : 'Approved (Waiting Counterparty)') : 'Approve Draft Terms'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Autonomous Planning Rationale Banner */}
      {planRationale && (
        <div className="p-4 rounded-card bg-sage/40 border border-forest/20 flex flex-col gap-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-forest font-heading font-semibold text-sm">
              <Sparkles className="w-4 h-4 text-forest" />
              <span>Autonomous AI Planning Rationale</span>
            </div>
            <span className="text-[11px] font-mono bg-forest/10 text-forest px-2 py-0.5 rounded-full font-bold">
              Feature 1 Active
            </span>
          </div>
          <p className="text-xs text-ink/80">{planRationale}</p>
          {suggestedTechStack && suggestedTechStack.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-mono text-ink/60 mr-1 flex items-center gap-1">
                <Cpu className="w-3 h-3" /> Recommended Stack:
              </span>
              {suggestedTechStack.map((tech, idx) => (
                <span key={idx} className="px-2 py-0.5 text-[10px] font-mono bg-white border border-gray rounded-full text-ink">
                  {tech}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Agreement Clarity & Pre-Lock Risk Auditor Summary Banner */}
      {auditResult && (
        <div className={`p-4 rounded-card border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in ${
          auditResult.fairness_score >= 80
            ? 'bg-sage-light/60 border-forest/20'
            : auditResult.fairness_score >= 60
            ? 'bg-amber-50 border-amber-200'
            : 'bg-coral/10 border-coral/30'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-heading font-bold text-sm ${
              auditResult.fairness_score >= 80
                ? 'bg-sage text-forest'
                : auditResult.fairness_score >= 60
                ? 'bg-amber-200 text-amber-900'
                : 'bg-coral/30 text-coral'
            }`}>
              {auditResult.fairness_score}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-sm text-ink">
                  Pre-Lock Clarity & Risk Score: {auditResult.fairness_score}/100
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                  auditResult.fairness_score >= 80
                    ? 'bg-forest/10 text-forest'
                    : auditResult.fairness_score >= 60
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-coral/20 text-coral'
                }`}>
                  {auditResult.fairness_score >= 80 ? 'Balanced Terms' : auditResult.fairness_score >= 60 ? 'Moderate Ambiguity' : 'Dispute Risk Detected'}
                </span>
              </div>
              <p className="text-xs text-ink/80 mt-0.5">{auditResult.summary}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsAuditModalOpen(true)}
              icon={ShieldCheck}
            >
              {auditResult.flags?.length > 0 ? `Inspect ${auditResult.flags.length} Flag(s) & 1-Click Fixes` : 'View Audit Details'}
            </Button>
          </div>
        </div>
      )}

      {/* Approval Status & Edit Reset Warning */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Client approval card */}
        <div className={`p-4 rounded-card border flex items-center justify-between ${
          agreement.clientApproved
            ? 'bg-sage-light/60 border-forest/30 text-forest'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div>
            <div className="text-xs font-heading font-semibold uppercase tracking-wider">Client Approval</div>
            <AddressChip address={terms.client} showExplorer={false} className="mt-1.5" />
          </div>
          {agreement.clientApproved ? (
            <span className="flex items-center gap-1 text-xs font-bold bg-sage px-2.5 py-1 rounded-full text-forest">
              <CheckCircle2 className="w-3.5 h-3.5" /> Approved
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium bg-amber-100 px-2.5 py-1 rounded-full text-amber-800">
              <Clock className="w-3.5 h-3.5" /> Pending
            </span>
          )}
        </div>

        {/* Freelancer approval card */}
        <div className={`p-4 rounded-card border flex items-center justify-between ${
          agreement.freelancerApproved
            ? 'bg-sage-light/60 border-forest/30 text-forest'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div>
            <div className="text-xs font-heading font-semibold uppercase tracking-wider">Freelancer Approval</div>
            <AddressChip address={terms.freelancer} showExplorer={false} className="mt-1.5" />
          </div>
          {agreement.freelancerApproved ? (
            <span className="flex items-center gap-1 text-xs font-bold bg-sage px-2.5 py-1 rounded-full text-forest">
              <CheckCircle2 className="w-3.5 h-3.5" /> Approved
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium bg-amber-100 px-2.5 py-1 rounded-full text-amber-800">
              <Clock className="w-3.5 h-3.5" /> Pending
            </span>
          )}
        </div>

        {/* Coral-tinted Edit Reset Notice */}
        <div className="p-4 rounded-card border border-coral/60 bg-coral/20 text-ink flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-coral shrink-0 mt-0.5" />
          <div className="text-xs">
            <strong className="font-heading font-bold text-ink">Edits reset approvals:</strong>
            <p className="text-ink/80 mt-0.5 leading-relaxed">
              Any modified term recalculates the Keccak-256 canonical hash and resets both parties' approvals to DRAFT.
            </p>
          </div>
        </div>
      </div>

      {/* Coral-tinted Callouts for AI Flags & Open Questions */}
      {(agreement.openQuestions?.length > 0 || agreement.warnings?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agreement.openQuestions?.length > 0 && (
            <div className="p-4 rounded-card bg-coral/15 border border-coral/40 space-y-2">
              <div className="flex items-center gap-2 text-ink text-xs font-heading font-bold uppercase tracking-wider">
                <HelpCircle className="w-4 h-4 text-coral" />
                AI Open Questions for Clarification
              </div>
              <ul className="text-xs text-ink/80 space-y-1 list-disc list-inside">
                {agreement.openQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          {agreement.warnings?.length > 0 && (
            <div className="p-4 rounded-card bg-coral/20 border border-coral/50 space-y-2">
              <div className="flex items-center gap-2 text-ink text-xs font-heading font-bold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-coral" />
                AI Risk Flags & Deadlines
              </div>
              <ul className="text-xs text-ink/80 space-y-1 list-disc list-inside">
                {agreement.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Core Terms Specification Form */}
      <Card className="space-y-6">
        <h3 className="font-heading font-bold text-base text-ink pb-3 border-b border-gray">
          Agreement Deliverables & Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1">
              Agreement Title
            </label>
            <input
              type="text"
              value={terms.title}
              onChange={(e) => {
                setTerms(prev => ({ ...prev, title: e.target.value }));
                setHasUnsavedChanges(true);
              }}
              className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2 text-xs text-ink focus:outline-none focus:border-forest"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1">
                Payment Mode
              </label>
              <div className="flex gap-2">
                {['MILESTONE', 'LUMP_SUM'].map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setTerms(prev => ({ ...prev, paymentMode: mode }));
                      setHasUnsavedChanges(true);
                    }}
                    className={`flex-1 py-2 px-3 text-xs font-heading font-semibold rounded-[8px] border transition-all ${
                      terms.paymentMode === mode
                        ? 'bg-forest text-ivory border-forest shadow-sm'
                        : 'bg-white border-gray text-ink/70 hover:bg-sage'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1">
                Escrow Currency
              </label>
              <div className="flex gap-2">
                {['ETH', 'USDC', 'USDT'].map(curr => (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => {
                      setTerms(prev => ({ ...prev, currency: curr }));
                      setHasUnsavedChanges(true);
                    }}
                    className={`flex-1 py-2 px-2 text-xs font-heading font-semibold rounded-[8px] border transition-all ${
                      (terms.currency || 'ETH') === curr
                        ? 'bg-forest text-ivory border-forest shadow-sm'
                        : 'bg-white border-gray text-ink/70 hover:bg-sage'
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1">
            Scope & Deliverables Description
          </label>
          <textarea
            rows={3}
            value={terms.description}
            onChange={(e) => {
              setTerms(prev => ({ ...prev, description: e.target.value }));
              setHasUnsavedChanges(true);
            }}
            className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2 text-xs text-ink focus:outline-none focus:border-forest"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1">
              GitHub Repository URL
            </label>
            <input
              type="text"
              value={terms.github?.repoUrl || ''}
              onChange={(e) => {
                setTerms(prev => ({
                  ...prev,
                  github: { ...prev.github, repoUrl: e.target.value }
                }));
                setHasUnsavedChanges(true);
              }}
              placeholder="https://github.com/org/repo"
              className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2 text-xs text-ink focus:outline-none focus:border-forest"
            />
          </div>

          <div>
            <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1">
              Target Branch
            </label>
            <input
              type="text"
              value={terms.github?.branch || 'main'}
              onChange={(e) => {
                setTerms(prev => ({
                  ...prev,
                  github: { ...prev.github, branch: e.target.value }
                }));
                setHasUnsavedChanges(true);
              }}
              className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2 text-xs text-ink focus:outline-none focus:border-forest"
            />
          </div>
        </div>

        {/* Late Penalty and Timers Parameter Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-card bg-sage/30 border border-gray">
          <div>
            <span className="text-[11px] font-heading font-semibold text-ink/60 block">Late Penalty (bps/day)</span>
            <input
              type="number"
              value={terms.latePenaltyBpsPerDay || 100}
              onChange={(e) => {
                setTerms(prev => ({ ...prev, latePenaltyBpsPerDay: Number(e.target.value) }));
                setHasUnsavedChanges(true);
              }}
              className="w-full bg-white border border-gray rounded-[6px] px-2 py-1 text-xs text-ink font-mono mt-1"
            />
          </div>

          <div>
            <span className="text-[11px] font-heading font-semibold text-ink/60 block">Max Late Penalty (bps)</span>
            <input
              type="number"
              value={terms.maxLatePenaltyBps || 3000}
              onChange={(e) => {
                setTerms(prev => ({ ...prev, maxLatePenaltyBps: Number(e.target.value) }));
                setHasUnsavedChanges(true);
              }}
              className="w-full bg-white border border-gray rounded-[6px] px-2 py-1 text-xs text-ink font-mono mt-1"
            />
          </div>

          <div>
            <span className="text-[11px] font-heading font-semibold text-ink/60 block">Review Window (Days)</span>
            <input
              type="number"
              value={terms.reviewWindowDays || 5}
              onChange={(e) => {
                setTerms(prev => ({ ...prev, reviewWindowDays: Number(e.target.value) }));
                setHasUnsavedChanges(true);
              }}
              className="w-full bg-white border border-gray rounded-[6px] px-2 py-1 text-xs text-ink font-mono mt-1"
            />
          </div>

          <div>
            <span className="text-[11px] font-heading font-semibold text-ink/60 block">Grace Window (Days)</span>
            <input
              type="number"
              value={terms.graceDays || 3}
              onChange={(e) => {
                setTerms(prev => ({ ...prev, graceDays: Number(e.target.value) }));
                setHasUnsavedChanges(true);
              }}
              className="w-full bg-white border border-gray rounded-[6px] px-2 py-1 text-xs text-ink font-mono mt-1"
            />
          </div>
        </div>
      </Card>

      {/* Milestones Table */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray">
          <div>
            <h3 className="font-heading font-bold text-base text-ink">Milestones & Payment Tranches</h3>
            <p className="text-xs text-ink/60 mt-0.5">Total agreement amount: {terms.totalAmount} {terms.currency || 'ETH'}</p>
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
              className="p-4 rounded-card border border-gray bg-white space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-heading font-bold text-sm text-forest">
                  Milestone #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveMilestone(idx)}
                  className="p-1 text-ink/40 hover:text-coral transition-colors"
                  title="Remove milestone"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-heading font-semibold text-ink/60 block mb-1">Title</label>
                  <input
                    type="text"
                    value={m.title}
                    onChange={(e) => handleMilestoneChange(idx, 'title', e.target.value)}
                    className="w-full bg-ivory border border-gray rounded-[8px] px-3 py-1.5 text-xs text-ink"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-heading font-semibold text-ink/60 block mb-1">Amount ({terms.currency || 'ETH'})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={m.amount}
                    onChange={(e) => handleMilestoneChange(idx, 'amount', e.target.value)}
                    className="w-full bg-ivory border border-gray rounded-[8px] px-3 py-1.5 text-xs text-ink font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-heading font-semibold text-ink/60 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={m.description}
                  onChange={(e) => handleMilestoneChange(idx, 'description', e.target.value)}
                  className="w-full bg-ivory border border-gray rounded-[8px] px-3 py-1.5 text-xs text-ink"
                />
              </div>

              {/* Acceptance Criteria (Verified via Git / CI) */}
              <div className="space-y-2 pt-2 border-t border-gray/50">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-heading font-semibold text-ink/70 uppercase tracking-wider block">
                    Acceptance Criteria (Verified via Git / CI)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAddCriterion(idx)}
                    className="text-[11px] font-medium text-forest hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Criterion
                  </button>
                </div>

                <div className="space-y-2">
                  {(m.acceptanceCriteria || m.deliverables || []).map((crit, cIdx) => {
                    const flagForThis = auditResult?.flags?.find(
                      f => f.clause === `milestones[${idx}].acceptanceCriteria[${cIdx}]`
                    );
                    return (
                      <div key={cIdx} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-ink/40 w-4 text-right">{cIdx + 1}.</span>
                          <input
                            type="text"
                            value={crit}
                            onChange={(e) => handleCriterionChange(idx, cIdx, e.target.value)}
                            className={`flex-1 bg-ivory border rounded-[8px] px-3 py-1.5 text-xs text-ink transition-colors ${
                              flagForThis ? 'border-amber-400 bg-amber-50/40' : 'border-gray'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveCriterion(idx, cIdx)}
                            className="p-1 text-ink/40 hover:text-coral transition-colors"
                            title="Remove criterion"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {flagForThis && (
                          <div className="ml-6 p-2 rounded-card bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{flagForThis.issue}</span>
                            </div>
                            {flagForThis.suggested_rewrite && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleApplyRewrite(flagForThis)}
                                icon={Sparkles}
                                className="text-[11px] py-1 px-2.5 h-auto text-forest hover:bg-forest hover:text-ivory font-semibold"
                              >
                                1-Click Fix
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Sticky Bottom Action Bar */}
      <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md border-2 border-ink rounded-card-lg shadow-brutal p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="font-heading font-bold text-sm text-ink block">
            {bothApproved ? '✓ Ready for Blockchain Escrow Deployment' : 'Smart Agreement Terms Review'}
          </span>
          <span className="text-xs text-ink/60">
            {bothApproved
              ? 'Both counter-parties have confirmed the terms. Proceed to deposit funds into the contract.'
              : `${agreement.clientApproved ? '✓ Client approved' : 'Awaiting client approval'} · ${agreement.freelancerApproved ? '✓ Freelancer approved' : 'Awaiting freelancer approval'}`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {hasUnsavedChanges && (
            <Button
              variant="secondary"
              onClick={handleSaveTerms}
              loading={isSaving}
              icon={Save}
            >
              Save Edits
            </Button>
          )}

          {bothApproved ? (
            <Button
              variant="primary"
              onClick={() => onProceedToWizard(agreement.id)}
              icon={ArrowRight}
            >
              Proceed to On-Chain Escrow
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleApprove}
              loading={isApproving}
              disabled={myApproval && bothApproved}
              icon={CheckCircle2}
            >
              {myApproval ? (bothApproved ? 'Mutually Approved' : 'Approved (Waiting Partner)') : 'Approve & Submit Terms'}
            </Button>
          )}
        </div>
      </div>

      {/* Autonomous Brief-to-Plan Generator Modal */}
      <Modal
        isOpen={isBriefModalOpen}
        onClose={() => setIsBriefModalOpen(false)}
        title="Autonomous Brief-to-Plan Generator"
        subtitle="Provide a high-level goal and let AI decompose it into verifiable milestones."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleGenerateFromBrief} className="space-y-4">
          <Textarea
            label="Project Goal / Brief"
            placeholder="e.g. Build an on-chain NFT ticketing dApp with QR verification, organizer dashboard, and Polygon smart contract escrow..."
            value={briefText}
            onChange={(e) => setBriefText(e.target.value)}
            rows={4}
            required
            helperText="Describe what you want built. The AI will calculate milestones with testable criteria."
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Total Budget"
              type="number"
              step="0.01"
              value={briefBudget}
              onChange={(e) => setBriefBudget(e.target.value)}
              placeholder="1.5"
              required
            />
            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5 font-heading">
                Currency
              </label>
              <select
                value={briefCurrency}
                onChange={(e) => setBriefCurrency(e.target.value)}
                className="w-full bg-white text-ink border border-gray rounded-[10px] px-3.5 py-2.5 text-sm focus:outline-none focus:border-forest"
              >
                <option value="ETH">ETH</option>
                <option value="MATIC">MATIC (Polygon)</option>
                <option value="USDC">USDC</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-sage/30 rounded-card border border-forest/10 text-xs text-ink/70 space-y-1">
            <p className="font-semibold text-forest">💡 Pro Tip:</p>
            <p>The AI will calculate milestone amounts, establish sequential delivery dates, and formulate concrete GitHub verification criteria.</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsBriefModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isGeneratingPlan}
              icon={Sparkles}
            >
              Generate Autonomous Plan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Agreement Clarity Linter & Pre-Lock Risk Auditor Modal */}
      <Modal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        title="Agreement Clarity Linter & Risk Auditor"
        subtitle="Pre-lock automated analysis ensuring objective criteria, balanced penalties, and dispute prevention."
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">
          {auditResult ? (
            <>
              {/* Score Header Card */}
              <div className={`p-5 rounded-card border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                auditResult.fairness_score >= 80
                  ? 'bg-sage-light/70 border-forest/30'
                  : auditResult.fairness_score >= 60
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-coral/10 border-coral/40'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center font-heading font-black text-xl border-2 ${
                    auditResult.fairness_score >= 80
                      ? 'bg-sage text-forest border-forest/30'
                      : auditResult.fairness_score >= 60
                      ? 'bg-amber-200 text-amber-900 border-amber-400'
                      : 'bg-coral/30 text-coral border-coral'
                  }`}>
                    {auditResult.fairness_score}
                    <span className="text-[9px] font-normal opacity-70">/100</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-base text-ink">
                        {auditResult.fairness_score >= 80
                          ? 'High Clarity & Fairness'
                          : auditResult.fairness_score >= 60
                          ? 'Moderate Ambiguity & Risk'
                          : 'High Dispute Risk Detected'}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                        auditResult.fairness_score >= 80
                          ? 'bg-forest/10 text-forest'
                          : auditResult.fairness_score >= 60
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-coral/20 text-coral'
                      }`}>
                        {auditResult.flags?.length || 0} Flag(s)
                      </span>
                    </div>
                    <p className="text-xs text-ink/80 mt-1 leading-relaxed">
                      {auditResult.summary}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleRunAudit()}
                  loading={isAuditing}
                  icon={RefreshCw}
                  className="shrink-0"
                >
                  Re-evaluate
                </Button>
              </div>

              {/* Flags List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-heading font-semibold uppercase tracking-wider text-ink/70">
                    Audit Recommendations & Auto-Rewrites
                  </h4>
                  <span className="text-[11px] font-mono text-ink/50">
                    {auditResult.flags?.length || 0} items identified
                  </span>
                </div>

                {!auditResult.flags || auditResult.flags.length === 0 ? (
                  <div className="p-6 text-center rounded-card bg-sage/30 border border-forest/20 space-y-2">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-forest" />
                    <p className="font-heading font-bold text-sm text-forest">
                      Exemplary Agreement Terms!
                    </p>
                    <p className="text-xs text-ink/70 max-w-sm mx-auto">
                      All criteria are measurable against git commits, payment amounts are balanced, and late penalty terms comply with platform escrow guidelines.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {auditResult.flags.map((flag, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-card border transition-all ${
                          flag.severity === 'CRITICAL'
                            ? 'bg-coral/10 border-coral/30'
                            : flag.severity === 'WARNING'
                            ? 'bg-amber-50/70 border-amber-200'
                            : 'bg-sage/20 border-forest/15'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                              flag.severity === 'CRITICAL'
                                ? 'bg-coral/20 text-coral'
                                : flag.severity === 'WARNING'
                                ? 'bg-amber-200 text-amber-900'
                                : 'bg-forest/10 text-forest'
                            }`}>
                              {flag.severity || 'WARNING'}
                            </span>
                            <span className="font-mono text-xs text-ink/60 font-semibold">
                              {flag.clause}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-ink font-medium mt-1.5">{flag.issue}</p>
                        <p className="text-xs text-ink/70 mt-0.5">{flag.suggestion}</p>

                        {/* 1-Click Drop-in Suggested Rewrite Box */}
                        {flag.suggested_rewrite && (
                          <div className="mt-2.5 p-2.5 rounded-[8px] bg-white border border-gray flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-0.5 text-xs">
                              <span className="text-[10px] font-mono text-forest uppercase font-bold flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-forest" /> 1-Click Measurable Replacement:
                              </span>
                              <p className="font-mono text-xs text-ink bg-sage/20 px-2 py-1 rounded border border-forest/15 select-all">
                                {flag.suggested_rewrite}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleApplyRewrite(flag)}
                              icon={Sparkles}
                              className="shrink-0 text-xs py-1.5 px-3"
                            >
                              Apply Rewrite
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-sage flex items-center justify-center text-forest">
                <Shield className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-heading font-bold text-base text-ink">Ready to Audit</h4>
                <p className="text-xs text-ink/60 max-w-sm mx-auto">
                  Click below to scan for ambiguous criteria, disproportionate penalties, and front-loaded payment structures.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => handleRunAudit()}
                loading={isAuditing}
                icon={ShieldCheck}
              >
                Scan Agreement Draft
              </Button>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray">
            <Button
              variant="secondary"
              onClick={() => setIsAuditModalOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
