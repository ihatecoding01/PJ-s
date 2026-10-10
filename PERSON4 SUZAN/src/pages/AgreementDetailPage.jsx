import React, { useState, useEffect } from 'react';
import {
  getAgreement,
  getTimeline,
  getPayments,
  getAlerts
} from '../api/agreements.js';
import { getDispute } from '../api/disputes.js';
import { useWallet } from '../context/WalletContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import AddressBadge from '../components/common/AddressBadge.jsx';
import Badge from '../components/common/Badge.jsx';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import RoleBanner from '../components/common/RoleBanner.jsx';
import ChainWizard from '../components/wizard/ChainWizard.jsx';
import MilestoneCard from '../components/dashboard/MilestoneCard.jsx';
import AmendmentsList from '../components/amendments/AmendmentsList.jsx';
import ProposeAmendmentModal from '../components/amendments/ProposeAmendmentModal.jsx';
import RaiseDisputeModal from '../components/disputes/RaiseDisputeModal.jsx';
import EvidenceThread from '../components/disputes/EvidenceThread.jsx';
import AiDisputeSummary from '../components/disputes/AiDisputeSummary.jsx';
import ArbitratorVoteCard from '../components/disputes/ArbitratorVoteCard.jsx';
import PaymentSummaryCards from '../components/payments/PaymentSummaryCards.jsx';
import MilestonePaymentTable from '../components/payments/MilestonePaymentTable.jsx';
import TimelineView from '../components/timeline/TimelineView.jsx';
import { formatMatic } from '../lib/formatters.js';
import {
  Layers,
  Coins,
  Shield,
  FileCheck2,
  Calendar,
  AlertTriangle,
  Scale,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

export default function AgreementDetailPage({ agreementId, onBack }) {
  const { address } = useWallet();
  const toast = useToast();

  const [agreement, setAgreement] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [payments, setPayments] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [disputeData, setDisputeData] = useState(null);
  const [activeDisputeIdx, setActiveDisputeIdx] = useState(null);

  const [isProposeAmendmentOpen, setIsProposeAmendmentOpen] = useState(false);
  const [isRaiseDisputeOpen, setIsRaiseDisputeOpen] = useState(false);
  const [disputeMilestoneIdx, setDisputeMilestoneIdx] = useState(0);

  const [activeTab, setActiveTab] = useState('milestones'); // 'milestones' | 'payments' | 'disputes' | 'amendments' | 'timeline'
  const [isLoading, setIsLoading] = useState(true);

  const loadAllAgreementData = async () => {
    try {
      setIsLoading(true);
      const [agData, tlData, payData, alData] = await Promise.all([
        getAgreement(agreementId),
        getTimeline(agreementId).catch(() => []),
        getPayments(agreementId).catch(() => null),
        getAlerts(agreementId).catch(() => [])
      ]);

      setAgreement(agData);
      setTimeline(tlData || []);
      setPayments(payData || null);
      setAlerts(alData || []);

      // Check if any milestone is in dispute
      const disputedM = agData.milestones.find(m => m.status === 'Disputed');
      if (disputedM) {
        setActiveDisputeIdx(disputedM.idx);
        const dData = await getDispute(agreementId, disputedM.idx).catch(() => null);
        setDisputeData(dData);
      }
    } catch (err) {
      toast.error('Failed to load agreement details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (agreementId) loadAllAgreementData();
  }, [agreementId]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">
        Loading agreement dashboard...
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">
        Agreement not found.
      </div>
    );
  }

  const terms = agreement.terms;
  const isClient = address && terms?.client && address.toLowerCase() === terms.client.toLowerCase();
  const isFreelancer = address && terms?.freelancer && address.toLowerCase() === terms.freelancer.toLowerCase();
  
  let userRole = 'VIEWER';
  if (isClient) userRole = 'CLIENT';
  else if (isFreelancer) userRole = 'FREELANCER';

  // Determine role-based action prompt
  let actionPrompt = '';
  if (agreement.status === 'Draft') {
    if (isClient && !agreement.clientApproved) actionPrompt = 'Action required: Review & approve draft terms';
    else if (isFreelancer && !agreement.freelancerApproved) actionPrompt = 'Action required: Review & approve draft terms';
  } else if (agreement.status === 'AwaitingFunding') {
    if (isClient) actionPrompt = 'Action required: Create agreement on-chain and lock escrow funds';
    else if (isFreelancer && !agreement.onchainId) actionPrompt = 'Waiting for client to create agreement on-chain';
  } else if (agreement.status === 'Active') {
    const subM = agreement.milestones.find(m => m.status === 'Submitted');
    if (subM && isClient) actionPrompt = `Review deliverable for Milestone #${subM.idx + 1}`;
    const pendM = agreement.milestones.find(m => m.status === 'Pending');
    if (pendM && isFreelancer) actionPrompt = `Work in progress: Milestone #${pendM.idx + 1}`;
  }

  // Calculate overall progress (% of milestones paid)
  const paidCount = agreement.milestones.filter(m => m.status === 'Paid').length;
  const totalCount = agreement.milestones.length || 1;
  const progressPercent = Math.round((paidCount / totalCount) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header Card */}
      <Card className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-mono text-teal-400 font-bold uppercase tracking-wider">
                Agreement #{agreement.id}
              </span>
              {agreement.onchainId && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-teal-500/15 border border-teal-500/30 text-teal-300 font-semibold">
                  On-Chain ID: #{agreement.onchainId}
                </span>
              )}
              <Badge label={agreement.status} variant={agreement.status} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">{terms.title}</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">{terms.description}</p>
          </div>

          <div className="flex items-center gap-4 self-start md:self-auto bg-surface-850 p-4 rounded-xl border border-slate-800">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-sans block uppercase tracking-wider">Total Escrow Budget</span>
              <span className="text-xl font-bold font-mono text-teal-300">
                {terms.totalAmount} MATIC
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadAllAgreementData}
              title="Refresh Agreement State"
              className="p-2"
            >
              <RefreshCw className="w-4 h-4 text-slate-400" />
            </Button>
          </div>
        </div>

        {/* Role Banner & Next Action */}
        <RoleBanner role={userRole} actionPrompt={actionPrompt} />

        {/* Parties Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-xl bg-surface-850/80 border border-purple-500/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-purple-300 block tracking-wider">Client (Fund Escrow)</span>
              <AddressBadge address={terms.client} chars={4} className="mt-1" />
            </div>
            {isClient && <span className="text-xs text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded">You</span>}
          </div>

          <div className="p-3.5 rounded-xl bg-surface-850/80 border border-teal-500/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-teal-300 block tracking-wider">Freelancer (Deliverable)</span>
              <AddressBadge address={terms.freelancer} chars={4} className="mt-1" />
            </div>
            {isFreelancer && <span className="text-xs text-teal-400 font-bold bg-teal-500/10 px-2 py-0.5 rounded">You</span>}
          </div>
        </div>

        {/* Overall Milestone Completion Progress Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300">
              Escrow Release Progress: <strong>{paidCount} of {totalCount} Milestones Paid</strong>
            </span>
            <span className="text-teal-300 font-bold">{progressPercent}% Completed</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-surface-800 overflow-hidden border border-slate-700/80">
            <div
              className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Active Alerts Banner from GET /alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2 pt-2">
            {alerts.map((al, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{al.message}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Chain Steps Wizard (if Draft or AwaitingFunding) */}
      {(agreement.status === 'Draft' || agreement.status === 'AwaitingFunding' || !agreement.onchainId) && (
        <ChainWizard
          agreement={agreement}
          onAgreementUpdated={(updated) => setAgreement(updated)}
        />
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'milestones', label: `Milestones (${agreement.milestones.length})` },
          { id: 'payments', label: 'Payment Breakdown' },
          { id: 'disputes', label: 'Disputes & Arbitration' },
          { id: 'amendments', label: 'Amendments' },
          { id: 'timeline', label: `Timeline & Audit (${timeline.length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-teal-500/15 border border-teal-500/40 text-teal-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-850'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Milestones */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          {agreement.milestones.map((m) => (
            <MilestoneCard
              key={m.idx}
              milestone={m}
              termsMilestone={terms.milestones[m.idx]}
              agreement={agreement}
              onMilestoneUpdated={loadAllAgreementData}
              onOpenDispute={(idx) => {
                setDisputeMilestoneIdx(idx);
                setIsRaiseDisputeOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Tab 2: Payments */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <PaymentSummaryCards payments={payments} />
          <MilestonePaymentTable milestones={agreement.milestones} />
        </div>
      )}

      {/* Tab 3: Disputes */}
      {activeTab === 'disputes' && (
        <div className="space-y-6">
          {activeDisputeIdx !== null && disputeData ? (
            <>
              <ArbitratorVoteCard
                dispute={disputeData}
                onchainId={agreement.onchainId}
                milestoneIdx={activeDisputeIdx}
                onDisputeUpdated={loadAllAgreementData}
              />
              <AiDisputeSummary
                agreementId={agreement.id}
                milestoneIdx={activeDisputeIdx}
                initialSummary={disputeData.aiSummary}
              />
              <Card>
                <EvidenceThread
                  agreementId={agreement.id}
                  onchainId={agreement.onchainId}
                  milestoneIdx={activeDisputeIdx}
                  evidenceList={disputeData.evidence || []}
                  onEvidenceSubmitted={loadAllAgreementData}
                />
              </Card>
            </>
          ) : (
            <Card className="text-center py-12 space-y-3">
              <Scale className="w-8 h-8 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-200">No Active Disputes</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                All milestones are progressing smoothly. If an irreconcilable conflict occurs regarding deliverables, either party can raise a dispute from the milestone card.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Tab 4: Amendments */}
      {activeTab === 'amendments' && (
        <AmendmentsList
          agreement={agreement}
          amendments={agreement.amendments || []}
          onProposeClick={() => setIsProposeAmendmentOpen(true)}
          onAmendmentUpdated={loadAllAgreementData}
        />
      )}

      {/* Tab 5: Timeline */}
      {activeTab === 'timeline' && (
        <TimelineView timeline={timeline} />
      )}

      {/* Propose Amendment Modal */}
      <ProposeAmendmentModal
        isOpen={isProposeAmendmentOpen}
        onClose={() => setIsProposeAmendmentOpen(false)}
        agreement={agreement}
        onSuccess={loadAllAgreementData}
      />

      {/* Raise Dispute Modal */}
      <RaiseDisputeModal
        isOpen={isRaiseDisputeOpen}
        onClose={() => setIsRaiseDisputeOpen(false)}
        agreementId={agreement.id}
        onchainId={agreement.onchainId}
        milestoneIdx={disputeMilestoneIdx}
        onSuccess={loadAllAgreementData}
      />
    </div>
  );
}
