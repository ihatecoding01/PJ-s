import React, { useState, useEffect } from 'react';
import { getAgreements } from '../api/agreements.js';
import { useWallet } from '../context/WalletContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Card from '../components/common/Card.jsx';
import Badge from '../components/common/Badge.jsx';
import Button from '../components/common/Button.jsx';
import AddressBadge from '../components/common/AddressBadge.jsx';
import { formatMatic, formatDate } from '../lib/formatters.js';
import {
  FileCheck,
  ArrowRight,
  Filter,
  Coins,
  Clock,
  AlertCircle,
  Plus
} from 'lucide-react';

export default function MyAgreementsPage({ onOpenAgreement, onOpenDraft, onNavigateToCommunity }) {
  const { address } = useWallet();
  const toast = useToast();

  const [agreements, setAgreements] = useState([]);
  const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL' | 'CLIENT' | 'FREELANCER'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchAgreementsList = async () => {
    try {
      setIsLoading(true);
      const data = await getAgreements();
      setAgreements(data || []);
    } catch (err) {
      toast.error('Could not load agreements list');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgreementsList();
  }, []);

  // Filter agreements
  const filtered = agreements.filter(ag => {
    const isClient = address && ag.terms?.client && address.toLowerCase() === ag.terms.client.toLowerCase();
    const isFreelancer = address && ag.terms?.freelancer && address.toLowerCase() === ag.terms.freelancer.toLowerCase();

    if (roleFilter === 'CLIENT' && !isClient) return false;
    if (roleFilter === 'FREELANCER' && !isFreelancer) return false;
    if (statusFilter !== 'ALL' && ag.status !== statusFilter) return false;

    return true;
  });

  // Determine next required action callout
  const getNextAction = (ag) => {
    const isClient = address && ag.terms?.client && address.toLowerCase() === ag.terms.client.toLowerCase();
    const isFreelancer = address && ag.terms?.freelancer && address.toLowerCase() === ag.terms.freelancer.toLowerCase();

    if (ag.status === 'Draft') {
      if (isClient && !ag.clientApproved) return 'Waiting for you to approve draft terms';
      if (isFreelancer && !ag.freelancerApproved) return 'Waiting for you to approve draft terms';
      return 'Waiting for counterparty draft approval';
    }
    if (ag.status === 'AwaitingFunding') {
      if (isClient) return 'Waiting for you to create on-chain & fund escrow';
      return 'Waiting for client to fund escrow on-chain';
    }
    if (ag.status === 'Active') {
      const submittedM = ag.milestones.find(m => m.status === 'Submitted');
      if (submittedM && isClient) return `Milestone #${submittedM.idx + 1} submitted: Review required`;
      const pendingM = ag.milestones.find(m => m.status === 'Pending');
      if (pendingM && isFreelancer) return `Deliverable in progress: Milestone #${pendingM.idx + 1}`;
      return 'Milestone escrow active and monitored';
    }
    if (ag.status === 'Disputed') {
      return 'Action required: Arbitration tribunal voting active';
    }
    if (ag.status === 'Completed') {
      return 'Agreement completed! All milestones released.';
    }
    return 'No immediate action required';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            My Agreements
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track escrow states, pending signatures, milestone reviews, and automated claims.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={onNavigateToCommunity}
          icon={Plus}
        >
          Explore New Jobs
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-900/60 p-3 rounded-2xl border border-slate-800 flex-wrap">
        {/* Role Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Roles' },
            { id: 'CLIENT', label: '💼 As Client' },
            { id: 'FREELANCER', label: '🛠 As Freelancer' }
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setRoleFilter(r.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                roleFilter === r.id
                  ? 'bg-teal-500/15 border border-teal-500/40 text-teal-300'
                  : 'bg-surface-800 text-slate-400 border border-transparent hover:text-slate-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Statuses' },
            { id: 'Draft', label: 'Draft' },
            { id: 'Active', label: 'Active' },
            { id: 'Completed', label: 'Completed' },
            { id: 'Disputed', label: 'Disputed' }
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === s.id
                  ? 'bg-surface-800 border border-slate-650 text-slate-100 font-semibold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Agreements Cards List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(n => (
            <div key={n} className="h-44 rounded-2xl bg-surface-900/40 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-surface-900/30 rounded-2xl border border-slate-800/80 space-y-3">
          <FileCheck className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-slate-400 text-sm">No agreements found matching your selected filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(ag => {
            const isClient = address && ag.terms?.client && address.toLowerCase() === ag.terms.client.toLowerCase();
            const isFreelancer = address && ag.terms?.freelancer && address.toLowerCase() === ag.terms.freelancer.toLowerCase();
            const myRole = isClient ? 'CLIENT' : isFreelancer ? 'FREELANCER' : 'VIEWER';
            const actionText = getNextAction(ag);

            return (
              <Card key={ag.id} hoverEffect className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono text-teal-400 font-bold">
                        #{ag.id}
                      </span>
                      {ag.onchainId && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/25 text-teal-300">
                          On-Chain #{ag.onchainId}
                        </span>
                      )}
                      <Badge label={ag.status} variant={ag.status} size="sm" />
                      <Badge label={`Your Role: ${myRole}`} variant={myRole} size="sm" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-100">
                      {ag.terms?.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-sm font-mono font-bold text-teal-300 bg-surface-850 px-3 py-1.5 rounded-xl border border-slate-800">
                      {ag.terms?.totalAmount} MATIC
                    </span>
                  </div>
                </div>

                {/* Parties */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 bg-surface-850/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 font-medium">Client:</span>
                    <AddressBadge address={ag.terms?.client} chars={4} showExplorer={false} />
                  </div>
                  <div className="flex items-center gap-2 bg-surface-850/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 font-medium">Freelancer:</span>
                    <AddressBadge address={ag.terms?.freelancer} chars={4} showExplorer={false} />
                  </div>
                </div>

                {/* Next Action Banner */}
                <div className="p-3 rounded-xl bg-surface-850/90 border border-slate-750 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="w-4 h-4 text-teal-400 shrink-0" />
                    <span className="text-slate-300">
                      Next Step: <strong className="text-teal-300">{actionText}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {ag.status === 'Draft' ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onOpenDraft(ag.id)}
                        icon={ArrowRight}
                      >
                        Review Draft Terms
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onOpenAgreement(ag.id)}
                        icon={ArrowRight}
                      >
                        Open Dashboard
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
